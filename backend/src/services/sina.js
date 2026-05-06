const axios = require('axios');
const { getDB } = require('../db');
const crypto = require('crypto');

const CATEGORIES = ['stock', 'macro', 'company', 'forex', 'crypto', 'fund'];

const CATEGORY_MAP = {
  '股票': 'stock', 'A股': 'stock', '港股': 'stock', '美股': 'stock',
  '宏观': 'macro', '经济': 'macro', '央行': 'macro', 'GDP': 'macro',
  '公司': 'company', '企业': 'company', '上市': 'company',
  '外汇': 'forex', '汇率': 'forex', '人民币': 'forex',
  '数字货币': 'crypto', '比特币': 'crypto', '以太坊': 'crypto', '区块链': 'crypto',
  '基金': 'fund', 'ETF': 'fund', '私募': 'fund',
};

// 生成标题哈希用于去重
function generateTitleHash(title) {
  return crypto.createHash('md5').update(title.trim().toLowerCase()).digest('hex').slice(0, 16);
}

async function fetchSinaNews() {
  const db = getDB();
  let totalNew = 0;

  // 新浪财经多分类多页抓取
  const feeds = [
    { lid: 2516, name: '股票' },
    { lid: 2517, name: '美股' },
    { lid: 2518, name: '港股' },
    { lid: 2519, name: '基金' },
    { lid: 2520, name: '外汇' },
    { lid: 2522, name: '期货' },
    { lid: 2523, name: '债券' },
    { lid: 2524, name: '银行' },
    { lid: 2525, name: '保险' },
    { lid: 2526, name: '信托' },
  ];

  for (const feed of feeds) {
    for (let page = 1; page <= 3; page++) {
      try {
        const url = `https://feed.sina.com.cn/api/roll/get?pageid=153&lid=${feed.lid}&num=100&page=${page}&r=${Date.now()}`;
        const response = await axios.get(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Referer': 'https://finance.sina.com.cn/'
          },
          timeout: 15000
        });

        const data = response.data;
        if (data.result && data.result.data) {
          const insertStmt = db.prepare(`
            INSERT OR IGNORE INTO articles
            (article_id, title, description, url, source_name, source_region, category, published_at)
            VALUES (?, ?, ?, ?, ?, 'domestic', ?, ?)
          `);

          for (const item of data.result.data) {
            const title = item.title || '';
            if (!title) continue;

            // 使用原标题哈希作为article_id的一部分，确保相同标题不会重复
            const titleHash = generateTitleHash(title);
            const articleId = item.id ? `sina-${item.id}` : `sina-${titleHash}`;
            const category = inferCategory(title);

            const result = insertStmt.run(
              articleId,
              title,
              item.intro || '',
              item.url || '',
              item.media_name || '新浪财经',
              category,
              item.create_time || new Date().toISOString()
            );

            if (result.changes > 0) totalNew++;
          }
        }

        await new Promise(r => setTimeout(r, 200));
      } catch (e) {
        console.warn(`[Sina] ${feed.name} 第${page}页失败:`, e.message);
      }
    }
  }

  return totalNew;
}

function inferCategory(title) {
  for (const [keyword, cat] of Object.entries(CATEGORY_MAP)) {
    if (title.includes(keyword)) return cat;
  }
  return 'stock';
}

module.exports = { fetchSinaNews };
