create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.patients (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  dob date not null,
  gender text not null default 'unknown' check (gender in ('male', 'female', 'other', 'unknown')),
  phone text,
  email text,
  password_hash text,
  insurance_provider text,
  insurance_member_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.patients
add column if not exists password_hash text;

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  provider_name text not null,
  scheduled_at timestamptz not null,
  status text not null default 'scheduled' check (status in ('scheduled', 'checked_in', 'completed', 'cancelled')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.clinical_notes (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  provider_name text not null,
  encounter_date date not null,
  diagnosis_code text,
  note text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.billing_claims (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  appointment_id uuid references public.appointments(id) on delete set null,
  cpt_code text not null,
  icd10_code text not null,
  amount numeric(12,2) not null check (amount >= 0),
  status text not null default 'draft' check (status in ('draft', 'submitted', 'paid', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.lab_results (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  test_name text not null,
  result_value text not null,
  reference_range text,
  collected_at date not null,
  created_at timestamptz not null default now()
);

create table if not exists public.patient_messages (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  sender_role text not null default 'patient' check (sender_role in ('patient', 'provider', 'staff')),
  subject text not null,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_patients_last_name on public.patients(last_name);
create index if not exists idx_patients_email on public.patients(email);
create index if not exists idx_appointments_patient_id on public.appointments(patient_id);
create index if not exists idx_appointments_scheduled_at on public.appointments(scheduled_at);
create index if not exists idx_clinical_notes_patient_id on public.clinical_notes(patient_id);
create index if not exists idx_billing_claims_patient_id on public.billing_claims(patient_id);
create index if not exists idx_lab_results_patient_id on public.lab_results(patient_id);
create index if not exists idx_patient_messages_patient_id on public.patient_messages(patient_id);

drop trigger if exists trg_patients_set_updated_at on public.patients;
create trigger trg_patients_set_updated_at
before update on public.patients
for each row
execute function public.set_updated_at();

drop trigger if exists trg_appointments_set_updated_at on public.appointments;
create trigger trg_appointments_set_updated_at
before update on public.appointments
for each row
execute function public.set_updated_at();

drop trigger if exists trg_clinical_notes_set_updated_at on public.clinical_notes;
create trigger trg_clinical_notes_set_updated_at
before update on public.clinical_notes
for each row
execute function public.set_updated_at();

drop trigger if exists trg_billing_claims_set_updated_at on public.billing_claims;
create trigger trg_billing_claims_set_updated_at
before update on public.billing_claims
for each row
execute function public.set_updated_at();

alter table public.patients enable row level security;
alter table public.appointments enable row level security;
alter table public.clinical_notes enable row level security;
alter table public.billing_claims enable row level security;
alter table public.lab_results enable row level security;
alter table public.patient_messages enable row level security;

drop policy if exists "dev_full_access_patients" on public.patients;
drop policy if exists "dev_full_access_appointments" on public.appointments;
drop policy if exists "dev_full_access_clinical_notes" on public.clinical_notes;
drop policy if exists "dev_full_access_billing_claims" on public.billing_claims;
drop policy if exists "dev_full_access_lab_results" on public.lab_results;
drop policy if exists "dev_full_access_patient_messages" on public.patient_messages;

create policy "dev_full_access_patients"
on public.patients
for all
to anon, authenticated
using (true)
with check (true);

create policy "dev_full_access_appointments"
on public.appointments
for all
to anon, authenticated
using (true)
with check (true);

create policy "dev_full_access_clinical_notes"
on public.clinical_notes
for all
to anon, authenticated
using (true)
with check (true);

create policy "dev_full_access_billing_claims"
on public.billing_claims
for all
to anon, authenticated
using (true)
with check (true);

create policy "dev_full_access_lab_results"
on public.lab_results
for all
to anon, authenticated
using (true)
with check (true);

create policy "dev_full_access_patient_messages"
on public.patient_messages
for all
to anon, authenticated
using (true)
with check (true);
