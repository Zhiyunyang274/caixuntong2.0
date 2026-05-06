const Database = require('better-sqlite3');
const path = require('path');

let db = null;

function initDB() {
  const dbPath = path.join(__dirname, '..', 'data', 'news.db');
  db = new Database(dbPath);

  // 启用 WAL 模式提升性能
  db.pragma('journal_mode = WAL');

  // 创建文章表
  db.exec(`
    CREATE TABLE IF NOT EXISTS articles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      article_id TEXT UNIQUE,
      title TEXT NOT NULL,
      description TEXT,
      content TEXT,
      url TEXT,
      image_url TEXT,
      source_name TEXT,
      source_region TEXT DEFAULT 'domestic',
      source_type TEXT DEFAULT 'news',
      category TEXT,
      published_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_category ON articles(category);
    CREATE INDEX IF NOT EXISTS idx_source_region ON articles(source_region);
    CREATE INDEX IF NOT EXISTS idx_published_at ON articles(published_at);
  `);

  // 删除重复标题后创建唯一索引
  try {
    db.exec(`
      DELETE FROM articles WHERE id NOT IN (SELECT MIN(id) FROM articles GROUP BY title);
      DROP INDEX IF EXISTS idx_title_unique;
      CREATE UNIQUE INDEX idx_title_unique ON articles(title);
    `);
  } catch (e) {
    console.warn('[DB] 创建唯一索引时警告:', e.message);
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS favorites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      article_id INTEGER NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
      UNIQUE(article_id)
    );

    CREATE TABLE IF NOT EXISTS announcements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ann_id TEXT UNIQUE,
      title TEXT NOT NULL,
      stock_code TEXT,
      stock_name TEXT,
      category TEXT,
      level TEXT,
      summary TEXT,
      url TEXT,
      publish_time TEXT,
      source TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_ann_category ON announcements(category);
    CREATE INDEX IF NOT EXISTS idx_ann_level ON announcements(level);
    CREATE INDEX IF NOT EXISTS idx_ann_stock ON announcements(stock_code);
    CREATE INDEX IF NOT EXISTS idx_ann_time ON announcements(publish_time);
  `);

  console.log('[DB] 数据库初始化完成');
  return db;
}

function getDB() {
  if (!db) throw new Error('数据库未初始化');
  return db;
}

module.exports = { initDB, getDB };
