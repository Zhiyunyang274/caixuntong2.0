const express = require('express');
const router = express.Router();
const axios = require('axios');

// 模拟自选股数据存储 (生产环境应使用数据库)
let watchlistData = {
  stocks: [
    { symbol: 'sh600519', name: '贵州茅台', type: 'A' },
    { symbol: 'sz000858', name: '五粮液', type: 'A' },
    { symbol: 'AAPL', name: '苹果', type: 'US' },
  ]
};

// 获取自选股列表
router.get('/', (req, res) => {
  res.json(watchlistData);
});

// 添加股票到自选股
router.post('/add', (req, res) => {
  const { symbol, name, type = 'A' } = req.body;

  if (!symbol) {
    return res.status(400).json({ error: '缺少股票代码' });
  }

  // 检查是否已存在
  const exists = watchlistData.stocks.find(s => s.symbol === symbol);
  if (exists) {
    return res.status(400).json({ error: '该股票已在自选股中' });
  }

  watchlistData.stocks.push({ symbol, name: name || symbol, type });

  res.json({
    success: true,
    message: '添加成功',
    data: watchlistData
  });
});

// 从自选股删除
router.post('/remove', (req, res) => {
  const { symbol } = req.body;

  if (!symbol) {
    return res.status(400).json({ error: '缺少股票代码' });
  }

  const index = watchlistData.stocks.findIndex(s => s.symbol === symbol);
  if (index === -1) {
    return res.status(400).json({ error: '该股票不在自选股中' });
  }

  watchlistData.stocks.splice(index, 1);

  res.json({
    success: true,
    message: '删除成功',
    data: watchlistData
  });
});

// 获取自选股实时行情
router.get('/quote', async (req, res) => {
  try {
    const juheKey = process.env.JUHE_API_KEY;
    const finnhubKey = process.env.FINNHUB_API_KEY;
    const stocks = watchlistData.stocks;

    const quotes = [];

    // 分别获取A股和美股行情
    const aStocks = stocks.filter(s => s.type === 'A');
    const usStocks = stocks.filter(s => s.type === 'US');

    // 获取A股行情
    for (const stock of aStocks) {
      try {
        const response = await axios.get(
          `http://web.juhe.cn:8080/finance/stock/hs?key=${juheKey}&gid=${stock.symbol}`,
          { timeout: 5000 }
        );

        if (response.data && response.data.result && response.data.result.length > 0) {
          const data = response.data.result[0];
          quotes.push({
            symbol: stock.symbol,
            name: stock.name,
            type: 'A',
            price: parseFloat(data.nowPri) || 0,
            change: parseFloat(data.increPer) || 0,
            changeAmount: parseFloat(data.increase) || 0,
            open: parseFloat(data.todayOpenPri) || 0,
            high: parseFloat(data.highPri) || 0,
            low: parseFloat(data.lowPri) || 0,
            volume: data_traNumber || '0',
            turnover: data.turnover || '0'
          });
        }
      } catch (e) {
        console.error(`获取A股行情失败 ${stock.symbol}:`, e.message);
        quotes.push({
          symbol: stock.symbol,
          name: stock.name,
          type: 'A',
          error: '行情获取失败'
        });
      }
    }

    // 获取美股行情
    for (const stock of usStocks) {
      try {
        const response = await axios.get(
          `https://finnhub.io/api/v1/quote?symbol=${stock.symbol}&token=${finnhubKey}`,
          { timeout: 5000 }
        );

        if (response.data) {
          const data = response.data;
          const change = data.c && data.pc ? ((data.c - data.pc) / data.pc * 100) : 0;
          quotes.push({
            symbol: stock.symbol,
            name: stock.name,
            type: 'US',
            price: data.c || 0,
            change: change,
            changeAmount: data.c && data.pc ? (data.c - data.pc) : 0,
            open: data.o || 0,
            high: data.h || 0,
            low: data.l || 0,
            prevClose: data.pc || 0
          });
        }
      } catch (e) {
        console.error(`获取美股行情失败 ${stock.symbol}:`, e.message);
        quotes.push({
          symbol: stock.symbol,
          name: stock.name,
          type: 'US',
          error: '行情获取失败'
        });
      }
    }

    res.json({ quotes });
  } catch (err) {
    console.error('获取行情失败:', err);
    res.status(500).json({ error: '获取行情失败' });
  }
});

// 获取股票K线数据
router.get('/kline', async (req, res) => {
  try {
    const { symbol, type = 'A', resolution = 'D' } = req.query;

    if (!symbol) {
      return res.status(400).json({ error: '缺少股票代码' });
    }

    const finnhubKey = process.env.FINNHUB_API_KEY;
    const juheKey = process.env.JUHE_API_KEY;

    // 时间范围
    const now = Math.floor(Date.now() / 1000);
    const from = now - (resolution === 'D' ? 365 * 24 * 3600 : 30 * 24 * 3600);

    if (type === 'US') {
      // 美股使用Finnhub
      const response = await axios.get(
        `https://finnhub.io/api/v1/stock/candle?symbol=${symbol}&resolution=${resolution}&from=${from}&to=${now}&token=${finnhubKey}`,
        { timeout: 10000 }
      );

      const data = response.data;

      if (data.s === 'ok' && data.t) {
        const klineData = data.t.map((timestamp, i) => ({
          time: timestamp,
          open: data.o[i],
          high: data.h[i],
          low: data.l[i],
          close: data.c[i],
          volume: data.v[i]
        }));

        res.json({ data: klineData });
      } else {
        res.json({ data: [] });
      }
    } else {
      // A股使用模拟数据（聚合数据API暂不支持K线，返回模拟数据用于演示）
      const mockData = generateMockKline(symbol, from, now, resolution);
      res.json({ data: mockData });
    }
  } catch (err) {
    console.error('获取K线失败:', err);
    res.status(500).json({ error: '获取K线数据失败' });
  }
});

// 生成模拟K线数据（用于演示）
function generateMockKline(symbol, from, to, resolution) {
  const data = [];
  const interval = resolution === 'D' ? 86400 : resolution === 'W' ? 604800 : 3600;
  let basePrice = 100 + Math.random() * 900;

  for (let t = from; t <= to; t += interval) {
    const volatility = basePrice * 0.02;
    const change = (Math.random() - 0.5) * volatility;
    const open = basePrice;
    const close = basePrice + change;
    const high = Math.max(open, close) + Math.random() * volatility * 0.5;
    const low = Math.min(open, close) - Math.random() * volatility * 0.5;
    const volume = Math.floor(Math.random() * 10000000) + 1000000;

    data.push({
      time: t,
      open: parseFloat(open.toFixed(2)),
      high: parseFloat(high.toFixed(2)),
      low: parseFloat(low.toFixed(2)),
      close: parseFloat(close.toFixed(2)),
      volume
    });

    basePrice = close;
  }

  return data;
}

module.exports = router;