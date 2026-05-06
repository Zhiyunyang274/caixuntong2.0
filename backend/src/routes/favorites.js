const express = require('express');
const router = express.Router();
const { getDB } = require('../db');

// GET /api/favorites - 获取收藏列表
router.get('/', (req, res) => {
  try {
    const db = getDB();
    const favorites = db.prepare(`
      SELECT a.* FROM articles a
      INNER JOIN favorites f ON a.id = f.article_id
      ORDER BY f.created_at DESC
    `).all();
    res.json(favorites);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// POST /api/favorites/add - 添加收藏
router.post('/add', (req, res) => {
  try {
    const db = getDB();
    const { articleId } = req.body;

    if (!articleId) {
      return res.status(400).json({ error: '缺少文章ID' });
    }

    // 检查文章是否存在
    const article = db.prepare('SELECT id FROM articles WHERE id = ?').get(articleId);
    if (!article) {
      return res.status(404).json({ error: '文章不存在' });
    }

    // 检查是否已收藏
    const existing = db.prepare('SELECT id FROM favorites WHERE article_id = ?').get(articleId);
    if (existing) {
      return res.status(400).json({ error: '已收藏该文章' });
    }

    // 添加收藏
    db.prepare('INSERT INTO favorites (article_id, created_at) VALUES (?, CURRENT_TIMESTAMP)').run(articleId);
    res.json({ success: true, message: '收藏成功' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// DELETE /api/favorites/remove - 删除收藏
router.delete('/remove', (req, res) => {
  try {
    const db = getDB();
    const { articleId } = req.body;

    if (!articleId) {
      return res.status(400).json({ error: '缺少文章ID' });
    }

    const result = db.prepare('DELETE FROM favorites WHERE article_id = ?').run(articleId);

    if (result.changes === 0) {
      return res.status(404).json({ error: '收藏记录不存在' });
    }

    res.json({ success: true, message: '取消收藏成功' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// GET /api/favorites/check/:id - 检查是否已收藏
router.get('/check/:id', (req, res) => {
  try {
    const db = getDB();
    const favorite = db.prepare('SELECT id FROM favorites WHERE article_id = ?').get(req.params.id);
    res.json({ isFavorited: !!favorite });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '服务器错误' });
  }
});

module.exports = router;