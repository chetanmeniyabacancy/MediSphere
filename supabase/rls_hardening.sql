-- Production-grade RLS hardening for MedFlow AI.
-- Apply this after `supabase/schema.sql`.
-- This migration assumes JWT claims include:
--   - app_role (admin, provider, billing, staff, patient)
--   - patient_id (uuid, required for patient role ownership checks)
--
-- IMPORTANT:
--   1) Backend writes should use SUPABASE_SERVICE_ROLE_KEY.
--   2) Remove any legacy dev-wide policies before enabling this in production.

create or replace function public.current_app_role()
returns text
language sql
stable
as $$
  select coalesce(
    nullif(auth.jwt() ->> 'app_role', ''),
    nullif(auth.jwt() -> 'app_metadata' ->> 'app_role', ''),
    nullif(auth.jwt() ->> 'role', ''),
    'anon'
  );
$$;

create or replace function public.current_patient_uuid()
returns uuid
language sql
stable
as $$
  select case
    when coalesce(
      auth.jwt() ->> 'patient_id',
      auth.jwt() -> 'app_metadata' ->> 'patient_id',
      ''
    ) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then coalesce(
      auth.jwt() ->> 'patient_id',
      auth.jwt() -> 'app_metadata' ->> 'patient_id'
    )::uuid
    else null
  end;
$$;

create or replace function public.has_any_app_role(roles text[])
returns boolean
language sql
stable
as $$
  select public.current_app_role() = any(roles);
$$;

alter table public.patients force row level security;
alter table public.appointments force row level security;
alter table public.clinical_notes force row level security;
alter table public.billing_claims force row level security;
alter table public.lab_results force row level security;
alter table public.patient_messages force row level security;
alter table public.patient_allergies force row level security;
alter table public.prescriptions force row level security;
alter table public.primary_care_gaps force row level security;
alter table public.audit_logs force row level security;

drop policy if exists "dev_full_access_patients" on public.patients;
drop policy if exists "dev_full_access_appointments" on public.appointments;
drop policy if exists "dev_full_access_clinical_notes" on public.clinical_notes;
drop policy if exists "dev_full_access_billing_claims" on public.billing_claims;
drop policy if exists "dev_full_access_lab_results" on public.lab_results;
drop policy if exists "dev_full_access_patient_messages" on public.patient_messages;
drop policy if exists "dev_full_access_patient_allergies" on public.patient_allergies;
drop policy if exists "dev_full_access_prescriptions" on public.prescriptions;
drop policy if exists "dev_full_access_primary_care_gaps" on public.primary_care_gaps;
drop policy if exists "dev_full_access_audit_logs" on public.audit_logs;

drop policy if exists "patients_select_rbac" on public.patients;
drop policy if exists "patients_insert_staff" on public.patients;
drop policy if exists "patients_update_staff" on public.patients;
drop policy if exists "patients_delete_admin" on public.patients;

create policy "patients_select_rbac"
on public.patients
for select
to authenticated
using (
  public.has_any_app_role(array['admin', 'provider', 'billing', 'staff']::text[])
  or (public.current_app_role() = 'patient' and id = public.current_patient_uuid())
);

create policy "patients_insert_staff"
on public.patients
for insert
to authenticated
with check (public.has_any_app_role(array['admin', 'staff']::text[]));

create policy "patients_update_staff"
on public.patients
for update
to authenticated
using (public.has_any_app_role(array['admin', 'staff']::text[]))
with check (public.has_any_app_role(array['admin', 'staff']::text[]));

create policy "patients_delete_admin"
on public.patients
for delete
to authenticated
using (public.has_any_app_role(array['admin']::text[]));

drop policy if exists "appointments_select_rbac" on public.appointments;
drop policy if exists "appointments_insert_clinic" on public.appointments;
drop policy if exists "appointments_update_clinic" on public.appointments;
drop policy if exists "appointments_delete_clinic" on public.appointments;

create policy "appointments_select_rbac"
on public.appointments
for select
to authenticated
using (
  public.has_any_app_role(array['admin', 'provider', 'billing', 'staff']::text[])
  or (public.current_app_role() = 'patient' and patient_id = public.current_patient_uuid())
);

create policy "appointments_insert_clinic"
on public.appointments
for insert
to authenticated
with check (public.has_any_app_role(array['admin', 'provider', 'staff']::text[]));

create policy "appointments_update_clinic"
on public.appointments
for update
to authenticated
using (public.has_any_app_role(array['admin', 'provider', 'staff']::text[]))
with check (public.has_any_app_role(array['admin', 'provider', 'staff']::text[]));

