const axios = require('axios');
const { getDB } = require('../db');
const crypto = require('crypto');

// 生成标题哈希用于去重
function generateTitleHash(title) {
  return crypto.createHash('md5').update(title.trim().toLowerCase()).digest('hex').slice(0, 16);
}

async function fetchEastMoneyNews() {
  const db = getDB();
  let totalNew = 0;

  // 东方财富公告接口（可用的）
  const endpoints = [
    // 公司公告
    { url: 'https://np-anotice-stock.eastmoney.com/api/security/ann?cb=jsonCallback&sr=-1&page_size=100&page_index=', pages: 5, name: '公告' },
    // 新闻资讯
    { url: 'https://newsapi.eastmoney.com/kuaixun/v1/kuaixun/GetListInfo?type=0&ps=100&p=', pages: 3, name: '快讯' },
  ];

  for (const endpoint of endpoints) {
    for (let page = 1; page <= endpoint.pages; page++) {
      try {
        const url = `${endpoint.url}${page}`;
        const response = await axios.get(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Referer': 'https://www.eastmoney.com/'
          },
          timeout: 15000
        });

        // 处理JSONP格式
        let data = response.data;
        if (typeof data === 'string' && data.includes('jsonCallback')) {
          data = JSON.parse(data.replace(/^jsonCallback\(/, '').replace(/\)$/, ''));
        }

        const items = data.data?.list || data.data?.diff || data.result?.data || [];

        if (items.length > 0) {
          const insertStmt = db.prepare(`
            INSERT OR IGNORE INTO articles
            (article_id, title, description, url, source_name, source_region, category, published_at)
            VALUES (?, ?, ?, ?, ?, 'domestic', ?, ?)
          `);

          for (const item of items) {
            const title = item.title || item.title_ch || '';
            if (!title) continue;

            const titleHash = generateTitleHash(title);
            const articleId = item.art_code || item.code ? `em-${item.art_code || item.code}` : `em-${titleHash}`;
            const category = inferCategory(title);
            const time = item.display_time || item.showtime || item.eiTime || new Date().toISOString();

            const result = insertStmt.run(
              articleId,
              title,
              '',
              `https://data.eastmoney.com/notices/detail/${item.art_code || item.code}.html`,
              '东方财富',
              category,
              time
            );

            if (result.changes > 0) totalNew++;
          }
        }

        await new Promise(r => setTimeout(r, 300));
      } catch (e) {
        console.warn(`[EastMoney] ${endpoint.name} 第${page}页失败:`, e.message);
      }
    }
  }

  // 东方财富热门个股新闻
  const hotStocks = [
    '600519', '000858', '601318', '600036', '000333',
    '002594', '300750', '601012', '002475', '600900',
    '000001', '600000', '601166', '002415', '600276',
  ];

  for (const stock of hotStocks) {
    try {
      const url = `https://np-listapi.eastmoney.com/comm/wap/getListInfo?type=106&code=${stock}&pageSize=50`;
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': 'https://www.eastmoney.com/'
        },
        timeout: 10000
      });

      const items = response.data.data?.diff || [];
      if (items.length > 0) {
        const insertStmt = db.prepare(`
          INSERT OR IGNORE INTO articles
          (article_id, title, description, url, source_name, source_region, category, published_at)
          VALUES (?, ?, ?, ?, ?, 'domestic', 'stock', ?)
        `);

        for (const item of items) {
          const title = item.title || '';
          if (!title) continue;

          const titleHash = generateTitleHash(title);
          const articleId = item.code ? `em-stock-${item.code}` : `em-stock-${titleHash}`;
          const result = insertStmt.run(
            articleId,
            title,
            item.digest || '',
            item.url || '',
            '东方财富',
            item.showtime || new Date().toISOString()
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

function inferCategory(title) {
  if (/股|A股|港股|美股|创业板|科创板/.test(title)) return 'stock';
  if (/宏观|经济|央行|GDP|通胀|利率/.test(title)) return 'macro';
  if (/公司|企业|上市|并购|重组/.test(title)) return 'company';
  if (/外汇|汇率|人民币|美元|欧元/.test(title)) return 'forex';
  if (/币|比特币|以太坊|区块链|加密/.test(title)) return 'crypto';
  if (/基金|ETF|私募|公募/.test(title)) return 'fund';
  return 'stock';
}

module.exports = { fetchEastMoneyNews };