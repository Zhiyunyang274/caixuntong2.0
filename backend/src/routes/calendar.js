const express = require('express');
const router = express.Router();

// 财经日历事件数据 (生产环境应从数据库或外部API获取)
const calendarEvents = [
  // IPO事件
  { id: 1, date: '2026-05-10', type: 'ipo', title: '某某科技IPO申购', description: '发行价: 25.00元, 发行量: 5000万股' },
  { id: 2, date: '2026-05-15', type: 'ipo', title: '某某生物IPO上市', description: '发行价: 32.50元, 上市地点: 创业板' },
  { id: 3, date: '2026-05-20', type: 'ipo', title: '某某新能源IPO申购', description: '发行价: 18.00元, 发行量: 8000万股' },

  // 财报日期
  { id: 4, date: '2026-05-08', type: 'earnings', title: '苹果(AAPL)财报发布', description: 'FY2026 Q2 财报' },
  { id: 5, date: '2026-05-10', type: 'earnings', title: '贵州茅台财报发布', description: '2026年一季报' },
  { id: 6, date: '2026-05-12', type: 'earnings', title: '特斯拉(TSLA)财报发布', description: 'FY2026 Q2 财报' },
  { id: 7, date: '2026-05-18', type: 'earnings', title: '阿里巴巴(BABA)财报发布', description: 'FY2026 Q4 财报' },
  { id: 8, date: '2026-05-22', type: 'earnings', title: '腾讯控股财报发布', description: '2026年一季报' },
  { id: 9, date: '2026-05-25', type: 'earnings', title: '英伟达(NVDA)财报发布', description: 'FY2026 Q2 财报' },

  // 重要会议
  { id: 10, date: '2026-05-09', type: 'meeting', title: '美联储FOMC会议', description: '利率决议公布' },
  { id: 11, date: '2026-05-15', type: 'meeting', title: '央行货币政策会议', description: '中国央行利率决议' },
  { id: 12, date: '2026-05-20', type: 'meeting', title: 'OPEC+部长级会议', description: '原油产量政策讨论' },
  { id: 13, date: '2026-05-28', type: 'meeting', title: 'G7财长会议', description: '全球经济政策协调' },

  // 经济数据
  { id: 14, date: '2026-05-11', type: 'economic', title: '美国CPI数据发布', description: '4月消费者物价指数' },
  { id: 15, date: '2026-05-12', type: 'economic', title: '中国GDP数据发布', description: '2026年一季度GDP' },
  { id: 16, date: '2026-05-16', type: 'economic', title: '美国非农数据发布', description: '4月非农就业人数' },
  { id: 17, date: '2026-05-23', type: 'economic', title: '欧元区通胀数据', description: '4月CPI同比' },

  // 分红派息
  { id: 18, date: '2026-05-14', type: 'dividend', title: '贵州茅台分红除权', description: '每10股派发现金红利216.75元' },
  { id: 19, date: '2026-05-21', type: 'dividend', title: '苹果(AAPL)分红日', description: '每股分红$0.24' },
];

// 获取财经事件
router.get('/events', (req, res) => {
  const { startDate, endDate, type } = req.query;

  let filteredEvents = [...calendarEvents];

  // 按日期范围过滤
  if (startDate) {
    filteredEvents = filteredEvents.filter(e => e.date >= startDate);
  }
  if (endDate) {
    filteredEvents = filteredEvents.filter(e => e.date <= endDate);
  }

  // 按事件类型过滤
  if (type && type !== 'all') {
    filteredEvents = filteredEvents.filter(e => e.type === type);
  }

  // 按日期排序
  filteredEvents.sort((a, b) => a.date.localeCompare(b.date));

  res.json({
    success: true,
    data: filteredEvents,
    total: filteredEvents.length
  });
});

// 获取指定日期的事件
router.get('/events/:date', (req, res) => {
  const { date } = req.params;

  const events = calendarEvents.filter(e => e.date === date);

  res.json({
    success: true,
    date,
    data: events
  });
});

// 获取事件类型统计
router.get('/types', (req, res) => {
  const types = [
    { key: 'ipo', label: 'IPO', color: '#8b5cf6', description: '新股发行' },
    { key: 'earnings', label: '财报', color: '#3b82f6', description: '财报发布' },
    { key: 'meeting', label: '会议', color: '#f59e0b', description: '重要会议' },
    { key: 'economic', label: '经济数据', color: '#10b981', description: '经济数据发布' },
    { key: 'dividend', label: '分红', color: '#ef4444', description: '分红派息' },
  ];

  res.json({ types });
});

// 添加事件 (管理员功能)
router.post('/events', (req, res) => {
  const { date, type, title, description } = req.body;

  if (!date || !type || !title) {
    return res.status(400).json({ error: '缺少必要参数' });
  }

  const newEvent = {
    id: calendarEvents.length + 1,
    date,
    type,
    title,
    description: description || ''
  };

  calendarEvents.push(newEvent);
  calendarEvents.sort((a, b) => a.date.localeCompare(b.date));

  res.json({
    success: true,
    message: '事件添加成功',
    data: newEvent
  });
});

module.exports = router;