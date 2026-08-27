const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// GET /dashboard
// Single call that returns everything the student dashboard needs, so the
// frontend does not have to fire off six separate requests on page load.
router.get('/', requireAuth, async (req, res) => {
  const userId = req.userId;

  try {
    const [user, room, fee, clearance, maintenanceCount, complaintCount, visitors, announcements] =
      await Promise.all([
        db.query('SELECT id, full_name, student_id FROM users WHERE id = $1', [userId]),
        db.query(
          `SELECT h.name AS hostel_name, r.block, r.room_number, a.bed_space
           FROM allocations a
           JOIN rooms r ON r.id = a.room_id
           JOIN hostels h ON h.id = r.hostel_id
           WHERE a.user_id = $1`,
          [userId]
        ),
        db.query('SELECT amount_due, amount_paid, deadline, status FROM fees WHERE user_id = $1', [userId]),
        db.query('SELECT * FROM clearance WHERE user_id = $1', [userId]),
        db.query(
          `SELECT count(*) FROM maintenance_requests WHERE user_id = $1 AND status NOT IN ('resolved', 'closed')`,
          [userId]
        ),
        db.query(
          `SELECT count(*) FROM complaints WHERE user_id = $1 AND status NOT IN ('resolved', 'closed')`,
          [userId]
        ),
        db.query(
          `SELECT * FROM visitors WHERE user_id = $1 AND visit_date >= CURRENT_DATE
           ORDER BY visit_date ASC LIMIT 5`,
          [userId]
        ),
        db.query('SELECT * FROM announcements ORDER BY created_at DESC LIMIT 3'),
      ]);

    let clearanceRecord = clearance.rows[0] || null;
    let finalClearanceStatus = null;
    if (clearanceRecord) {
      const statuses = [
        clearanceRecord.hostel_fee_status,
        clearanceRecord.room_status,
        clearanceRecord.maintenance_status,
        clearanceRecord.key_return_status,
      ];
      finalClearanceStatus = statuses.every((s) => s === 'cleared')
        ? 'cleared'
        : statuses.some((s) => s === 'not_cleared')
        ? 'not_cleared'
        : 'pending';
    }

    res.json({
      student: user.rows[0] || null,
      room: room.rows[0] || null,
      fee: fee.rows[0] || null,
      clearance: clearanceRecord ? { ...clearanceRecord, final_status: finalClearanceStatus } : null,
      pendingMaintenanceCount: Number(maintenanceCount.rows[0].count),
      activeComplaintCount: Number(complaintCount.rows[0].count),
      upcomingVisitors: visitors.rows,
      announcements: announcements.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not load dashboard.' });
  }
});

module.exports = router;
