const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { upload } = require('../middleware/upload');

const router = express.Router();

// POST /complaints
router.post('/', requireAuth, upload.single('attachment'), async (req, res) => {
  const { category, subject, description } = req.body;
  if (!category || !subject || !description) {
    return res.status(400).json({ error: 'category, subject and description are required.' });
  }

  const attachmentUrl = req.file ? `/uploads/${req.file.filename}` : null;

  try {
    const result = await db.query(
      `INSERT INTO complaints (user_id, category, subject, description, attachment_url)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [req.userId, category, subject, description, attachmentUrl]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not submit complaint.' });
  }
});

// GET /complaints/me
router.get('/me', requireAuth, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM complaints WHERE user_id = $1 ORDER BY created_at DESC',
      [req.userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not fetch complaints.' });
  }
});

// GET /complaints/:id
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM complaints WHERE id = $1 AND user_id = $2',
      [req.params.id, req.userId]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Complaint not found.' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not fetch complaint.' });
  }
});

module.exports = router;
