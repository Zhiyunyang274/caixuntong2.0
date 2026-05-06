const axios = require('axios');
const { getDB } = require('../db');
const crypto = require('crypto');

// 生成标题哈希用于去重
function generateTitleHash(title) {
  return crypto.createHash('md5').update(title.trim().toLowerCase()).digest('hex').slice(0, 16);
}

// NewsAPI - 国际新闻（多语言多地区）
async function fetchNewsAPI() {
  const db = getDB();
  const key = process.env.NEWS_API_KEY;

  if (!key) {
    console.warn('[NewsAPI] 未配置 API Key');
    return 0;
  }

  let totalNew = 0;

  // 多种查询组合
  const queries = [
    // 按分类
    { endpoint: 'top-headlines', params: { category: 'business', language: 'en', pageSize: 100 } },
    { endpoint: 'top-headlines', params: { category: 'technology', language: 'en', pageSize: 100 } },
    { endpoint: 'top-headlines', params: { category: 'science', language: 'en', pageSize: 100 } },
    // 按关键词搜索
    { endpoint: 'everything', params: { q: 'finance', language: 'en', pageSize: 100, sortBy: 'publishedAt' } },
    { endpoint: 'everything', params: { q: 'stock market', language: 'en', pageSize: 100, sortBy: 'publishedAt' } },
    { endpoint: 'everything', params: { q: 'cryptocurrency', language: 'en', pageSize: 100, sortBy: 'publishedAt' } },
    { endpoint: 'everything', params: { q: 'economy', language: 'en', pageSize: 100, sortBy: 'publishedAt' } },
    { endpoint: 'everything', params: { q: 'forex', language: 'en', pageSize: 100, sortBy: 'publishedAt' } },
  ];

  for (const query of queries) {
    try {
      const params = new URLSearchParams({ ...query.params, apiKey: key });
      const url = `https://newsapi.org/v2/${query.endpoint}?${params}`;

      const response = await axios.get(url, { timeout: 20000 });

      const articles = response.data.articles || [];
      if (articles.length > 0) {
        const insertStmt = db.prepare(`
          INSERT OR IGNORE INTO articles
          (article_id, title, description, content, url, image_url, source_name, source_region, category, published_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, 'international', ?, ?)
        `);

        for (const item of articles) {
          const title = item.title || '';
          if (!title) continue;

          const titleHash = generateTitleHash(title);
          const articleId = `newsapi-${titleHash}`;
          const category = mapCategory(query.params.category || query.params.q);

          const result = insertStmt.run(
            articleId,
            title,
            item.description || '',
            (item.content || '').substring(0, 500),
            item.url || '',
            item.urlToImage || '',
            item.source?.name || 'NewsAPI',
            category,
            item.publishedAt || new Date().toISOString()
          );

          if (result.changes > 0) totalNew++;
        }
      }

      await new Promise(r => setTimeout(r, 500));
    } catch (e) {
      console.warn(`[NewsAPI] ${query.endpoint} ${query.params.category || query.params.q} 失败:`, e.message);
    }
  }

  return totalNew;
}

function mapCategory(input) {
  const cat = (input || '').toLowerCase();
  if (cat.includes('business') || cat.includes('finance') || cat.includes('stock')) return 'business';
  if (cat.includes('technology') || cat.includes('tech')) return 'technology';
  if (cat.includes('science')) return 'science';
  if (cat.includes('crypto')) return 'crypto';
  if (cat.includes('forex') || cat.includes('economy')) return 'forex';
  return 'general';
}

module.exports = { fetchNewsAPI };