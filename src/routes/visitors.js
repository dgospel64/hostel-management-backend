const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// POST /visitors
router.post('/', requireAuth, async (req, res) => {
  const { name, phone, visitDate, arrivalTime, purpose } = req.body;
  if (!name || !phone || !visitDate || !arrivalTime) {
    return res.status(400).json({ error: 'name, phone, visitDate and arrivalTime are required.' });
  }

  try {
    const result = await db.query(
      `INSERT INTO visitors (user_id, name, phone, visit_date, arrival_time, purpose)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [req.userId, name, phone, visitDate, arrivalTime, purpose || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not register visitor.' });
  }
});

// GET /visitors/me
router.get('/me', requireAuth, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM visitors WHERE user_id = $1 ORDER BY visit_date DESC',
      [req.userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not fetch visitors.' });
  }
});

// DELETE /visitors/:id
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const result = await db.query(
      `UPDATE visitors SET status = 'rejected'
       WHERE id = $1 AND user_id = $2 AND status = 'pending_approval'
       RETURNING *`,
      [req.params.id, req.userId]
    );
    if (!result.rows[0]) {
      return res.status(400).json({ error: 'Visitor request cannot be cancelled (not found or already processed).' });
    }
    res.json({ message: 'Visitor request cancelled.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not cancel visitor request.' });
  }
});

module.exports = router;
