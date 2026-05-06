import { useState, useEffect, useCallback } from 'react'
import './index.css'

export default function App() {
  const [darkMode, setDarkMode] = useState(false)
  const [region, setRegion] = useState('domestic')
  const [category, setCategory] = useState('')
  const [articles, setArticles] = useState([])
  const [categories, setCategories] = useState({ domestic: [], international: [] })
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [dateRange, setDateRange] = useState({ earliest: '', latest: '', total: 0 })
  const [marketIndex, setMarketIndex] = useState([])
  const [usStocks, setUsStocks] = useState([])
  const [trendingNews, setTrendingNews] = useState([])
  const [calendarEvents, setCalendarEvents] = useState([])
  const [flashNews, setFlashNews] = useState([])
  const [favorites, setFavorites] = useState([])
  const [currentPage, setCurrentPage] = useState('home')
  const [showMobileSidebar, setShowMobileSidebar] = useState(false)

  // 公告相关状态
  const [announcements, setAnnouncements] = useState([])
  const [annTypes, setAnnTypes] = useState([])
  const [annCategory, setAnnCategory] = useState('')
  const [annLevel, setAnnLevel] = useState('')
  const [annStats, setAnnStats] = useState({ total: 0, byCategory: [] })
  const [annLoading, setAnnLoading] = useState(false)
  const [annPage, setAnnPage] = useState(1)
  const [annTotal, setAnnTotal] = useState(0)

  useEffect(() => {
    fetch('/api/news/categories').then(res => res.json()).then(setCategories).catch(console.error)
    fetch('/api/announcements/types').then(res => res.json()).then(setAnnTypes).catch(console.error)
  }, [])

  const fetchDateRange = useCallback(async () => {
    try { const res = await fetch('/api/news/date-range'); setDateRange(await res.json()) } catch (e) { console.error(e) }
  }, [])

  const fetchMarketData = useCallback(async () => {
    try {
      if (region === 'domestic') {
        const idx = await fetch('/api/market/index').then(r => r.json())
        setMarketIndex(idx.data || [])
        setUsStocks([])
      } else {
        const us = await fetch('/api/market/us').then(r => r.json())
        setUsStocks(us.data || [])
        setMarketIndex([])
      }
    } catch (e) { console.error(e) }
  }, [region])

  const fetchTrending = useCallback(async () => {
    try { const res = await fetch(`/api/news/trending/list?region=${region}&limit=8`); setTrendingNews(await res.json()) } catch (e) { console.error(e) }
  }, [region])

  const fetchCalendar = useCallback(async () => {
    try { const res = await fetch('/api/calendar/events'); setCalendarEvents((await res.json()).data || []) } catch (e) { console.error(e) }
  }, [])

  const fetchFlashNews = useCallback(async () => {
    try { const res = await fetch(`/api/news?region=${region}&pageSize=15&sort=latest`); setFlashNews((await res.json()).articles || []) } catch (e) { console.error(e) }
  }, [region])

  const fetchFavorites = useCallback(async () => {
    try { const res = await fetch('/api/favorites'); setFavorites(await res.json()) } catch (e) { console.error(e) }
  }, [])

  const fetchNews = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ region, category, page: page.toString(), pageSize: '20', ...(searchQuery && { q: searchQuery }) })
      const data = await (await fetch(`/api/news?${params}`)).json()
      setArticles(data.articles || [])
      setTotal(data.total || 0)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [region, category, page, searchQuery])

  const fetchAnnouncements = useCallback(async () => {
    setAnnLoading(true)
    try {
      const params = new URLSearchParams({ page: annPage.toString(), pageSize: '30' })
      if (annCategory) params.append('category', annCategory)
      if (annLevel) params.append('level', annLevel)
      const data = await (await fetch(`/api/announcements?${params}`)).json()
      setAnnouncements(data.announcements || [])
      setAnnTotal(data.total || 0)
    } catch (e) { console.error(e) }
    finally { setAnnLoading(false) }
  }, [annCategory, annLevel, annPage])

  const fetchAnnStats = useCallback(async () => {
    try { const res = await fetch('/api/announcements/stats'); setAnnStats(await res.json()) } catch (e) { console.error(e) }
  }, [])

  useEffect(() => { fetchMarketData(); fetchTrending(); fetchCalendar(); fetchFavorites(); fetchDateRange(); fetchFlashNews(); fetchAnnStats() }, [])
  useEffect(() => { fetchNews() }, [fetchNews])
  useEffect(() => { setCategory(''); setPage(1); fetchMarketData(); fetchTrending(); fetchFlashNews() }, [region])
  useEffect(() => { fetchAnnouncements() }, [fetchAnnouncements])

  useEffect(() => {
    const interval = setInterval(() => { fetchFlashNews() }, 20 * 60 * 1000)
    return () => clearInterval(interval)
  }, [fetchFlashNews])

  const toggleDarkMode = () => {
    const newMode = !darkMode
    setDarkMode(newMode)
    document.documentElement.setAttribute('data-theme', newMode ? 'dark' : 'light')
    localStorage.setItem('theme', newMode ? 'dark' : 'light')
  }

  const addFavorite = async (id) => { await fetch('/api/favorites/add', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ articleId: id }) }); fetchFavorites() }
  const removeFavorite = async (id) => { await fetch('/api/favorites/remove', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ articleId: id }) }); fetchFavorites() }
  const isFavorited = (id) => favorites.some(f => f.id === id)

  const shareArticle = (article) => {
    const url = article.url || window.location.href
    try { navigator.clipboard.writeText(url); alert('链接已复制') } catch (e) { alert('链接: ' + url) }
  }

  const getTimeAgo = (dateStr) => {
    if (!dateStr) return ''
    const diff = Date.now() - new Date(dateStr)
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return '刚刚'
    if (mins < 60) return `${mins}分钟前`
    if (mins < 1440) return `${Math.floor(mins / 60)}小时前`
    return new Date(dateStr).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })
  }

  const formatTime = (dateStr) => {
    if (!dateStr) return '--:--'
    const d = new Date(dateStr)
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
  }

  const extractTags = (title) => {
    const tags = []
    const keywords = {
      'IPO': /IPO|上市|新股/, 'AI': /AI|人工智能|ChatGPT|大模型/, '美股': /美股|纳斯达克|纽交所|道琼斯/,
      '数字货币': /比特币|以太坊|加密货币|区块链|BTC|ETH/, '外汇': /汇率|人民币|美元|欧元|日元/,
      '基金': /基金|ETF|公募|私募/, '财报': /财报|业绩|营收|利润/, '并购': /并购|收购|重组/,
    }
    for (const [tag, pattern] of Object.entries(keywords)) {
      if (pattern.test(title) && tags.length < 2) tags.push(tag)
    }
    return tags
  }

  const cats = region === 'domestic' ? categories.domestic : categories.international
  const headline = articles[0]
  const newsList = articles.slice(1)

  // 公告敏感度标签
  const levelLabels = { high: '高敏感', medium: '中敏感', low: '低敏感' }

  // 公告情报页 - 与首页风格一致
  if (currentPage === 'announcements') {
    return (
      <div className="workspace">
        <header className="topbar">
          <div className="topbar-left">
            <div className="logo">
              <span className="logo-icon">◈</span>
              <span className="logo-text">财讯通</span>
            </div>
            <span className="page-title" style={{ borderLeft: '1px solid var(--border-light)', paddingLeft: 16, marginLeft: 8 }}>公告情报</span>
          </div>
          <div className="topbar-center">
            <div className="category-tabs">
              <button className={!annLevel ? 'active' : ''} onClick={() => setAnnLevel('')}>全部</button>
              <button className={annLevel === 'high' ? 'active' : ''} onClick={() => setAnnLevel('high')}>高敏感</button>
              <button className={annLevel === 'medium' ? 'active' : ''} onClick={() => setAnnLevel('medium')}>中敏感</button>
              <button className={annLevel === 'low' ? 'active' : ''} onClick={() => setAnnLevel('low')}>低敏感</button>
            </div>
          </div>
          <div className="topbar-right">
            <span className="data-info">今日 {annStats.total} 条</span>
            <button className="icon-btn" onClick={() => setCurrentPage('home')} title="返回首页">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>
            </button>
            <button className="icon-btn" onClick={toggleDarkMode}>{darkMode ? '☀' : '☾'}</button>
          </div>
        </header>

        {/* 移动端敏感度筛选栏 */}
        <div className="mobile-category-bar">
          <div className="mobile-category-scroll">
            <button className={!annLevel ? 'active' : ''} onClick={() => setAnnLevel('')}>全部</button>
            <button className={annLevel === 'high' ? 'active' : ''} onClick={() => setAnnLevel('high')}>高敏感</button>
            <button className={annLevel === 'medium' ? 'active' : ''} onClick={() => setAnnLevel('medium')}>中敏感</button>
            <button className={annLevel === 'low' ? 'active' : ''} onClick={() => setAnnLevel('low')}>低敏感</button>
          </div>
        </div>

        {/* 移动端公告类型筛选栏 */}
        <div className="mobile-category-bar" style={{ borderTop: 'none' }}>
          <div className="mobile-category-scroll">
            <button className={!annCategory ? 'active' : ''} onClick={() => setAnnCategory('')}>全部类型</button>
            {annTypes.slice(0, 6).map(t => (
              <button key={t.key} className={annCategory === t.key ? 'active' : ''} onClick={() => setAnnCategory(t.key)}>{t.label}</button>
            ))}
          </div>
        </div>

        <main className="main-workspace">
          {/* 左栏：分类筛选 */}
          <aside className="left-panel">
            <section className="panel-section">
              <div className="section-header"><h3>公告类型</h3></div>
              <div className="trending-list">
                <a className={`trending-item ${!annCategory ? 'active' : ''}`} onClick={() => setAnnCategory('')}>
                  <span className="trending-title">全部公告</span>
                  <span className="trending-count">{annStats.total}</span>
                </a>
                {annTypes.map(t => {
                  const count = annStats.byCategory.filter(s => s.category === t.key).reduce((a, s) => a + s.count, 0)
                  return (
                    <a key={t.key} className={`trending-item ${annCategory === t.key ? 'active' : ''}`} onClick={() => setAnnCategory(t.key)}>
                      <span className="trending-title">{t.label}</span>
                      <span className="trending-count">{count}</span>
                    </a>
                  )
                })}
              </div>
            </section>

            <section className="panel-section">
              <div className="section-header"><h3>敏感度分布</h3></div>
              <div className="index-grid">
                <div className="index-item">
                  <span className="index-name" style={{ color: 'var(--rise)' }}>高敏感</span>
                  <span className="index-value">{annStats.byCategory.filter(s => s.level === 'high').reduce((a, s) => a + s.count, 0)}</span>
                </div>
                <div className="index-item">
                  <span className="index-name" style={{ color: '#f59e0b' }}>中敏感</span>
                  <span className="index-value">{annStats.byCategory.filter(s => s.level === 'medium').reduce((a, s) => a + s.count, 0)}</span>
                </div>
                <div className="index-item">
                  <span className="index-name" style={{ color: 'var(--fall)' }}>低敏感</span>
                  <span className="index-value">{annStats.byCategory.filter(s => s.level === 'low').reduce((a, s) => a + s.count, 0)}</span>
                </div>
              </div>
            </section>
          </aside>

          {/* 中栏：公告列表 */}
          <section className="center-panel">
            {annLoading ? (
              <div className="loading-state">加载中...</div>
            ) : announcements.length === 0 ? (
              <div className="empty-state">暂无公告数据</div>
            ) : (
              <>
                <div className="news-stream">
                  {announcements.map(a => (
                    <article key={a.id} className="news-item">
                      <div className="news-left">
                        <span className="news-time">{formatTime(a.publish_time)}</span>
                      </div>
                      <div className="news-content">
                        <div className="news-meta">
                          <a href={a.url} target="_blank" rel="noopener noreferrer" className="news-title">{a.title}</a>
                        </div>
                        <div className="news-footer">
                          {a.stock_name && <span className="news-source">{a.stock_name}</span>}
                          <span className="news-source">{annTypes.find(t => t.key === a.category)?.label || ''}</span>
                          <span className="news-source" style={{ color: a.level === 'high' ? 'var(--rise)' : a.level === 'medium' ? '#f59e0b' : 'var(--fall)' }}>
                            {levelLabels[a.level] || ''}
                          </span>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>

                {annTotal > 30 && (
                  <div className="pagination">
                    <button onClick={() => setAnnPage(p => Math.max(1, p - 1))} disabled={annPage === 1}>上一页</button>
                    <span className="page-info">{annPage} / {Math.ceil(annTotal / 30)}</span>
                    <button onClick={() => setAnnPage(p => Math.min(Math.ceil(annTotal / 30), p + 1))} disabled={annPage >= Math.ceil(annTotal / 30)}>下一页</button>
                  </div>
                )}
              </>
            )}
          </section>

          {/* 右栏：快讯 */}
          <aside className="right-panel">
            <section className="panel-section flash-news">
              <div className="section-header">
                <h3>7×24 快讯</h3>
                <span className="live-indicator">● LIVE</span>
              </div>
              <div className="flash-timeline">
                {flashNews.slice(0, 12).map(n => (
                  <div key={n.id} className="flash-item">
                    <span className="flash-time">{formatTime(n.published_at)}</span>
                    <a href={n.url} target="_blank" rel="noopener noreferrer" className="flash-title">{n.title}</a>
                  </div>
                ))}
              </div>
            </section>
          </aside>
        </main>

        <footer className="footer">
          <a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer">粤ICP备2026032380号-1</a>
        </footer>
      </div>
    )
  }

  // 收藏页
  if (currentPage === 'favorites') {
    return (
      <div className="page-favorites">
        <header className="topbar">
          <div className="topbar-inner">
            <button className="back-btn" onClick={() => setCurrentPage('home')}>← 返回</button>
            <span className="page-title">我的收藏</span>
          </div>
        </header>
        <main className="favorites-main">
          {favorites.length === 0 ? (
            <div className="empty-state">暂无收藏</div>
          ) : (
            <div className="favorites-list">
              {favorites.map(a => (
                <div key={a.id} className="favorite-item">
                  <div className="item-meta">
                    <span className="item-source">{a.source_name}</span>
                    <span className="item-time">{getTimeAgo(a.published_at)}</span>
                  </div>
                  <a href={a.url} target="_blank" rel="noopener noreferrer" className="item-title">{a.title}</a>
                  <div className="item-actions">
                    <button onClick={() => removeFavorite(a.id)} className="action-btn remove">取消收藏</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    )
  }

  // 主工作台
  return (
    <div className="workspace">
      <header className="topbar">
        <div className="topbar-left">
          <div className="logo">
            <span className="logo-icon">◈</span>
            <span className="logo-text">财讯通</span>
          </div>
          <div className="region-switch">
            <button className={region === 'domestic' ? 'active' : ''} onClick={() => setRegion('domestic')}>国内</button>
            <button className={region === 'international' ? 'active' : ''} onClick={() => setRegion('international')}>国际</button>
          </div>
        </div>
        <div className="topbar-center">
          <div className="search-box">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
            <input type="text" placeholder="搜索资讯..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && fetchNews()} />
          </div>
          <div className="category-tabs">
            <button className={!category ? 'active' : ''} onClick={() => setCategory('')}>全部</button>
            {cats.slice(0, 5).map(c => (
              <button key={c.key} className={category === c.key ? 'active' : ''} onClick={() => setCategory(c.key)}>{c.label}</button>
            ))}
          </div>
        </div>
        <div className="topbar-right">
          <span className="data-info">共 {dateRange.total || total} 条 · {dateRange.latest || '今日'}</span>
          <button className="icon-btn ann-btn" onClick={() => setCurrentPage('announcements')} title="公告">公告</button>
          <button className="icon-btn mobile-menu-btn" onClick={() => setShowMobileSidebar(true)} title="菜单">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12h18M3 6h18M3 18h18" strokeLinecap="round"/></svg>
          </button>
          <button className="icon-btn" onClick={() => setCurrentPage('favorites')} title="收藏">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg>
          </button>
          <button className="icon-btn" onClick={toggleDarkMode} title="主题">{darkMode ? '☀' : '☾'}</button>
        </div>
      </header>

      <div className="mobile-category-bar">
        <div className="mobile-category-scroll">
          <button className={!category ? 'active' : ''} onClick={() => setCategory('')}>全部</button>
          {cats.map(c => (
            <button key={c.key} className={category === c.key ? 'active' : ''} onClick={() => setCategory(c.key)}>{c.label}</button>
          ))}
        </div>
      </div>

      {showMobileSidebar && <div className="sidebar-overlay" onClick={() => setShowMobileSidebar(false)} />}

      <aside className={`mobile-sidebar ${showMobileSidebar ? 'show' : ''}`}>
        <div className="mobile-sidebar-header">
          <span className="sidebar-title">资讯面板</span>
          <button className="close-btn" onClick={() => setShowMobileSidebar(false)}>✕</button>
        </div>
        <div className="mobile-sidebar-content">
          <section className="panel-section">
            <div className="section-header"><h3>{region === 'domestic' ? '国内行情' : '美股行情'}</h3></div>
            {region === 'domestic' && marketIndex.length > 0 && (
              <div className="index-grid">
                {marketIndex.map(idx => (
                  <div key={idx.code} className="index-item">
                    <span className="index-name">{idx.name}</span>
                    <span className="index-value">{idx.price?.toFixed(2)}</span>
                    <span className={`index-change ${idx.changePercent >= 0 ? 'up' : 'down'}`}>{idx.changePercent >= 0 ? '+' : ''}{idx.changePercent?.toFixed(2)}%</span>
                  </div>
                ))}
              </div>
            )}
          </section>
          <section className="panel-section">
            <div className="section-header"><h3>热门资讯</h3></div>
            <div className="trending-list">
              {trendingNews.map((n, i) => (
                <a key={n.id} href={n.url} target="_blank" rel="noopener noreferrer" className="trending-item">
                  <span className={`rank ${i < 3 ? 'top' : ''}`}>{i + 1}</span>
                  <span className="trending-title">{n.title}</span>
                </a>
              ))}
            </div>
          </section>
          <section className="panel-section flash-news">
            <div className="section-header"><h3>7×24 快讯</h3><span className="live-indicator">● LIVE</span></div>
            <div className="flash-timeline">
              {flashNews.slice(0, 8).map(n => (
                <div key={n.id} className="flash-item">
                  <span className="flash-time">{formatTime(n.published_at)}</span>
                  <a href={n.url} target="_blank" rel="noopener noreferrer" className="flash-title">{n.title}</a>
                </div>
              ))}
            </div>
          </section>
        </div>
      </aside>

      <main className="main-workspace">
        <aside className="left-panel">
          <section className="panel-section">
            <div className="section-header"><h3>{region === 'domestic' ? '国内行情' : '美股行情'}</h3></div>
            {region === 'domestic' && marketIndex.length > 0 && (
              <div className="index-grid">
                {marketIndex.map(idx => (
                  <div key={idx.code} className="index-item">
                    <span className="index-name">{idx.name}</span>
                    <span className="index-value">{idx.price?.toFixed(2)}</span>
                    <span className={`index-change ${idx.changePercent >= 0 ? 'up' : 'down'}`}>{idx.changePercent >= 0 ? '+' : ''}{idx.changePercent?.toFixed(2)}%</span>
                  </div>
                ))}
              </div>
            )}
          </section>
          <section className="panel-section">
            <div className="section-header"><h3>热门资讯</h3></div>
            <div className="trending-list">
              {trendingNews.map((n, i) => (
                <a key={n.id} href={n.url} target="_blank" rel="noopener noreferrer" className="trending-item">
                  <span className={`rank ${i < 3 ? 'top' : ''}`}>{i + 1}</span>
                  <span className="trending-title">{n.title}</span>
                </a>
              ))}
            </div>
          </section>
          <section className="panel-section">
            <div className="section-header"><h3>财经日历</h3></div>
            <div className="calendar-list">
              {calendarEvents.slice(0, 5).map(e => (
                <div key={e.id} className="calendar-item">
                  <span className="cal-date">{e.date?.slice(5)}</span>
                  <span className="cal-title">{e.title}</span>
                </div>
              ))}
            </div>
          </section>
        </aside>

        <section className="center-panel">
          {loading ? (
            <div className="loading-state">加载中...</div>
          ) : (
            <>
              {headline && (
                <article className="headline-article">
                  <div className="headline-meta">
                    <span className="headline-source">{headline.source_name}</span>
                    <span className="headline-time">{getTimeAgo(headline.published_at)}</span>
                    {extractTags(headline.title).map(t => <span key={t} className="tag">{t}</span>)}
                  </div>
                  <h1 className="headline-title"><a href={headline.url} target="_blank" rel="noopener noreferrer">{headline.title}</a></h1>
                  {headline.description && <p className="headline-summary">{headline.description.replace(/<[^>]*>/g, '').substring(0, 200)}</p>}
                  <div className="headline-actions">
                    <button onClick={() => isFavorited(headline.id) ? removeFavorite(headline.id) : addFavorite(headline.id)} className={`action-btn ${isFavorited(headline.id) ? 'favorited' : ''}`}>{isFavorited(headline.id) ? '★ 已收藏' : '☆ 收藏'}</button>
                    <button onClick={() => shareArticle(headline)} className="action-btn">分享</button>
                  </div>
                </article>
              )}
              <div className="news-stream">
                {newsList.map(a => {
                  const tags = extractTags(a.title)
                  return (
                    <article key={a.id} className="news-item">
                      <div className="news-left"><span className="news-time">{formatTime(a.published_at)}</span></div>
                      <div className="news-content">
                        <div className="news-meta"><a href={a.url} target="_blank" rel="noopener noreferrer" className="news-title">{a.title}</a></div>
                        <div className="news-footer">
                          <span className="news-source">{a.source_name}</span>
                          {tags.map(t => <span key={t} className="mini-tag">{t}</span>)}
                          <div className="news-actions">
                            <button onClick={() => isFavorited(a.id) ? removeFavorite(a.id) : addFavorite(a.id)} className={`mini-btn ${isFavorited(a.id) ? 'active' : ''}`}>{isFavorited(a.id) ? '★' : '☆'}</button>
                            <button onClick={() => shareArticle(a)} className="mini-btn" title="分享">↗</button>
                          </div>
                        </div>
                      </div>
                    </article>
                  )
                })}
              </div>
              {total > 20 && (
                <div className="pagination">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>上一页</button>
                  <span className="page-info">{page} / {Math.ceil(total / 20)}</span>
                  <button onClick={() => setPage(p => Math.min(Math.ceil(total / 20), p + 1))} disabled={page >= Math.ceil(total / 20)}>下一页</button>
                </div>
              )}
            </>
          )}
        </section>

        <aside className="right-panel">
          <section className="panel-section flash-news">
            <div className="section-header"><h3>7×24 快讯</h3><span className="live-indicator">● LIVE</span></div>
            <div className="flash-timeline">
              {flashNews.slice(0, 12).map(n => (
                <div key={n.id} className="flash-item">
                  <span className="flash-time">{formatTime(n.published_at)}</span>
                  <a href={n.url} target="_blank" rel="noopener noreferrer" className="flash-title">{n.title}</a>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </main>

      <footer className="footer">
        <a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer">粤ICP备2026032380号-1</a>
      </footer>
    </div>
  )
}
