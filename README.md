# MedFlow AI

MedFlow AI is a cloud-first EHR MVP built with **Next.js (App Router), TypeScript, and Supabase**.

It includes:
- Patient record management
- Appointment scheduling
- Clinical documentation
- Primary-care templates + preventive care gap workflows
- e-Prescribing (Rx CRUD with allergy/interaction safety checks)
- Billing claim management
- Lab result tracking
- Patient portal (login, appointments, labs, messages)
- REST API routes for core resources
- RBAC + audit trail foundations for compliance hardening

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
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
```

`SUPABASE_SERVICE_ROLE_KEY` is recommended for backend/API server routes, especially with strict RLS.

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
- `/primary-care`
- `/prescriptions`
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
- `GET, POST /api/primary-care-gaps`
- `GET, POST /api/prescriptions`
- `GET /api/reports`
- `POST /api/patient-auth/login`
- `POST /api/patient-auth/logout`
- `POST /api/patient-auth/set-password` (localhost only)

## Compliance Notes

- `supabase/schema.sql` keeps broad dev-access policies for local MVP speed.
- `supabase/rls_hardening.sql` applies strict RBAC + patient ownership RLS for production.
- Apply strict RLS only after backend routes use service-role writes.

### Production Hardening Order

1. Run `supabase/schema.sql`.
2. Validate app/API with service-role key configured.
3. Run `supabase/rls_hardening.sql`.
4. Ensure JWT claims include `app_role` and (for patient users) `patient_id`.

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
