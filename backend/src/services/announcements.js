const { getDB } = require('../db');
const axios = require('axios');

// 公告类型配置
const ANNOUNCEMENT_TYPES = {
  merger: { label: '并购重组', level: 'high', keywords: ['收购', '合并', '重组', '资产注入', '并购', '借壳', '重大资产'] },
  equity: { label: '股权变更', level: 'high', keywords: ['减持', '增持', '股权变更', '控制权', '大股东', '股份转让', '协议转让', '权益变动'] },
  performance: { label: '业绩预告', level: 'high', keywords: ['业绩预告', '预增', '预减', '扭亏', '首亏', '续亏', '业绩快报', '业绩修正'] },
  buyback: { label: '回购增持', level: 'medium', keywords: ['回购', '增持计划', '董监高增持', '股份回购', '回购进展'] },
  contract: { label: '重大合同', level: 'medium', keywords: ['重大合同', '中标', '战略合作', '框架协议', '签署合同'] },
  dividend: { label: '分红送转', level: 'low', keywords: ['分红', '送转', '派息', '高送转', '利润分配', '权益分派'] },
  unlock: { label: '限售解禁', level: 'low', keywords: ['解禁', '限售股', '流通', '解除限售'] },
  ipo: { label: 'IPO相关', level: 'medium', keywords: ['IPO', '上市', '招股', '申购', '发行'] },
};

// 从东方财富公告中心抓取
async function fetchEastMoneyAnnouncements() {
  const db = getDB();
  let newCount = 0;

  try {
    // 东方财富公告中心API
    const url = 'https://np-anotice-stock.eastmoney.com/api/security/ann';

    const response = await axios.get(url, {
      params: {
        cb: '',
        sr: -1,
        page_size: 100,
        page_index: 1,
        ann_type: 'SHA,SZA',
        client_source: 'web',
        f_node: 0,
        s_node: 0,
      },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Referer': 'https://data.eastmoney.com/notices/stock.html',
        'Accept-Language': 'zh-CN,zh;q=0.9',
      },
      timeout: 20000
    });

    const text = response.data;

    // 解析JSONP响应
    let data = null;
    try {
      // 尝试直接解析JSON
      if (typeof text === 'object') {
        data = text;
      } else {
        // 移除JSONP包装
        const jsonMatch = text.match(/\{.*\}/);
        if (jsonMatch) {
          data = JSON.parse(jsonMatch[0]);
        }
      }
    } catch (parseErr) {
      console.error('[Announcements] JSON解析失败:', parseErr.message);
    }

    if (data && data.data && data.data.list) {
      for (const item of data.data.list) {
        try {
          const annId = `em-${item.art_code || item.id || Date.now()}`;
          const title = item.title || item.title_ch || '';
          // codes is now an array
          const codeInfo = item.codes?.[0] || {};
          const stockCode = codeInfo.stock_code || item.sec_code || '';
          const stockName = codeInfo.short_name || item.sec_name || '';
          const publishTime = item.notice_date || item.display_time || '';
          const summary = item.abstract || '';
          const detailUrl = item.adj_url || `https://data.eastmoney.com/notices/detail/${item.art_code}.html`;

          const existing = db.prepare('SELECT id FROM announcements WHERE ann_id = ?').get(annId);
          if (existing) continue;

          const { category, level } = classifyAnnouncement(title);
          if (!category) continue;

          const stmt = db.prepare(`
            INSERT OR IGNORE INTO announcements
            (ann_id, title, stock_code, stock_name, category, level, summary, url, publish_time, source)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);

          stmt.run(annId, title, stockCode, stockName, category, level, summary, detailUrl, publishTime, 'eastmoney');
          newCount++;
        } catch (e) {
          // 忽略单条错误
        }
      }
    }
  } catch (e) {
    console.error('[Announcements] 东方财富抓取失败:', e.message);
  }

  return newCount;
}

// 从同花顺公告抓取（备用）
async function fetchTHSAnnouncements() {
  const db = getDB();
  let newCount = 0;

  try {
    // 同花顺公告API
    const url = 'https://news.10jqka.com.cn/tapp/news/push/stock/';

    const response = await axios.get(url, {
      params: {
        page: 1,
        tag: '',
        type: 'announcement',
      },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://news.10jqka.com.cn/',
      },
      timeout: 15000
    });

    const data = response.data;

    if (data && data.data && data.data.list) {
      for (const item of data.data.list) {
        try {
          const annId = `ths-${item.id || Date.now()}`;
          const title = item.title || '';
          const stockCode = item.stock_code || '';
          const stockName = item.stock_name || '';
          const publishTime = item.pub_time || '';
          const summary = item.summary || '';
          const detailUrl = item.url || '';

          const existing = db.prepare('SELECT id FROM announcements WHERE ann_id = ?').get(annId);
          if (existing) continue;

          const { category, level } = classifyAnnouncement(title);
          if (!category) continue;

          const stmt = db.prepare(`
            INSERT OR IGNORE INTO announcements
            (ann_id, title, stock_code, stock_name, category, level, summary, url, publish_time, source)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);

          stmt.run(annId, title, stockCode, stockName, category, level, summary, detailUrl, publishTime, 'ths');
          newCount++;
        } catch (e) {
          // 忽略
        }
      }
    }
  } catch (e) {
    console.error('[Announcements] 同花顺抓取失败:', e.message);
  }

  return newCount;
}

