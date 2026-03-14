import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { getLoggedInPatient } from "@/lib/auth/patient-session";
import { formatDateTime, patientDisplayName } from "@/lib/format";
import { getSupabaseConfigError, getSupabaseServerClient } from "@/lib/supabase/client";
import type { Appointment } from "@/lib/types";

export default async function PortalAppointmentsPage() {
  const supabase = getSupabaseServerClient();
  const patient = await getLoggedInPatient();

  if (!supabase) {
    return (
      <section className="stack">
        <PageHeader
          title="Portal Appointments"
          description="Patient view for upcoming and historical appointments."
        />
        <div className="panel">
          <p className="notice notice-error">{getSupabaseConfigError()}</p>
        </div>
      </section>
    );
  }

  if (!patient) {
    return (
      <section className="stack">
        <PageHeader title="Portal Appointments" description="Patient view for upcoming and historical appointments." />
        <article className="panel">
          <p className="notice">Please log in to view your appointments.</p>
          <div className="form-actions" style={{ marginTop: "0.75rem" }}>
            <Link className="button" href="/patient-portal/login">
              Go to Login
            </Link>
          </div>
        </article>
      </section>
    );
  }

  const { data, error } = await supabase
    .from("appointments")
    .select("id, patient_id, provider_name, scheduled_at, status, notes")
    .eq("patient_id", patient.id)
    .order("scheduled_at", { ascending: true });

  const appointments = (data ?? []) as Appointment[];

  return (
    <section className="stack">
      <PageHeader
        title="Portal Appointments"
        description="Patients can review appointments and communicate with scheduling staff."
      />

      <article className="panel">
        <h3>Appointment History</h3>

        <p className="small" style={{ marginBottom: "0.6rem" }}>
          Patient: {patientDisplayName(patient)}
        </p>

        {error ? <p className="notice notice-error">Failed to load appointments: {error.message}</p> : null}

        {!error && appointments.length === 0 ? <p className="notice">No appointments found.</p> : null}

        {appointments.length > 0 ? (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Provider</th>
                  <th>Status</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {appointments.map((appointment) => (
                  <tr key={appointment.id}>
                    <td>{formatDateTime(appointment.scheduled_at)}</td>
                    <td>{appointment.provider_name}</td>
                    <td>
                      <span className="badge">{appointment.status.replace("_", " ")}</span>
                    </td>
                    <td>{appointment.notes || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </article>
    </section>
  );
}
