const axios = require('axios');

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY || 'd7nj1qpr01qppri52e0gd7nj1qpr01qppri52e10';
const JUHE_API_KEY = process.env.JUHE_API_KEY || 'c587bd19057e917e5f3268f4a0f86ec9';

// 获取A股热门股票行情 (新浪接口)
async function getStocks() {
  try {
    // 新浪财经热门股票接口
    const response = await axios.get('https://vip.stock.finance.sina.com.cn/quotes_service/api/json_v2.php/Market_Center.getHQNodeData', {
      params: {
        page: 1,
        num: 40,
        sort: 'changepercent',
        asc: 0,
        node: 'hs_a',
        symbol: '',
        _s_r_a: 'page'
      },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://finance.sina.com.cn/'
      },
      timeout: 10000
    });

    const data = response.data;
    if (!Array.isArray(data)) return [];

    return data.slice(0, 20).map(item => ({
      symbol: item.code,
      name: item.name,
      price: parseFloat(item.trade) || 0,
      change: parseFloat(item.pricechange) || 0,
      changePercent: parseFloat(item.changepercent) || 0,
      volume: parseFloat(item.volume) || 0,
      amount: parseFloat(item.amount) || 0,
      high: parseFloat(item.high) || 0,
      low: parseFloat(item.low) || 0,
      open: parseFloat(item.open) || 0,
      prevClose: parseFloat(item.settlement) || 0
    }));
  } catch (e) {
    console.error('[MarketService] 获取A股行情失败:', e.message);
    return [];
  }
}

// 获取大盘指数 (上证、深证、创业板)
async function getIndex() {
  try {
    const indices = [
      { code: 's_sh000001', name: '上证指数' },
      { code: 's_sz399001', name: '深证成指' },
      { code: 's_sz399006', name: '创业板指' }
    ];

    const codes = indices.map(i => i.code).join(',');
    const response = await axios.get(`https://hq.sinajs.cn/list=${codes}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://finance.sina.com.cn/'
      },
      timeout: 10000
    });

    const text = response.data;
    const result = [];

    indices.forEach((index, i) => {
      const match = text.match(new RegExp(`var hq_str_${index.code}="([^"]+)"`));
      if (match) {
        const parts = match[1].split(',');
        result.push({
          code: index.code.replace('s_', ''),
          name: index.name,
          price: parseFloat(parts[1]) || 0,
          change: parseFloat(parts[2]) || 0,
          changePercent: parseFloat(parts[3]) || 0,
          volume: parseFloat(parts[4]) || 0,
          amount: parseFloat(parts[5]) || 0
        });
      }
    });

    return result;
  } catch (e) {
    console.error('[MarketService] 获取大盘指数失败:', e.message);
    return [];
  }
}

// 获取汇率行情
async function getForex() {
  try {
    // 使用新浪外汇接口
    const pairs = [
      { code: 'USDCNY', name: '美元/人民币' },
      { code: 'EURCNY', name: '欧元/人民币' },
      { code: 'GBPCNY', name: '英镑/人民币' },
      { code: 'JPYCNY', name: '日元/人民币' }
    ];

    const codes = pairs.map(p => p.code.toLowerCase()).join(',');
    const response = await axios.get(`https://hq.sinajs.cn/list=${codes}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://finance.sina.com.cn/'
      },
      timeout: 10000
    });

    const text = response.data;
    const result = [];

    pairs.forEach(pair => {
      const match = text.match(new RegExp(`var hq_str_${pair.code.toLowerCase()}="([^"]+)"`));
      if (match) {
        const parts = match[1].split(',');
        result.push({
          code: pair.code,
          name: pair.name,
          price: parseFloat(parts[0]) || 0,
          change: parseFloat(parts[1]) || 0,
          changePercent: parseFloat(parts[2]) || 0,
          bid: parseFloat(parts[3]) || 0,
          ask: parseFloat(parts[4]) || 0
        });
      }
    });

    return result;
  } catch (e) {
    console.error('[MarketService] 获取汇率失败:', e.message);
    // 备用：使用聚合数据接口
    try {
      const response = await axios.get(`http://web.juhe.cn:8080/finance/exchange/rmbquot?key=${JUHE_API_KEY}`, {
        timeout: 10000
      });

      if (response.data.resultcode === '200' && response.data.result) {
        const data = response.data.result;
        return [
          { code: 'USDCNY', name: '美元/人民币', price: parseFloat(data[0]?.data1?.bankConversionPri) || 0 },
          { code: 'EURCNY', name: '欧元/人民币', price: parseFloat(data[1]?.data1?.bankConversionPri) || 0 }
        ];
      }
    } catch (e2) {
      console.error('[MarketService] 聚合数据汇率接口也失败:', e2.message);
    }
    return [];
  }
}

// 获取加密货币行情
async function getCrypto() {
  try {
    // 使用Finhhub加密货币接口
    const cryptos = [
      { symbol: 'BTC', name: '比特币' },
      { symbol: 'ETH', name: '以太坊' }
    ];

    const result = [];

    for (const crypto of cryptos) {
      try {
        // Finnhub加密货币symbol格式
        const response = await axios.get('https://finnhub.io/api/v1/crypto/candle', {
          params: {
            symbol: `BINANCE:${crypto.symbol}USDT`,
            resolution: 'D',
            from: Math.floor(Date.now() / 1000) - 86400 * 2,
            to: Math.floor(Date.now() / 1000),
            token: FINNHUB_API_KEY
          },
          timeout: 10000
        });

        const data = response.data;
        if (data.s === 'ok' && data.c && data.c.length > 0) {
          const currentPrice = data.c[data.c.length - 1];
          const prevPrice = data.c[data.c.length - 2] || currentPrice;
          const change = currentPrice - prevPrice;
          const changePercent = prevPrice > 0 ? ((change / prevPrice) * 100) : 0;

          result.push({
            symbol: crypto.symbol,
            name: crypto.name,
            price: currentPrice,
            change: change,
            changePercent: changePercent
          });
        }
      } catch (e) {
        console.error(`[MarketService] 获取${crypto.name}失败:`, e.message);
      }
    }

    return result;
  } catch (e) {
    console.error('[MarketService] 获取加密货币失败:', e.message);
    return [];
  }
}

// 获取美股行情
async function getUSStocks() {
  try {
    const symbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 'META', 'BRK.B'];
    const result = [];

    for (const symbol of symbols) {
      try {
        const response = await axios.get('https://finnhub.io/api/v1/quote', {
          params: {
            symbol: symbol,
            token: FINNHUB_API_KEY
          },
          timeout: 10000
        });

        const data = response.data;
        if (data.c) {
          result.push({
            symbol: symbol,
            price: data.c,
            change: data.d || 0,
            changePercent: data.dp || 0,
            high: data.h,
            low: data.l,
            open: data.o,
            prevClose: data.pc
          });
        }
      } catch (e) {
        // 单个股票失败继续
      }
    }

    return result;
  } catch (e) {
    console.error('[MarketService] 获取美股失败:', e.message);
    return [];
  }
}

module.exports = {
  getStocks,
  getIndex,
  getForex,
  getCrypto,
  getUSStocks
};
