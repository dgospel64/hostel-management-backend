const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// GET /clearance/me
router.get('/me', requireAuth, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM clearance WHERE user_id = $1', [req.userId]);
    const record = result.rows[0];
    if (!record) return res.status(404).json({ error: 'No clearance record found.' });

    const statuses = [
      record.hostel_fee_status,
      record.room_status,
      record.maintenance_status,
      record.key_return_status,
    ];
    const finalStatus = statuses.every((s) => s === 'cleared')
      ? 'cleared'
      : statuses.some((s) => s === 'not_cleared')
      ? 'not_cleared'
      : 'pending';

    res.json({ ...record, final_status: finalStatus });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not fetch clearance status.' });
  }
});

module.exports = router;
