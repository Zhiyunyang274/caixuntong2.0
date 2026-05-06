const axios = require('axios');
const { getDB } = require('../db');
const xml2js = require('xml2js');
const crypto = require('crypto');

// 生成标题哈希用于去重
function generateTitleHash(title) {
  return crypto.createHash('md5').update(title.trim().toLowerCase()).digest('hex').slice(0, 16);
}

// RSS科学新闻源
async function fetchScienceRSS() {
  const db = getDB();
  let totalNew = 0;

  // 科学类RSS源
  const rssSources = [
    { url: 'https://www.sciencedaily.com/rss/all.xml', source: 'ScienceDaily', category: 'science' },
    { url: 'https://feeds.nature.com/nature/rss/current', source: 'Nature', category: 'science' },
    { url: 'https://rss.science.org/science-current-issue.xml', source: 'Science', category: 'science' },
    { url: 'https://www.nasa.gov/rss/dyn/breaking_news.rss', source: 'NASA', category: 'science' },
    { url: 'https://www.reuters.com/rss/science', source: 'Reuters Science', category: 'science' },
  ];

  const parser = new xml2js.Parser();

  for (const source of rssSources) {
    try {
      const response = await axios.get(source.url, {
        timeout: 15000,
        headers: { 'Accept': 'application/rss+xml' }
      });

      const result = await parser.parseStringPromise(response.data);
      const items = result.rss?.channel?.[0]?.item || [];

      if (items.length > 0) {
        const insertStmt = db.prepare(`
          INSERT OR IGNORE INTO articles
          (article_id, title, description, content, url, image_url, source_name, source_region, category, published_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, 'international', ?, ?)
        `);

        for (const item of items.slice(0, 20)) {
          const title = item.title?.[0] || '';
          if (!title) continue;

          const titleHash = generateTitleHash(title);
          const articleId = `rss-${titleHash}`;
          const link = item.link?.[0] || '';
          const desc = item.description?.[0] || '';
          const pubDate = item.pubDate?.[0] || new Date().toISOString();

          const res = insertStmt.run(
            articleId,
            title,
            desc.replace(/<[^>]*>/g, '').substring(0, 200),
            desc.replace(/<[^>]*>/g, '').substring(0, 500),
            link,
            '',
            source.source,
            source.category,
            new Date(pubDate).toISOString()
          );

          if (res.changes > 0) totalNew++;
        }
      }

      await new Promise(r => setTimeout(r, 300));
    } catch (e) {
      console.warn(`[RSS] ${source.source} 失败:`, e.message);
    }
  }

  return totalNew;
}

module.exports = { fetchScienceRSS };