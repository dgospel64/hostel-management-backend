# Student Hostel Management System — Backend

REST API for the student-facing hostel management portal. Node.js + Express + PostgreSQL.

## Setup

```bash
npm install
cp .env.example .env
```

Fill in `.env` with your Supabase (or any Postgres) connection string and a JWT secret.

```bash
npm run migrate   # creates all tables
npm run seed       # optional: adds one demo student + sample data
npm start          # runs on http://localhost:4000
```

Demo login after seeding: `jane.doe@example.edu` / `password123`

## Project structure

```
backend/
├── migrations/001_init.sql   # full schema
├── src/
│   ├── db.js                 # Postgres connection pool
│   ├── migrate.js            # runs migrations/001_init.sql
│   ├── seed.js                # demo data
│   ├── middleware/
│   │   ├── auth.js           # JWT verification
│   │   └── upload.js         # multer file upload config
│   ├── utils/token.js        # JWT sign/verify
│   ├── routes/
│   │   ├── auth.js
│   │   ├── dashboard.js
│   │   ├── rooms.js
│   │   ├── fees.js
│   │   ├── clearance.js
│   │   ├── maintenance.js
│   │   ├── visitors.js
│   │   ├── complaints.js
│   │   ├── notifications.js
│   │   └── announcements.js
│   └── index.js               # Express app + route mounting
```

## API summary

All routes except `/health`, `/auth/register`, `/auth/login`, `/auth/forgot-password`,
`/auth/reset-password`, and `/announcements` require an `Authorization: Bearer <token>` header.

See `Student_Hostel_Management_System_Backend_Prompt.md` in the project root for the full endpoint list and design rationale.

## Known MVP shortcuts (call these out if a reviewer asks)

- **Forgot password** returns the raw reset token in the API response (`devResetToken`) instead of emailing it. Wire up a real email provider (Resend, SendGrid) before this touches real users.
- **Fee payment** is mocked: `POST /fees/pay` marks the amount paid immediately with no real payment gateway call. Swap in Paystack/Flutterwave/Stripe before handling real money.
- **No admin panel.** Room allocation, fee setup, and clearance updates are done directly in the database or via a future admin extension. This MVP is student-facing only.

## Deployment (Render + Supabase)

1. Create a Supabase project, copy the Postgres connection string into `DATABASE_URL`.
2. Run `npm run migrate` (and optionally `npm run seed`) locally pointed at that connection string, or paste `migrations/001_init.sql` into the Supabase SQL editor.
3. Push this folder to a Git repo, create a new Render Web Service pointed at it.
4. Set `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGIN` (your Vercel frontend URL) as environment variables in Render.
5. Build command: `npm install`. Start command: `npm start`.
