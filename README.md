# MedFlow AI

MedFlow AI is a cloud-first EHR MVP built with **Next.js (App Router), TypeScript, and Supabase**.

It includes:
- Patient record management
- Appointment scheduling
- Clinical documentation
- Billing claim management
- Lab result tracking
- Patient portal (login, appointments, labs, messages)
- REST API routes for core resources

## Stack

- Next.js 14 + TypeScript
- Supabase (`@supabase/supabase-js`)
- Postgres schema defined in `supabase/schema.sql`

## Quick Start

1. Install dependencies:

```bash
npm install
```

2. Configure environment:

```bash
cp .env.example .env.local
```

Set values in `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
```

3. Apply schema in Supabase SQL editor:

- Open Supabase Dashboard -> SQL Editor
- Run `supabase/schema.sql`

4. Start the app:

```bash
npm run dev
```

Open `http://localhost:3000`.

## App Routes

- `/` Dashboard
- `/patients`
- `/appointments`
- `/medical-records`
- `/billing`
- `/lab-results`
- `/reports`
- `/settings`
- `/admin`
- `/patient-portal`
- `/patient-portal/login`
- `/patient-portal/appointments`
- `/patient-portal/lab-results`
- `/patient-portal/messages`

## API Routes

- `GET, POST /api/patients`
- `GET, POST /api/appointments`
- `GET, POST /api/medical-records`
- `GET, POST /api/billing`
- `GET, POST /api/labs`
- `GET /api/reports`
- `POST /api/patient-auth/login`
- `POST /api/patient-auth/logout`
- `POST /api/patient-auth/set-password` (localhost only)

## Notes

- Current RLS policies in `schema.sql` allow broad dev access (`anon`, `authenticated`) for MVP speed.
- Harden policies for production by role and patient ownership.
- Add immutable audit logs before production rollout.

## Manual Patient Login (No Supabase Auth)

This project supports manual patient login with passwords hashed in the `patients.password_hash` column.

1. Add to `.env.local`:

```env
ENABLE_MANUAL_PATIENT_AUTH=true
MANUAL_AUTH_SECRET=<long-random-secret>
```

2. Restart dev server.
3. Open `/patient-portal/login` and use **Set Password**.
4. Enter an existing patient email + password.
5. Switch to **Sign In**.

`/api/patient-auth/set-password` is intentionally limited to localhost requests.