create policy "appointments_delete_clinic"
on public.appointments
for delete
to authenticated
using (public.has_any_app_role(array['admin', 'provider', 'staff']::text[]));

drop policy if exists "clinical_notes_select_rbac" on public.clinical_notes;
drop policy if exists "clinical_notes_insert_clinic" on public.clinical_notes;
drop policy if exists "clinical_notes_update_clinic" on public.clinical_notes;
drop policy if exists "clinical_notes_delete_clinic" on public.clinical_notes;

create policy "clinical_notes_select_rbac"
on public.clinical_notes
for select
to authenticated
using (
  public.has_any_app_role(array['admin', 'provider', 'staff']::text[])
  or (public.current_app_role() = 'patient' and patient_id = public.current_patient_uuid())
);

create policy "clinical_notes_insert_clinic"
on public.clinical_notes
for insert
to authenticated
with check (public.has_any_app_role(array['admin', 'provider']::text[]));

create policy "clinical_notes_update_clinic"
on public.clinical_notes
for update
to authenticated
using (public.has_any_app_role(array['admin', 'provider']::text[]))
with check (public.has_any_app_role(array['admin', 'provider']::text[]));

create policy "clinical_notes_delete_clinic"
on public.clinical_notes
for delete
to authenticated
using (public.has_any_app_role(array['admin', 'provider']::text[]));

drop policy if exists "billing_claims_select_rbac" on public.billing_claims;
drop policy if exists "billing_claims_insert_billing" on public.billing_claims;
drop policy if exists "billing_claims_update_billing" on public.billing_claims;
drop policy if exists "billing_claims_delete_admin" on public.billing_claims;

create policy "billing_claims_select_rbac"
on public.billing_claims
for select
to authenticated
using (
  public.has_any_app_role(array['admin', 'provider', 'billing', 'staff']::text[])
  or (public.current_app_role() = 'patient' and patient_id = public.current_patient_uuid())
);

create policy "billing_claims_insert_billing"
on public.billing_claims
for insert
to authenticated
with check (public.has_any_app_role(array['admin', 'billing']::text[]));

create policy "billing_claims_update_billing"
on public.billing_claims
for update
to authenticated
using (public.has_any_app_role(array['admin', 'billing']::text[]))
with check (public.has_any_app_role(array['admin', 'billing']::text[]));

create policy "billing_claims_delete_admin"
on public.billing_claims
for delete
to authenticated
using (public.has_any_app_role(array['admin']::text[]));

drop policy if exists "lab_results_select_rbac" on public.lab_results;
drop policy if exists "lab_results_insert_clinic" on public.lab_results;
drop policy if exists "lab_results_update_clinic" on public.lab_results;
drop policy if exists "lab_results_delete_clinic" on public.lab_results;

create policy "lab_results_select_rbac"
on public.lab_results
for select
to authenticated
using (
  public.has_any_app_role(array['admin', 'provider', 'staff', 'billing']::text[])
  or (public.current_app_role() = 'patient' and patient_id = public.current_patient_uuid())
);

create policy "lab_results_insert_clinic"
on public.lab_results
for insert
to authenticated
with check (public.has_any_app_role(array['admin', 'provider', 'staff']::text[]));

create policy "lab_results_update_clinic"
on public.lab_results
for update
to authenticated
using (public.has_any_app_role(array['admin', 'provider', 'staff']::text[]))
with check (public.has_any_app_role(array['admin', 'provider', 'staff']::text[]));

create policy "lab_results_delete_clinic"
on public.lab_results
for delete
to authenticated
using (public.has_any_app_role(array['admin', 'provider', 'staff']::text[]));

drop policy if exists "patient_messages_select_rbac" on public.patient_messages;
drop policy if exists "patient_messages_insert_rbac" on public.patient_messages;
drop policy if exists "patient_messages_update_clinic" on public.patient_messages;
drop policy if exists "patient_messages_delete_clinic" on public.patient_messages;

create policy "patient_messages_select_rbac"
on public.patient_messages
for select
to authenticated
using (
  public.has_any_app_role(array['admin', 'provider', 'staff']::text[])
  or (public.current_app_role() = 'patient' and patient_id = public.current_patient_uuid())
);

create policy "patient_messages_insert_rbac"
on public.patient_messages
for insert
to authenticated
with check (
  public.has_any_app_role(array['admin', 'provider', 'staff']::text[])
  or (
    public.current_app_role() = 'patient'
    and patient_id = public.current_patient_uuid()
    and sender_role = 'patient'
  )
);

