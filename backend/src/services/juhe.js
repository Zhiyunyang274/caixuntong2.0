const axios = require('axios');
const { getDB } = require('../db');
const crypto = require('crypto');

// 生成标题哈希用于去重
function generateTitleHash(title) {
  return crypto.createHash('md5').update(title.trim().toLowerCase()).digest('hex').slice(0, 16);
}

// 聚合数据 - 多类型新闻
async function fetchJuheNews() {
  const db = getDB();
  const key = process.env.JUHE_API_KEY;

  if (!key) {
    console.warn('[Juhe] 未配置 API Key');
    return 0;
  }

  let totalNew = 0;

  // 聚合数据支持的新闻类型
  const types = [
    'caijing',   // 财经
    'guonei',    // 国内
    'guoji',     // 国际
    'shehui',    // 社会
    'keji',      // 科技
  ];

  for (const type of types) {
    try {
      const url = `http://v.juhe.cn/toutiao/index?type=${type}&key=${key}`;
      const response = await axios.get(url, { timeout: 15000 });

      if (response.data.result && response.data.result.data) {
        const insertStmt = db.prepare(`
          INSERT OR IGNORE INTO articles
          (article_id, title, description, url, image_url, source_name, source_region, category, published_at)
          VALUES (?, ?, ?, ?, ?, ?, 'domestic', ?, ?)
        `);

        for (const item of response.data.result.data) {
          const title = item.title || '';
          if (!title) continue;

          const titleHash = generateTitleHash(title);
          const articleId = item.uniquekey ? `juhe-${item.uniquekey}` : `juhe-${titleHash}`;
          const category = inferCategory(title);

          const result = insertStmt.run(
            articleId,
            title,
            title.substring(0, 100),
            item.url || '',
            item.thumbnail_pic_s || '',
            item.author_name || '聚合数据',
            category,
            item.date || new Date().toISOString()
          );

          if (result.changes > 0) totalNew++;
        }
      }

      await new Promise(r => setTimeout(r, 300));
    } catch (e) {
      console.warn(`[Juhe] 类型 ${type} 失败:`, e.message);
    }
  }

  return totalNew;
}

function inferCategory(title) {
  if (/股|A股|港股|证券|基金|期货/.test(title)) return 'stock';
  if (/宏观|经济|GDP|央行|通胀/.test(title)) return 'macro';
  if (/公司|企业|上市/.test(title)) return 'company';
  if (/外汇|汇率|人民币/.test(title)) return 'forex';
  if (/币|比特币|区块链/.test(title)) return 'crypto';
  if (/基金|ETF/.test(title)) return 'fund';
  return 'stock';
}

module.exports = { fetchJuheNews };
