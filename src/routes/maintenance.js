const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { upload } = require('../middleware/upload');

const router = express.Router();

// POST /maintenance
router.post('/', requireAuth, upload.single('file'), async (req, res) => {
  const { category, description, roomNumber, priority } = req.body;
  if (!category || !description || !roomNumber) {
    return res.status(400).json({ error: 'category, description and roomNumber are required.' });
  }

  const fileUrl = req.file ? `/uploads/${req.file.filename}` : null;

  try {
    const result = await db.query(
      `INSERT INTO maintenance_requests (user_id, category, description, room_number, priority, file_url)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [req.userId, category, description, roomNumber, priority || 'medium', fileUrl]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not submit maintenance request.' });
  }
});

// GET /maintenance/me
router.get('/me', requireAuth, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM maintenance_requests WHERE user_id = $1 ORDER BY created_at DESC',
      [req.userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not fetch maintenance requests.' });
  }
});

// GET /maintenance/:id
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM maintenance_requests WHERE id = $1 AND user_id = $2',
      [req.params.id, req.userId]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Request not found.' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not fetch request.' });
  }
});

module.exports = router;
