const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const db = require('../db');
const { signToken } = require('../utils/token');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

function sanitizeUser(user) {
  const { password_hash, ...rest } = user;
  return rest;
}

// POST /auth/register
router.post('/register', async (req, res) => {
  const { fullName, studentId, email, phone, department, level, gender, password } = req.body;

  if (!fullName || !studentId || !email || !password) {
    return res.status(400).json({ error: 'fullName, studentId, email and password are required.' });
  }

  try {
    const existing = await db.query(
      'SELECT id FROM users WHERE email = $1 OR student_id = $2',
      [email, studentId]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'A student with this email or student ID already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const result = await db.query(
      `INSERT INTO users (full_name, student_id, email, phone, department, level, gender, password_hash)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [fullName, studentId, email, phone || null, department || null, level || null, gender || null, passwordHash]
    );

    // Every new student gets a blank clearance record so /clearance/me never 404s.
    await db.query('INSERT INTO clearance (user_id) VALUES ($1)', [result.rows[0].id]);

    const user = result.rows[0];
    const token = signToken(user);
    res.status(201).json({ token, user: sanitizeUser(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not register student.' });
  }
});

// POST /auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required.' });
  }

  try {
    const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = signToken(user);
    res.json({ token, user: sanitizeUser(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not log in.' });
  }
});

// POST /auth/forgot-password
// MVP stand-in: returns the raw reset token in the response instead of emailing it.
// Swap this for a real email send (e.g. via Resend or SendGrid) before shipping to real users.
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'email is required.' });

  try {
    const result = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    const user = result.rows[0];

    // Always respond the same way whether or not the email exists, to avoid leaking
    // which emails are registered.
    if (!user) {
      return res.json({ message: 'If that email is registered, a reset link has been generated.' });
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await db.query(
      'INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
      [user.id, tokenHash, expiresAt]
    );

    res.json({
      message: 'If that email is registered, a reset link has been generated.',
      devResetToken: rawToken, // remove this field once real email delivery is wired up
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not process request.' });
  }
});

// POST /auth/reset-password
router.post('/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword) {
    return res.status(400).json({ error: 'token and newPassword are required.' });
  }

  try {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const result = await db.query(
      `SELECT * FROM password_reset_tokens
       WHERE token_hash = $1 AND used = false AND expires_at > now()`,
      [tokenHash]
    );
    const record = result.rows[0];
    if (!record) {
      return res.status(400).json({ error: 'Reset token is invalid or expired.' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, record.user_id]);
    await db.query('UPDATE password_reset_tokens SET used = true WHERE id = $1', [record.id]);

    res.json({ message: 'Password reset successfully.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not reset password.' });
  }
});

// GET /auth/me
router.get('/me', requireAuth, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM users WHERE id = $1', [req.userId]);
    if (!result.rows[0]) return res.status(404).json({ error: 'User not found.' });
    res.json(sanitizeUser(result.rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not fetch profile.' });
  }
});

// PATCH /auth/profile
router.patch('/profile', requireAuth, async (req, res) => {
  const { phone, department, level, profilePhotoUrl } = req.body;
  try {
    const result = await db.query(
      `UPDATE users
       SET phone = COALESCE($1, phone),
           department = COALESCE($2, department),
           level = COALESCE($3, level),
           profile_photo_url = COALESCE($4, profile_photo_url)
       WHERE id = $5
       RETURNING *`,
      [phone, department, level, profilePhotoUrl, req.userId]
    );
    res.json(sanitizeUser(result.rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not update profile.' });
  }
});

// PATCH /auth/change-password
router.patch('/change-password', requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'currentPassword and newPassword are required.' });
  }

  try {
    const result = await db.query('SELECT * FROM users WHERE id = $1', [req.userId]);
    const user = result.rows[0];
    const match = await bcrypt.compare(currentPassword, user.password_hash);
    if (!match) return res.status(401).json({ error: 'Current password is incorrect.' });

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, req.userId]);
    res.json({ message: 'Password changed successfully.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not change password.' });
  }
});

module.exports = router;
