import Link from "next/link";
import { MetricCard } from "@/components/metric-card";
import { PageHeader } from "@/components/page-header";
import { formatDateTime, patientDisplayName } from "@/lib/format";
import { getSupabaseConfigError, getSupabaseServerClient } from "@/lib/supabase/client";
import type { Appointment, BillingClaim, Patient } from "@/lib/types";

export default async function DashboardPage() {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return (
      <section className="stack">
        <PageHeader
          title="Dashboard"
          description="Operational snapshot for your clinic, billing, and patient workflows."
        />
        <div className="panel">
          <p className="notice notice-error">{getSupabaseConfigError()}</p>
        </div>
      </section>
    );
  }

  const [patientsRes, appointmentsRes, notesRes, claimsRes] = await Promise.all([
    supabase.from("patients").select("id", { count: "exact", head: true }),
    supabase.from("appointments").select("id", { count: "exact", head: true }),
    supabase.from("clinical_notes").select("id", { count: "exact", head: true }),
    supabase.from("billing_claims").select("id, status"),
  ]);

  const upcomingRes = await supabase
    .from("appointments")
    .select("id, patient_id, provider_name, scheduled_at, status")
    .gte("scheduled_at", new Date().toISOString())
    .order("scheduled_at", { ascending: true })
    .limit(8);

  const upcoming = (upcomingRes.data ?? []) as Appointment[];
  const appointmentPatientIds = Array.from(new Set(upcoming.map((appt) => appt.patient_id)));

  const patientNameMap = new Map<string, string>();
  if (appointmentPatientIds.length > 0) {
    const upcomingPatientsRes = await supabase
      .from("patients")
      .select("id, first_name, last_name")
      .in("id", appointmentPatientIds);

    (upcomingPatientsRes.data ?? []).forEach((patient) => {
      patientNameMap.set(patient.id, patientDisplayName(patient as Patient));
    });
  }

  const claims = (claimsRes.data ?? []) as BillingClaim[];
  const paidClaims = claims.filter((claim) => claim.status === "paid").length;
  const submittedClaims = claims.filter((claim) => claim.status === "submitted").length;
  const totalClaims = claims.length;

  return (
    <section className="stack">
      <PageHeader
        title="Dashboard"
        description="Live KPI summary for patient records, scheduling, documentation, and claims."
      />

      <section className="grid-4">
        <MetricCard label="Total Patients" value={patientsRes.count ?? 0} caption="Registered patient profiles" />
        <MetricCard label="Appointments" value={appointmentsRes.count ?? 0} caption="All statuses" />
        <MetricCard label="Clinical Notes" value={notesRes.count ?? 0} caption="Documentation volume" />
        <MetricCard label="Claims Paid" value={`${paidClaims}/${totalClaims}`} caption="Paid over total claims" />
      </section>

      <section className="grid-2">
        <article className="panel">
          <h3>Upcoming Appointments</h3>
          {upcoming.length === 0 ? (
            <p className="notice">No future appointments found.</p>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Patient</th>
                    <th>Provider</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {upcoming.map((appt) => (
                    <tr key={appt.id}>
                      <td>{formatDateTime(appt.scheduled_at)}</td>
                      <td>{patientNameMap.get(appt.patient_id) ?? appt.patient_id}</td>
                      <td>{appt.provider_name}</td>
                      <td>
                        <span className="badge">{appt.status.replace("_", " ")}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>

        <article className="panel panel-muted">
          <h3>Quick Actions</h3>
          <p className="small">Create core records required by the MVP workflow.</p>
          <div className="inline-links" style={{ marginTop: "0.75rem" }}>
            <Link className="button" href="/patients">
              Add Patient
            </Link>
            <Link className="button button-secondary" href="/appointments">
              Schedule Appointment
            </Link>
            <Link className="button button-secondary" href="/medical-records">
              Add Clinical Note
            </Link>
            <Link className="button button-secondary" href="/billing">
              Create Claim
            </Link>
            <Link className="button button-secondary" href="/patient-portal">
              Open Patient Portal
            </Link>
          </div>

          <div className="stack" style={{ marginTop: "1rem" }}>
            <p className="notice">
              Billing signal: <strong>{submittedClaims}</strong> claims currently in submitted state and waiting for payer response.
            </p>
            <p className="notice">
              Use <Link href="/reports">Reports</Link> for claim acceptance rate and patient throughput metrics.
            </p>
          </div>
        </article>
      </section>
    </section>
  );
}
