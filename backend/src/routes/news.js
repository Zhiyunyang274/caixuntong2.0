const express = require('express');
const router = express.Router();
const { getDB } = require('../db');

// 分类列表 - 国内
const DOMESTIC_CATEGORIES = [
  { key: 'stock', label: '股市' },
  { key: 'macro', label: '宏观' },
  { key: 'company', label: '公司' },
  { key: 'forex', label: '外汇' },
  { key: 'crypto', label: '数字货币' },
  { key: 'fund', label: '基金' },
];

// 分类列表 - 国外
const INTERNATIONAL_CATEGORIES = [
  { key: 'business', label: 'Business' },
  { key: 'technology', label: 'Technology' },
  { key: 'science', label: 'Science' },
  { key: 'general', label: 'General' },
];

// GET /api/news/categories
router.get('/categories', (req, res) => {
  res.json({
    domestic: DOMESTIC_CATEGORIES,
    international: INTERNATIONAL_CATEGORIES
  });
});

// GET /api/news/date-range - 获取资讯日期范围
router.get('/date-range', (req, res) => {
  try {
    const db = getDB();
    const { region = '' } = req.query;

    let where = '1=1';
    const params = [];

    if (region) {
      where += ' AND source_region = ?';
      params.push(region);
    }

    // 统计每个日期的文章数量
    const dateStats = db.prepare(`
      SELECT
        DATE(published_at) as date,
        COUNT(*) as count
      FROM articles
      WHERE ${where} AND published_at IS NOT NULL
      GROUP BY DATE(published_at)
      ORDER BY date DESC
      LIMIT 30
    `).all(...params);

    // 找到有数据的日期范围（至少有5条新闻的日期）
    const validDates = dateStats.filter(d => d.count >= 5);

    const formatDate = (dateStr) => {
      if (!dateStr) return '';
      const date = new Date(dateStr);
      return date.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
    };

    const result = {
      earliest: validDates.length > 0 ? formatDate(validDates[validDates.length - 1].date) : '',
      latest: validDates.length > 0 ? formatDate(validDates[0].date) : '',
      total: db.prepare(`SELECT COUNT(*) as cnt FROM articles WHERE ${where}`).get(...params).cnt,
      dateStats: dateStats.slice(0, 7).map(d => ({
        date: formatDate(d.date),
        count: d.count
      }))
    };

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// GET /api/news?region=domestic&category=stock&sort=latest&page=1&pageSize=20&q=关键词
router.get('/', (req, res) => {
  try {
    const db = getDB();
    const {
      region = 'domestic',
      category = '',
      sort = 'latest',
      page = 1,
      pageSize = 20,
      q = ''
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(pageSize);

    let where = '1=1';
    const params = [];

    // 地区筛选
    where += ' AND source_region = ?';
    params.push(region);

    // 分类筛选
    if (category) {
      where += ' AND category = ?';
      params.push(category);
    }

    // 关键词搜索
    if (q) {
      where += ' AND (title LIKE ? OR description LIKE ? OR source_name LIKE ?)';
      params.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }

    const orderBy = sort === 'hot' ? 'RANDOM()' : 'published_at DESC';

    const total = db.prepare(`SELECT COUNT(*) as cnt FROM articles WHERE ${where}`).get(...params).cnt;
    const articles = db.prepare(
      `SELECT * FROM articles WHERE ${where} ORDER BY ${orderBy} LIMIT ? OFFSET ?`
    ).all(...params, parseInt(pageSize), offset);

    res.json({
      total,
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      articles,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// GET /api/news/:id
router.get('/:id', (req, res) => {
  try {
    const db = getDB();
    const article = db.prepare('SELECT * FROM articles WHERE id = ?').get(req.params.id);
    if (!article) return res.status(404).json({ error: '文章不存在' });
    res.json(article);
  } catch (err) {
    res.status(500).json({ error: '服务器错误' });
  }
});

// GET /api/news/:id/detail - 获取新闻详情（包含相关新闻）
router.get('/:id/detail', (req, res) => {
  try {
    const db = getDB();
    const article = db.prepare('SELECT * FROM articles WHERE id = ?').get(req.params.id);
    if (!article) return res.status(404).json({ error: '文章不存在' });

    // 查找相关新闻：同分类或同来源
    let relatedNews = [];
    if (article.category) {
      relatedNews = db.prepare(`
        SELECT id, title, source_name, published_at, image_url
        FROM articles
        WHERE category = ? AND id != ? AND source_region = ?
        ORDER BY published_at DESC
        LIMIT 6
      `).all(article.category, article.id, article.source_region);
    }

    // 如果同分类不足，补充同来源的新闻
    if (relatedNews.length < 6 && article.source_name) {
      const excludeIds = relatedNews.map(n => n.id).concat([article.id]);
      const additionalNews = db.prepare(`
        SELECT id, title, source_name, published_at, image_url
        FROM articles
        WHERE source_name = ? AND id NOT IN (${excludeIds.map(() => '?').join(',')})
        ORDER BY published_at DESC
        LIMIT ?
      `).all(article.source_name, ...excludeIds, 6 - relatedNews.length);
      relatedNews = [...relatedNews, ...additionalNews];
    }

    res.json({ article, relatedNews });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// GET /api/news/trending - 热门新闻榜单
router.get('/trending/list', (req, res) => {
  try {
    const db = getDB();
    const { region = 'domestic', limit = 10 } = req.query;

    // 过滤掉东方财富（链接会重定向失效）
    const trending = db.prepare(`
      SELECT id, title, source_name, published_at, category, url
      FROM articles
      WHERE source_region = ? AND source_name NOT LIKE '%东方财富%'
      ORDER BY RANDOM()
      LIMIT ?
    `).all(region, parseInt(limit));

    res.json(trending);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// GET /api/news/search - 高级搜索（支持时间范围、来源筛选）
router.get('/search/advanced', (req, res) => {
  try {
    const db = getDB();
    const {
      q = '',
      startDate = '',
      endDate = '',
      source = '',
      category = '',
      region = '',
      page = 1,
      pageSize = 20
    } = req.query;

    let where = '1=1';
    const params = [];

    // 关键词搜索
    if (q) {
      where += ' AND (title LIKE ? OR description LIKE ?)';
      params.push(`%${q}%`, `%${q}%`);
    }

    // 时间范围
    if (startDate) {
      where += ' AND published_at >= ?';
      params.push(startDate);
    }
    if (endDate) {
      where += ' AND published_at <= ?';
      params.push(endDate + ' 23:59:59');
    }

    // 来源筛选
    if (source) {
      where += ' AND source_name = ?';
      params.push(source);
    }

    // 分类筛选
    if (category) {
      where += ' AND category = ?';
      params.push(category);
    }

    // 地区筛选
    if (region) {
      where += ' AND source_region = ?';
      params.push(region);
    }

    const offset = (parseInt(page) - 1) * parseInt(pageSize);

    const total = db.prepare(`SELECT COUNT(*) as cnt FROM articles WHERE ${where}`).get(...params).cnt;
    const articles = db.prepare(
      `SELECT * FROM articles WHERE ${where} ORDER BY published_at DESC LIMIT ? OFFSET ?`
    ).all(...params, parseInt(pageSize), offset);

    res.json({
      total,
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      articles,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '服务器错误' });
  }
});

module.exports = router;
