# 财讯通 - 全球金融资讯聚合平台

一个专业的金融资讯聚合平台，支持国内外财经新闻、A股公告情报等功能。

## 功能特性

- 📰 国内外金融资讯聚合
- 📊 A股公告情报中心（敏感度分级）
- 🎨 三栏财经终端风格UI
- 📱 移动端响应式适配
- ⏰ 每20分钟自动抓取更新
- ⭐ 支持收藏、搜索等功能

## 技术栈

- 前端: React + Vite
- 后端: Node.js + Express
- 数据库: SQLite (better-sqlite3)

## 快速开始

### 后端

```bash
cd backend
npm install
npm start
```

### 前端

```bash
cd frontend
npm install
npm run dev
```

## 目录结构

```
├── backend/
│   ├── src/
│   │   ├── index.js          # 入口文件
│   │   ├── db.js             # 数据库配置
│   │   ├── routes/           # API路由
│   │   └── services/         # 数据抓取服务
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.jsx           # 主应用
│   │   ├── index.css         # 样式
│   │   └── main.jsx          # 入口
│   └── package.json
└── README.md
```

## License

MIT
