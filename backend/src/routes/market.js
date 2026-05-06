const express = require('express');
const router = express.Router();
const marketService = require('../services/marketService');

// 获取A股热门股票行情
router.get('/stocks', async (req, res) => {
  try {
    const stocks = await marketService.getStocks();
    res.json({ success: true, data: stocks });
  } catch (err) {
    console.error('[Market] 股票行情错误:', err.message);
    res.status(500).json({ success: false, error: '股票行情获取失败', data: [] });
  }
});

// 获取大盘指数
router.get('/index', async (req, res) => {
  try {
    const index = await marketService.getIndex();
    res.json({ success: true, data: index });
  } catch (err) {
    console.error('[Market] 大盘指数错误:', err.message);
    res.status(500).json({ success: false, error: '大盘指数获取失败', data: [] });
  }
});

// 获取汇率行情
router.get('/forex', async (req, res) => {
  try {
    const forex = await marketService.getForex();
    res.json({ success: true, data: forex });
  } catch (err) {
    console.error('[Market] 汇率行情错误:', err.message);
    res.status(500).json({ success: false, error: '汇率行情获取失败', data: [] });
  }
});

// 获取加密货币行情
router.get('/crypto', async (req, res) => {
  try {
    const crypto = await marketService.getCrypto();
    res.json({ success: true, data: crypto });
  } catch (err) {
    console.error('[Market] 加密货币错误:', err.message);
    res.status(500).json({ success: false, error: '加密货币行情获取失败', data: [] });
  }
});

// 获取美股行情
router.get('/us', async (req, res) => {
  try {
    const stocks = await marketService.getUSStocks();
    res.json({ success: true, data: stocks });
  } catch (err) {
    console.error('[Market] 美股行情错误:', err.message);
    res.status(500).json({ success: false, error: '美股行情获取失败', data: [] });
  }
});

// 旧接口兼容 - 聚合数据汇率
router.get('/exchange', async (req, res) => {
  try {
    const forex = await marketService.getForex();
    res.json({ success: true, result: forex });
  } catch (err) {
    res.status(500).json({ success: false, error: '汇率数据获取失败' });
  }
});

// 旧接口兼容 - 单个股票
router.get('/stock', async (req, res) => {
  try {
    const { symbol } = req.query;
    if (!symbol) {
      return res.status(400).json({ error: '缺少股票代码' });
    }
    const stocks = await marketService.getStocks();
    const stock = stocks.find(s => s.symbol === symbol);
    res.json({ success: true, data: stock || null });
  } catch (err) {
    res.status(500).json({ error: '股票行情获取失败' });
  }
});

// 旧接口兼容 - 美股单只
router.get('/us-stock', async (req, res) => {
  try {
    const { symbol } = req.query;
    if (!symbol) {
      return res.status(400).json({ error: '缺少股票代码' });
    }
    const stocks = await marketService.getUSStocks();
    const stock = stocks.find(s => s.symbol === symbol);
    res.json({ success: true, data: stock || null });
  } catch (err) {
    res.status(500).json({ error: '美股行情获取失败' });
  }
});

module.exports = router;
