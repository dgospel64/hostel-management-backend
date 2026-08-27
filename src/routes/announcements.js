const express = require('express');
const db = require('../db');

const router = express.Router();

// GET /announcements
// Public to any logged-in student; not scoped to a single user, so no auth
// requirement here beyond being reachable from the app (add requireAuth if
// announcements should be private to registered students only).
router.get('/', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM announcements ORDER BY created_at DESC LIMIT 50');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not fetch announcements.' });
  }
});

module.exports = router;