// 从现有新闻中提取公告类信息（兜底方案）
async function extractFromNews() {
  const db = getDB();
  let newCount = 0;

  try {
    // 从新闻表中查找公告类新闻
    const news = db.prepare(`
      SELECT id, title, source_name, published_at, url, description
      FROM articles
      WHERE source_region = 'domestic'
      AND (title LIKE '%减持%' OR title LIKE '%增持%' OR title LIKE '%收购%'
           OR title LIKE '%重组%' OR title LIKE '%回购%' OR title LIKE '%业绩预告%'
           OR title LIKE '%股权%' OR title LIKE '%解禁%' OR title LIKE '%分红%')
      ORDER BY published_at DESC
      LIMIT 50
    `).all();

    for (const item of news) {
      try {
        const annId = `news-${item.id}`;

        const existing = db.prepare('SELECT id FROM announcements WHERE ann_id = ?').get(annId);
        if (existing) continue;

        const { category, level } = classifyAnnouncement(item.title);
        if (!category) continue;

        // 从标题提取股票代码和名称
        const stockMatch = item.title.match(/【([^】]+)】/);
        let stockName = stockMatch ? stockMatch[1] : '';
        let stockCode = '';

        const stmt = db.prepare(`
          INSERT OR IGNORE INTO announcements
          (ann_id, title, stock_code, stock_name, category, level, summary, url, publish_time, source)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        stmt.run(annId, item.title, stockCode, stockName, category, level, item.description || '', item.url, item.published_at, 'news');
        newCount++;
      } catch (e) {
        // 忽略
      }
    }
  } catch (e) {
    console.error('[Announcements] 新闻提取失败:', e.message);
  }

  return newCount;
}

// 分类公告
function classifyAnnouncement(title) {
  if (!title) return { category: null, level: null };

  const titleLower = title.toLowerCase();

  for (const [key, config] of Object.entries(ANNOUNCEMENT_TYPES)) {
    for (const keyword of config.keywords) {
      if (titleLower.includes(keyword.toLowerCase())) {
        return { category: key, level: config.level };
      }
    }
  }

  return { category: null, level: null };
}

// 抓取所有公告
async function fetchAllAnnouncements() {
  console.log('[Announcements] 开始抓取公告...');

  let total = 0;

  // 尝试东方财富
  const emCount = await fetchEastMoneyAnnouncements();
  total += emCount;
  console.log(`[Announcements] 东方财富新增 ${emCount} 条`);

  // 尝试同花顺
  const thsCount = await fetchTHSAnnouncements();
  total += thsCount;
  console.log(`[Announcements] 同花顺新增 ${thsCount} 条`);

  // 从现有新闻提取（兜底）
  if (total === 0) {
    const newsCount = await extractFromNews();
    total += newsCount;
    console.log(`[Announcements] 从新闻提取 ${newsCount} 条`);
  }

  console.log(`[Announcements] 抓取完成，共新增 ${total} 条`);
  return total;
}

// 获取公告类型配置
function getAnnouncementTypes() {
  return Object.entries(ANNOUNCEMENT_TYPES).map(([key, config]) => ({
    key,
    label: config.label,
    level: config.level
  }));
}

module.exports = {
  fetchAllAnnouncements,
  getAnnouncementTypes,
  ANNOUNCEMENT_TYPES
};