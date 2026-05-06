require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cron = require('node-cron');

const newsRouter = require('./routes/news');
const marketRouter = require('./routes/market');
const favoritesRouter = require('./routes/favorites');
const watchlistRouter = require('./routes/watchlist');
const calendarRouter = require('./routes/calendar');
const announcementsRouter = require('./routes/announcements');
const { initDB } = require('./db');
const { fetchAllNews } = require('./services/fetcher');
const { fetchAllAnnouncements } = require('./services/announcements');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// 路由
app.use('/api/news', newsRouter);
app.use('/api/market', marketRouter);
app.use('/api/favorites', favoritesRouter);
app.use('/api/watchlist', watchlistRouter);
app.use('/api/calendar', calendarRouter);
app.use('/api/announcements', announcementsRouter);

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// 启动
async function start() {
  await initDB();

  // 首次启动时抓取一次新闻
  console.log('[Server] 开始首次新闻抓取...');
  await fetchAllNews();

  // 首次启动时抓取公告
  console.log('[Server] 开始首次公告抓取...');
  await fetchAllAnnouncements();

  // 每20分钟自动抓取新闻
  cron.schedule('*/20 * * * *', async () => {
    console.log('[Cron] 开始定时抓取新闻...');
    await fetchAllNews();
  });

  // 每20分钟抓取公告
  cron.schedule('*/20 * * * *', async () => {
    console.log('[Cron] 开始定时抓取公告...');
    await fetchAllAnnouncements();
  });

  const server = app.listen(PORT, () => {
    console.log(`[Server] 后端服务已启动：http://localhost:${PORT}`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`端口 ${PORT} 已被占用`);
    } else {
      console.error('服务器错误：', err.message);
    }
    process.exit(1);
  });
}

start().catch(console.error);
