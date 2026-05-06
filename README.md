# 财讯通 - 全球金融资讯聚合平台

一个专业的金融资讯聚合平台，支持国内外财经新闻实时抓取、A股公告情报分析、自选股管理等功能。

## ✨ 功能特性

### 📰 资讯聚合
- **国内资讯**：新浪财经、东方财富等主流财经媒体
- **国际资讯**：NewsAPI、Finnhub等国际新闻源
- **7×24快讯**：实时财经快讯推送
- **热门排行**：自动生成热门资讯榜单

### 📊 公告情报中心
- **敏感度分级**：高敏感（并购重组、股权变更、业绩预告）、中敏感（回购增持、重大合同、IPO）、低敏感（分红送转、限售解禁）
- **智能分类**：自动识别公告类型并分类展示
- **实时更新**：每20分钟自动抓取最新公告

### 📈 行情数据
- **国内指数**：上证指数、深证成指、创业板指等
- **美股行情**：道琼斯、纳斯达克、标普500
- **汇率数据**：人民币汇率实时更新

### 🎨 用户体验
- **三栏布局**：专业财经终端风格
- **响应式设计**：完美适配PC端和移动端
- **深色模式**：护眼夜间主题
- **收藏功能**：一键收藏感兴趣的文章

## 🛠 技术栈

| 类别 | 技术 |
|------|------|
| 前端框架 | React 18 |
| 构建工具 | Vite 5 |
| 后端框架 | Express.js |
| 数据库 | SQLite (better-sqlite3) |
| 定时任务 | node-cron |
| HTTP客户端 | Axios |

## 📁 项目结构

```
caixuntong/
├── backend/
│   ├── src/
│   │   ├── index.js              # 应用入口
│   │   ├── db.js                 # 数据库配置
│   │   ├── routes/               # API路由
│   │   │   ├── announcements.js  # 公告接口
│   │   │   ├── calendar.js       # 日历接口
│   │   │   ├── favorites.js      # 收藏接口
│   │   │   ├── market.js         # 行情接口
│   │   │   ├── news.js           # 新闻接口
│   │   │   └── watchlist.js      # 自选股接口
│   │   └── services/             # 数据服务
│   │       ├── announcements.js  # 公告抓取
│   │       ├── eastmoney.js      # 东方财富
│   │       ├── fetcher.js        # 抓取调度
│   │       ├── finnhub.js        # Finnhub
│   │       ├── juhe.js           # 聚合数据
│   │       ├── marketService.js  # 行情服务
│   │       ├── newsapi.js        # NewsAPI
│   │       ├── rss.js            # RSS订阅
│   │       └── sina.js           # 新浪财经
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.jsx               # 主应用组件
│   │   ├── index.css             # 全局样式
│   │   └── main.jsx              # 入口文件
│   ├── public/
│   │   └── favicon.svg
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
└── README.md
```

## 🚀 快速开始

### 环境要求

- Node.js >= 18.0.0
- npm >= 9.0.0

### 安装依赖

```bash
# 安装后端依赖
cd backend
npm install

# 安装前端依赖
cd ../frontend
npm install
```

### 配置环境变量

```bash
# 复制环境变量模板
cd backend
cp .env.example .env

# 编辑 .env 文件，填入你的API密钥（可选）
# 不配置也可以运行，部分数据源将不可用
```

### 启动服务

```bash
# 启动后端服务（默认端口3001）
cd backend
npm start

# 启动前端开发服务器（默认端口5173）
cd ../frontend
npm run dev
```

访问 http://localhost:5173 即可使用。

### 生产部署

```bash
# 构建前端
cd frontend
npm run build

# 将 dist 目录部署到静态服务器
# 后端使用 PM2 等进程管理器运行
```

## 🔌 API 接口

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/news` | GET | 获取新闻列表 |
| `/api/news/trending/list` | GET | 获取热门新闻 |
| `/api/news/categories` | GET | 获取新闻分类 |
| `/api/announcements` | GET | 获取公告列表 |
| `/api/announcements/types` | GET | 获取公告类型 |
| `/api/announcements/stats` | GET | 获取公告统计 |
| `/api/market/index` | GET | 获取国内指数 |
| `/api/market/us` | GET | 获取美股行情 |
| `/api/favorites` | GET | 获取收藏列表 |
| `/api/favorites/add` | POST | 添加收藏 |
| `/api/favorites/remove` | DELETE | 取消收藏 |
| `/api/health` | GET | 健康检查 |

## 📝 数据源说明

| 数据源 | 类型 | 说明 |
|--------|------|------|
| 新浪财经 | 免费 | 国内财经新闻 |
| 东方财富 | 免费 | 国内财经新闻、公告 |
| 同花顺 | 免费 | A股公告 |
| 聚合数据 | 需Key | 综合新闻 |
| NewsAPI | 需Key | 国际新闻 |
| Finnhub | 需Key | 国际财经新闻 |

## 📄 License

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！
