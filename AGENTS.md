# AGENTS.md

## Mission
Build and evolve **MedFlow AI**, a HIPAA-aware EHR platform for mid-size practices using **Next.js (App Router) + Supabase**.

## Current Scope
MVP modules in this repository:
- Dashboard
- Patients
- Appointments
- Clinical documentation (medical records)
- Billing claims
- Lab results
- Reports
- Patient portal (login, appointments, lab results, messages)
- REST API endpoints for core resources

## Architecture Rules
- Keep features modular by route segment and reusable components.
- Prefer typed Supabase access through shared types in `lib/types.ts`.
- Use server components for data reads where possible.
- Use server actions for simple writes from forms.
- Expose typed REST endpoints under `app/api/*` for integration use.

## Security Guardrails
- Never commit secrets or service-role keys.
- Use RLS policies in Supabase for all production tables.
- Treat PHI carefully: avoid logging raw patient payloads.
- Keep audit and access-control pathways explicit when adding features.

## Data Model Baseline
Core tables used in this MVP:
- `patients`
- `appointments`
- `clinical_notes`
- `billing_claims`
- `lab_results`
- `patient_messages`

Schema source of truth for local setup is `supabase/schema.sql`.

## Engineering Conventions
- TypeScript strict mode only.
- Keep files small and purpose-driven.
- Revalidate affected routes after mutations.
- Avoid hidden coupling; use helper utilities in `lib/*`.

## Runbook
1. Fill `.env.local` from `.env.example`.
2. Apply `supabase/schema.sql` in Supabase SQL Editor.
3. Start app: `npm run dev`.
4. Run checks before handoff: `npm run lint`.

## Next Iterations
- Introduce Supabase SSR auth cookies for protected portal sessions.
- Add RBAC roles (`admin`, `provider`, `billing`, `patient`).
- Add immutable audit events table and action hooks.
- Add FHIR integration and external notification workers.
