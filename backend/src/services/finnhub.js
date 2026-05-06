const axios = require('axios');
const { getDB } = require('../db');
const crypto = require('crypto');

// 生成标题哈希用于去重
function generateTitleHash(title) {
  return crypto.createHash('md5').update(title.trim().toLowerCase()).digest('hex').slice(0, 16);
}

// Finnhub - 金融新闻
async function fetchFinnhubNews() {
  const db = getDB();
  const key = process.env.FINNHUB_API_KEY;

  if (!key) {
    console.warn('[Finnhub] 未配置 API Key');
    return 0;
  }

  let totalNew = 0;

  // Finnhub 新闻分类
  const categories = ['general', 'forex', 'crypto', 'merger'];

  for (const category of categories) {
    try {
      const url = `https://finnhub.io/api/v1/news?category=${category}&token=${key}`;
      const response = await axios.get(url, { timeout: 20000 });

      if (Array.isArray(response.data)) {
        const insertStmt = db.prepare(`
          INSERT OR IGNORE INTO articles
          (article_id, title, description, content, url, image_url, source_name, source_region, category, published_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, 'international', ?, ?)
        `);

        for (const item of response.data) {
          const title = item.headline || '';
          if (!title) continue;

          const titleHash = generateTitleHash(title);
          const articleId = item.id ? `finnhub-${item.id}` : `finnhub-${titleHash}`;

          const result = insertStmt.run(
            articleId,
            title,
            item.summary || '',
            item.summary || '',
            item.url || '',
            item.image || '',
            item.source || 'Finnhub',
            mapCategory(category, title),
            new Date(item.datetime * 1000).toISOString()
          );

          if (result.changes > 0) totalNew++;
        }
      }

      await new Promise(r => setTimeout(r, 300));
    } catch (e) {
      console.warn(`[Finnhub] ${category} 失败:`, e.message);
    }
  }

  // 热门公司新闻
  const symbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA', 'JPM', 'V', 'WMT'];

  for (const symbol of symbols) {
    try {
      const url = `https://finnhub.io/api/v1/company-news?symbol=${symbol}&from=${getDateDaysAgo(7)}&to=${getToday()}&token=${key}`;
      const response = await axios.get(url, { timeout: 15000 });

      if (Array.isArray(response.data)) {
        const insertStmt = db.prepare(`
          INSERT OR IGNORE INTO articles
          (article_id, title, description, content, url, image_url, source_name, source_region, category, published_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, 'international', ?, ?)
        `);

        for (const item of response.data) {
          const title = item.headline || '';
          if (!title) continue;

          const titleHash = generateTitleHash(title);
          const articleId = item.id ? `finnhub-${symbol}-${item.id}` : `finnhub-${titleHash}`;
          const category = mapCategory('merger', title);

          const result = insertStmt.run(
            articleId,
            title,
            item.summary || '',
            item.summary || '',
            item.url || '',
            item.image || '',
            item.source || 'Finnhub',
            category,
            new Date(item.datetime * 1000).toISOString()
          );

          if (result.changes > 0) totalNew++;
        }
      }

      await new Promise(r => setTimeout(r, 200));
    } catch (e) {
      // 忽略单个股票失败
    }
  }

  return totalNew;
}

function mapCategory(finnhubCat, headline = '') {
  // 根据标题关键词智能分类
  const techKeywords = ['AI', 'artificial intelligence', 'tech', 'technology', 'software', 'chip', 'semiconductor', 'NVIDIA', 'Apple', 'Microsoft', 'Google', 'Amazon', 'Tesla', 'Meta', 'OpenAI', 'computer', 'digital', 'cyber', 'cloud', 'data center', 'processor', 'GPU', 'CPU', 'intel', 'amd', 'quantum', 'robot', 'automation', 'IT', 'app', 'platform', 'electric vehicle', 'EV'];
  const scienceKeywords = ['science', 'research', 'study', 'discovery', 'climate', 'energy', 'renewable', 'solar', 'wind', 'nuclear', 'space', 'NASA', 'biotech', 'medical', 'health', 'vaccine', 'drug', 'pharma', 'biology', 'chemistry', 'physics', 'gene', 'DNA', 'clinical', 'trial', 'cure', 'treatment', 'disease', 'cancer', 'pandemic', 'virus'];

  const titleLower = headline.toLowerCase();

  // 检测科技关键词
  for (const kw of techKeywords) {
    if (titleLower.includes(kw.toLowerCase())) {
      return 'technology';
    }
  }

  // 检测科学关键词
  for (const kw of scienceKeywords) {
    if (titleLower.includes(kw.toLowerCase())) {
      return 'science';
    }
  }

  const map = {
    'general': 'general',
    'forex': 'forex',
    'crypto': 'crypto',
    'merger': 'business'
  };
  return map[finnhubCat] || 'business';
}

function getDateDaysAgo(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().split('T')[0];
}

function getToday() {
  return new Date().toISOString().split('T')[0];
}

module.exports = { fetchFinnhubNews };