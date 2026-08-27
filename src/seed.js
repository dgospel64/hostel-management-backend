const bcrypt = require('bcryptjs');
const { pool } = require('./db');

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const hostel = await client.query(
      `INSERT INTO hostels (name) VALUES ('Unity Hall') RETURNING id`
    );
    const hostelId = hostel.rows[0].id;

    const room = await client.query(
      `INSERT INTO rooms (hostel_id, block, floor, room_number, room_type, capacity)
       VALUES ($1, 'Block A', '2nd Floor', 'A204', 'shared', 4) RETURNING id`,
      [hostelId]
    );
    const roomId = room.rows[0].id;

    const passwordHash = await bcrypt.hash('password123', 10);
    const user = await client.query(
      `INSERT INTO users (full_name, student_id, email, phone, department, level, gender, password_hash)
       VALUES ('Jane Doe', 'STU/2023/0042', 'jane.doe@example.edu', '08012345678', 'Computer Science', '300', 'Female', $1)
       RETURNING id`,
      [passwordHash]
    );
    const userId = user.rows[0].id;

    await client.query(
      `INSERT INTO allocations (user_id, room_id, bed_space) VALUES ($1, $2, 'Bed 2')`,
      [userId, roomId]
    );

    await client.query(
      `INSERT INTO fees (user_id, amount_due, amount_paid, deadline, status)
       VALUES ($1, 150000, 0, CURRENT_DATE + INTERVAL '14 days', 'pending')`,
      [userId]
    );

    await client.query(
      `INSERT INTO clearance (user_id) VALUES ($1)`,
      [userId]
    );

    await client.query(
      `INSERT INTO announcements (title, body) VALUES
       ('Hostel fee deadline approaching', 'All students are reminded to complete hostel fee payment before the deadline to avoid a late penalty.'),
       ('Water supply maintenance', 'Water supply to Block A will be interrupted on Saturday between 9am and 1pm for scheduled maintenance.')`
    );

    await client.query(
      `INSERT INTO notifications (user_id, type, message) VALUES
       ($1, 'payment_reminder', 'Your hostel fee payment is due in 14 days.'),
       ($1, 'announcement', 'New announcement: Water supply maintenance this Saturday.')`,
      [userId]
    );

    await client.query('COMMIT');
    console.log('Seed complete.');
    console.log('Demo login -> email: jane.doe@example.edu, password: password123');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seed failed:', err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
