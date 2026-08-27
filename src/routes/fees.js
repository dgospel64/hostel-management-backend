const express = require('express');
const crypto = require('crypto');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

function computeStatus(amountDue, amountPaid, deadline) {
  if (amountPaid >= amountDue) return 'paid';
  if (amountPaid > 0) return 'partially_paid';
  if (new Date(deadline) < new Date()) return 'overdue';
  return 'pending';
}

// GET /fees/me
router.get('/me', requireAuth, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM fees WHERE user_id = $1', [req.userId]);
    const fee = result.rows[0];
    if (!fee) return res.status(404).json({ error: 'No fee record found.' });

    const status = computeStatus(Number(fee.amount_due), Number(fee.amount_paid), fee.deadline);
    if (status !== fee.status) {
      await db.query('UPDATE fees SET status = $1 WHERE id = $2', [status, fee.id]);
    }

    res.json({ ...fee, status });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not fetch fee status.' });
  }
});

// GET /fees/me/history
router.get('/me/history', requireAuth, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM payments WHERE user_id = $1 ORDER BY paid_at DESC',
      [req.userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not fetch payment history.' });
  }
});

// POST /fees/pay
// MVP mock payment: no real payment gateway is called. Marks the amount as paid
// and generates a receipt. Swap this handler for a Paystack/Flutterwave/Stripe
// charge + webhook confirmation before accepting real money.
router.post('/pay', requireAuth, async (req, res) => {
  const { amount } = req.body;
  if (!amount || amount <= 0) {
    return res.status(400).json({ error: 'A valid amount is required.' });
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const feeResult = await client.query('SELECT * FROM fees WHERE user_id = $1 FOR UPDATE', [req.userId]);
    const fee = feeResult.rows[0];
    if (!fee) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'No fee record found.' });
    }

    const newAmountPaid = Number(fee.amount_paid) + Number(amount);
    const status = computeStatus(Number(fee.amount_due), newAmountPaid, fee.deadline);

    await client.query(
      'UPDATE fees SET amount_paid = $1, status = $2, updated_at = now() WHERE id = $3',
      [newAmountPaid, status, fee.id]
    );

    const receiptReference = `RCPT-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const payment = await client.query(
      `INSERT INTO payments (user_id, amount, receipt_reference) VALUES ($1, $2, $3) RETURNING *`,
      [req.userId, amount, receiptReference]
    );

    await client.query(
      `INSERT INTO notifications (user_id, type, message) VALUES ($1, 'payment_confirmation', $2)`,
      [req.userId, `Payment of ${amount} received. Receipt: ${receiptReference}`]
    );

    await client.query('COMMIT');
    res.status(201).json({ payment: payment.rows[0], feeStatus: status });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Payment could not be processed.' });
  } finally {
    client.release();
  }
});

// GET /fees/receipt/:id
router.get('/receipt/:id', requireAuth, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM payments WHERE id = $1 AND user_id = $2',
      [req.params.id, req.userId]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Receipt not found.' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not fetch receipt.' });
  }
});

module.exports = router;
