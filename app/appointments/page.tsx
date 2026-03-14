import { revalidatePath } from "next/cache";
import { PageHeader } from "@/components/page-header";
import { formatDateTime, patientDisplayName } from "@/lib/format";
import { getSupabaseConfigError, getSupabaseServerClient } from "@/lib/supabase/client";
import type { Appointment, AppointmentStatus, Patient } from "@/lib/types";

export const dynamic = "force-dynamic";

const statuses: AppointmentStatus[] = ["scheduled", "checked_in", "completed", "cancelled"];

async function createAppointment(formData: FormData) {
  "use server";

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return;
  }

  const patientId = String(formData.get("patient_id") ?? "").trim();
  const providerName = String(formData.get("provider_name") ?? "").trim();
  const scheduledAtRaw = String(formData.get("scheduled_at") ?? "").trim();
  const status = String(formData.get("status") ?? "scheduled") as AppointmentStatus;
  const notes = String(formData.get("notes") ?? "").trim();

  if (!patientId || !providerName || !scheduledAtRaw) {
    return;
  }

  const parsedDate = new Date(scheduledAtRaw);
  if (Number.isNaN(parsedDate.getTime())) {
    return;
  }

  await supabase.from("appointments").insert({
    patient_id: patientId,
    provider_name: providerName,
    scheduled_at: parsedDate.toISOString(),
    status: statuses.includes(status) ? status : "scheduled",
    notes: notes || null,
  });

  revalidatePath("/");
  revalidatePath("/appointments");
}

export default async function AppointmentsPage() {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return (
      <section className="stack">
        <PageHeader
          title="Appointments"
          description="Provider calendars, availability coordination, and appointment operations."
        />
        <div className="panel">
          <p className="notice notice-error">{getSupabaseConfigError()}</p>
        </div>
      </section>
    );
  }

  const [patientsRes, appointmentsRes] = await Promise.all([
    supabase.from("patients").select("id, first_name, last_name").order("first_name", { ascending: true }),
    supabase
      .from("appointments")
      .select("id, patient_id, provider_name, scheduled_at, status, notes")
      .order("scheduled_at", { ascending: true })
      .limit(120),
  ]);

  const patients = (patientsRes.data ?? []) as Patient[];
  const appointments = (appointmentsRes.data ?? []) as Appointment[];
  const patientMap = new Map<string, string>(patients.map((patient) => [patient.id, patientDisplayName(patient)]));

  return (
    <section className="stack">
      <PageHeader
        title="Appointments"
        description="Schedule patient visits, track statuses, and maintain provider coverage."
      />

      <article className="panel">
        <h3>Schedule Appointment</h3>
        {patientsRes.error ? (
          <p className="notice notice-error" style={{ marginTop: "0.75rem" }}>
            Failed to load patients: {patientsRes.error.message}
          </p>
        ) : null}
        {!patientsRes.error && patients.length === 0 ? (
          <p className="notice" style={{ marginTop: "0.75rem" }}>
            No patients available. Create a patient first in the Patients section.
          </p>
        ) : null}
        <form action={createAppointment} className="stack" style={{ marginTop: "0.8rem" }}>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="patient_id">Patient</label>
              <select id="patient_id" name="patient_id" required>
                <option value="">Select patient</option>
                {patients.map((patient) => (
                  <option key={patient.id} value={patient.id}>
                    {patientDisplayName(patient)}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label htmlFor="provider_name">Provider</label>
              <input id="provider_name" name="provider_name" required placeholder="Dr. Alice Carter" />
            </div>

            <div className="field">
              <label htmlFor="scheduled_at">Date & Time</label>
              <input id="scheduled_at" name="scheduled_at" type="datetime-local" required />
            </div>

            <div className="field">
              <label htmlFor="status">Status</label>
              <select id="status" name="status" defaultValue="scheduled">
                {statuses.map((status) => (
                  <option key={status} value={status}>
                    {status.replace("_", " ")}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="field">
            <label htmlFor="notes">Notes</label>
            <textarea id="notes" name="notes" placeholder="Reason for visit, reminders, prep details..." />
          </div>

          <div className="form-actions">
            <button type="submit" className="button">
              Save Appointment
            </button>
          </div>
        </form>
      </article>

      <article className="panel">
        <h3>Appointment Calendar List</h3>

        {appointmentsRes.error ? (
          <p className="notice notice-error">Failed to load appointments: {appointmentsRes.error.message}</p>
        ) : null}

        {!appointmentsRes.error && appointments.length === 0 ? (
          <p className="notice">No appointments scheduled.</p>
        ) : null}

        {appointments.length > 0 ? (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Patient</th>
                  <th>Provider</th>
                  <th>Status</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {appointments.map((appointment) => (
                  <tr key={appointment.id}>
                    <td>{formatDateTime(appointment.scheduled_at)}</td>
                    <td>{patientMap.get(appointment.patient_id) ?? appointment.patient_id}</td>
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
