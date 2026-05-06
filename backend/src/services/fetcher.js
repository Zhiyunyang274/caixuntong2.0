const { getDB } = require('../db');
const { fetchSinaNews } = require('./sina');
const { fetchEastMoneyNews } = require('./eastmoney');
const { fetchJuheNews } = require('./juhe');
const { fetchNewsAPI } = require('./newsapi');
const { fetchFinnhubNews } = require('./finnhub');
const { fetchScienceRSS } = require('./rss');

async function fetchAllNews() {
  const db = getDB();
  let totalNew = 0;

  console.log('[Fetcher] 开始抓取国内新闻...');

  // 国内信息源
  try {
    const sinaCount = await fetchSinaNews();
    totalNew += sinaCount;
    console.log(`[Sina] 新增 ${sinaCount} 条`);
  } catch (e) {
    console.warn('[Sina] 抓取失败:', e.message);
  }

  try {
    const emCount = await fetchEastMoneyNews();
    totalNew += emCount;
    console.log(`[EastMoney] 新增 ${emCount} 条`);
  } catch (e) {
    console.warn('[EastMoney] 抓取失败:', e.message);
  }

  try {
    const juheCount = await fetchJuheNews();
    totalNew += juheCount;
    console.log(`[Juhe] 新增 ${juheCount} 条`);
  } catch (e) {
    console.warn('[Juhe] 抓取失败:', e.message);
  }

  console.log('[Fetcher] 开始抓取国外新闻...');

  // 国外信息源
  try {
    const newsApiCount = await fetchNewsAPI();
    totalNew += newsApiCount;
    console.log(`[NewsAPI] 新增 ${newsApiCount} 条`);
  } catch (e) {
    console.warn('[NewsAPI] 抓取失败:', e.message);
  }

  try {
    const finnhubCount = await fetchFinnhubNews();
    totalNew += finnhubCount;
    console.log(`[Finnhub] 新增 ${finnhubCount} 条`);
  } catch (e) {
    console.warn('[Finnhub] 抓取失败:', e.message);
  }

  // 科学新闻RSS源
  try {
    const rssCount = await fetchScienceRSS();
    totalNew += rssCount;
    console.log(`[RSS] 新增 ${rssCount} 条科学新闻`);
  } catch (e) {
    console.warn('[RSS] 抓取失败:', e.message);
  }

  const finalCount = db.prepare('SELECT COUNT(*) as cnt FROM articles').get().cnt;
  console.log(`[Fetcher] 完成，数据库现有 ${finalCount} 条文章，本次新增 ${totalNew} 条`);
}

module.exports = { fetchAllNews };
