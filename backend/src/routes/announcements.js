const express = require('express');
const router = express.Router();
const { getDB } = require('../db');
const { getAnnouncementTypes } = require('../services/announcements');

// GET /api/announcements/types - 获取公告类型
router.get('/types', (req, res) => {
  res.json(getAnnouncementTypes());
});

// GET /api/announcements/stats - 获取今日统计
router.get('/stats', (req, res) => {
  try {
    const db = getDB();
    const today = new Date().toISOString().split('T')[0];

    const stats = db.prepare(`
      SELECT
        category,
        level,
        COUNT(*) as count
      FROM announcements
      WHERE date(publish_time) = ? OR date(created_at) = ?
      GROUP BY category, level
    `).all(today, today);

    const total = db.prepare(`
      SELECT COUNT(*) as count FROM announcements
      WHERE date(publish_time) = ? OR date(created_at) = ?
    `).get(today, today);

    res.json({
      total: total.count,
      byCategory: stats
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// GET /api/announcements - 获取公告列表
router.get('/', (req, res) => {
  try {
    const db = getDB();
    const {
      category = '',
      level = '',
      stock = '',
      date = '',
      page = 1,
      pageSize = 30
    } = req.query;

    let where = '1=1';
    const params = [];

    if (category) {
      where += ' AND category = ?';
      params.push(category);
    }

    if (level) {
      where += ' AND level = ?';
      params.push(level);
    }

    if (stock) {
      where += ' AND (stock_code LIKE ? OR stock_name LIKE ?)';
      params.push(`%${stock}%`, `%${stock}%`);
    }

    if (date) {
      where += ' AND date(publish_time) = ?';
      params.push(date);
    }

    const offset = (parseInt(page) - 1) * parseInt(pageSize);

    const total = db.prepare(`SELECT COUNT(*) as cnt FROM announcements WHERE ${where}`).get(...params).cnt;

    const announcements = db.prepare(`
      SELECT * FROM announcements
      WHERE ${where}
      ORDER BY
        CASE level
          WHEN 'high' THEN 1
          WHEN 'medium' THEN 2
          WHEN 'low' THEN 3
          ELSE 4
        END,
        publish_time DESC
      LIMIT ? OFFSET ?
    `).all(...params, parseInt(pageSize), offset);

    res.json({
      total,
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      announcements
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// GET /api/announcements/:id - 获取公告详情
router.get('/:id', (req, res) => {
  try {
    const db = getDB();
    const announcement = db.prepare('SELECT * FROM announcements WHERE id = ?').get(req.params.id);

    if (!announcement) {
      return res.status(404).json({ error: '公告不存在' });
    }

    // 查找同公司其他公告
    const relatedAnnouncements = db.prepare(`
      SELECT id, title, category, level, publish_time
      FROM announcements
      WHERE stock_code = ? AND id != ?
      ORDER BY publish_time DESC
      LIMIT 5
    `).all(announcement.stock_code, announcement.id);

    res.json({
      announcement,
      relatedAnnouncements
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '服务器错误' });
  }
});

module.exports = router;
