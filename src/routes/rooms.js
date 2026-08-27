const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// GET /rooms/me
router.get('/me', requireAuth, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT h.name AS hostel_name, r.block, r.floor, r.room_number, r.room_type,
              r.capacity, a.bed_space, a.status, a.allocated_at
       FROM allocations a
       JOIN rooms r ON r.id = a.room_id
       JOIN hostels h ON h.id = r.hostel_id
       WHERE a.user_id = $1`,
      [req.userId]
    );
    if (!result.rows[0]) {
      return res.status(404).json({ error: 'No room allocation found yet.' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not fetch room allocation.' });
  }
});

// POST /rooms/preferences
router.post('/preferences', requireAuth, async (req, res) => {
  const { preferredBlock, preferredRoomType, notes } = req.body;
  try {
    const result = await db.query(
      `INSERT INTO room_preferences (user_id, preferred_block, preferred_room_type, notes)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [req.userId, preferredBlock || null, preferredRoomType || null, notes || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not submit room preference.' });
  }
});

// GET /rooms/preferences/me
router.get('/preferences/me', requireAuth, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM room_preferences WHERE user_id = $1 ORDER BY created_at DESC',
      [req.userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not fetch room preferences.' });
  }
});

module.exports = router;