create policy "patient_messages_update_clinic"
on public.patient_messages
for update
to authenticated
using (public.has_any_app_role(array['admin', 'provider', 'staff']::text[]))
with check (public.has_any_app_role(array['admin', 'provider', 'staff']::text[]));

create policy "patient_messages_delete_clinic"
on public.patient_messages
for delete
to authenticated
using (public.has_any_app_role(array['admin', 'provider', 'staff']::text[]));

drop policy if exists "patient_allergies_select_rbac" on public.patient_allergies;
drop policy if exists "patient_allergies_insert_clinic" on public.patient_allergies;
drop policy if exists "patient_allergies_update_clinic" on public.patient_allergies;
drop policy if exists "patient_allergies_delete_clinic" on public.patient_allergies;

create policy "patient_allergies_select_rbac"
on public.patient_allergies
for select
to authenticated
using (
  public.has_any_app_role(array['admin', 'provider', 'staff', 'billing']::text[])
  or (public.current_app_role() = 'patient' and patient_id = public.current_patient_uuid())
);

create policy "patient_allergies_insert_clinic"
on public.patient_allergies
for insert
to authenticated
with check (public.has_any_app_role(array['admin', 'provider', 'staff']::text[]));

create policy "patient_allergies_update_clinic"
on public.patient_allergies
for update
to authenticated
using (public.has_any_app_role(array['admin', 'provider', 'staff']::text[]))
with check (public.has_any_app_role(array['admin', 'provider', 'staff']::text[]));

create policy "patient_allergies_delete_clinic"
on public.patient_allergies
for delete
to authenticated
using (public.has_any_app_role(array['admin', 'provider', 'staff']::text[]));

drop policy if exists "prescriptions_select_rbac" on public.prescriptions;
drop policy if exists "prescriptions_insert_clinic" on public.prescriptions;
drop policy if exists "prescriptions_update_clinic" on public.prescriptions;
drop policy if exists "prescriptions_delete_clinic" on public.prescriptions;

create policy "prescriptions_select_rbac"
on public.prescriptions
for select
to authenticated
using (
  public.has_any_app_role(array['admin', 'provider', 'staff', 'billing']::text[])
  or (public.current_app_role() = 'patient' and patient_id = public.current_patient_uuid())
);

create policy "prescriptions_insert_clinic"
on public.prescriptions
for insert
to authenticated
with check (public.has_any_app_role(array['admin', 'provider']::text[]));

create policy "prescriptions_update_clinic"
on public.prescriptions
for update
to authenticated
using (public.has_any_app_role(array['admin', 'provider']::text[]))
with check (public.has_any_app_role(array['admin', 'provider']::text[]));

create policy "prescriptions_delete_clinic"
on public.prescriptions
for delete
to authenticated
using (public.has_any_app_role(array['admin', 'provider']::text[]));

drop policy if exists "primary_care_gaps_select_rbac" on public.primary_care_gaps;
drop policy if exists "primary_care_gaps_insert_clinic" on public.primary_care_gaps;
drop policy if exists "primary_care_gaps_update_clinic" on public.primary_care_gaps;
drop policy if exists "primary_care_gaps_delete_clinic" on public.primary_care_gaps;

create policy "primary_care_gaps_select_rbac"
on public.primary_care_gaps
for select
to authenticated
using (
  public.has_any_app_role(array['admin', 'provider', 'staff', 'billing']::text[])
  or (public.current_app_role() = 'patient' and patient_id = public.current_patient_uuid())
);

create policy "primary_care_gaps_insert_clinic"
on public.primary_care_gaps
for insert
to authenticated
with check (public.has_any_app_role(array['admin', 'provider', 'staff']::text[]));

create policy "primary_care_gaps_update_clinic"
on public.primary_care_gaps
for update
to authenticated
using (public.has_any_app_role(array['admin', 'provider', 'staff']::text[]))
with check (public.has_any_app_role(array['admin', 'provider', 'staff']::text[]));

create policy "primary_care_gaps_delete_clinic"
on public.primary_care_gaps
for delete
to authenticated
using (public.has_any_app_role(array['admin', 'provider', 'staff']::text[]));

drop policy if exists "audit_logs_select_privileged" on public.audit_logs;
drop policy if exists "audit_logs_insert_privileged" on public.audit_logs;

create policy "audit_logs_select_privileged"
on public.audit_logs
for select
to authenticated
using (public.has_any_app_role(array['admin', 'staff', 'billing']::text[]));

create policy "audit_logs_insert_privileged"
on public.audit_logs
for insert
to authenticated
with check (public.has_any_app_role(array['admin', 'provider', 'billing', 'staff']::text[]));
