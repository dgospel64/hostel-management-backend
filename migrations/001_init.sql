-- Student Hostel Management System schema
-- Run with: npm run migrate

CREATE TABLE IF NOT EXISTS users (
  id             SERIAL PRIMARY KEY,
  full_name      TEXT NOT NULL,
  student_id     TEXT NOT NULL UNIQUE,
  email          TEXT NOT NULL UNIQUE,
  phone          TEXT,
  department     TEXT,
  level          TEXT,
  gender         TEXT,
  password_hash  TEXT NOT NULL,
  profile_photo_url TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS hostels (
  id    SERIAL PRIMARY KEY,
  name  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS rooms (
  id          SERIAL PRIMARY KEY,
  hostel_id   INTEGER NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
  block       TEXT NOT NULL,
  floor       TEXT,
  room_number TEXT NOT NULL,
  room_type   TEXT NOT NULL DEFAULT 'shared',
  capacity    INTEGER NOT NULL DEFAULT 4
);

CREATE TABLE IF NOT EXISTS allocations (
  id           SERIAL PRIMARY KEY,
  user_id      INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  room_id      INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  bed_space    TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'ended')),
  allocated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS room_preferences (
  id             SERIAL PRIMARY KEY,
  user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  preferred_block TEXT,
  preferred_room_type TEXT,
  notes          TEXT,
  status         TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS fees (
  id           SERIAL PRIMARY KEY,
  user_id      INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  amount_due   NUMERIC NOT NULL,
  amount_paid  NUMERIC NOT NULL DEFAULT 0,
  deadline     DATE NOT NULL,
  status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('paid', 'pending', 'overdue', 'partially_paid')),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payments (
  id               SERIAL PRIMARY KEY,
  user_id          INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount           NUMERIC NOT NULL,
  receipt_reference TEXT NOT NULL UNIQUE,
  paid_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS clearance (
  id                    SERIAL PRIMARY KEY,
  user_id               INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  hostel_fee_status     TEXT NOT NULL DEFAULT 'pending' CHECK (hostel_fee_status IN ('cleared', 'pending', 'not_cleared')),
  room_status           TEXT NOT NULL DEFAULT 'pending' CHECK (room_status IN ('cleared', 'pending', 'not_cleared')),
  maintenance_status    TEXT NOT NULL DEFAULT 'pending' CHECK (maintenance_status IN ('cleared', 'pending', 'not_cleared')),
  key_return_status     TEXT NOT NULL DEFAULT 'pending' CHECK (key_return_status IN ('cleared', 'pending', 'not_cleared')),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS maintenance_requests (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category    TEXT NOT NULL,
  description TEXT NOT NULL,
  room_number TEXT NOT NULL,
  priority    TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  file_url    TEXT,
  status      TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'pending', 'assigned', 'in_progress', 'resolved', 'closed')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS visitors (
  id             SERIAL PRIMARY KEY,
  user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  phone          TEXT NOT NULL,
  visit_date     DATE NOT NULL,
  arrival_time   TEXT NOT NULL,
  purpose        TEXT,
  status         TEXT NOT NULL DEFAULT 'pending_approval' CHECK (status IN ('pending_approval', 'approved', 'rejected', 'checked_in', 'checked_out')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS complaints (
  id             SERIAL PRIMARY KEY,
  user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category       TEXT NOT NULL,
  subject        TEXT NOT NULL,
  description    TEXT NOT NULL,
  attachment_url TEXT,
  status         TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'in_review', 'resolved', 'closed')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notifications (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,
  message     TEXT NOT NULL,
  is_read     BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS announcements (
  id          SERIAL PRIMARY KEY,
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  used        BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rooms_hostel ON rooms(hostel_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_user ON maintenance_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_visitors_user ON visitors(user_id);
CREATE INDEX IF NOT EXISTS idx_complaints_user ON complaints(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id);
