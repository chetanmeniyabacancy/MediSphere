import { revalidatePath } from "next/cache";
import { writeAuditEvent } from "@/lib/audit";
import { PageHeader } from "@/components/page-header";
import { formatDate, patientDisplayName } from "@/lib/format";
import { getSupabaseConfigError, getSupabaseServerClient } from "@/lib/supabase/client";
import type { ClinicalNote, Patient } from "@/lib/types";

export const dynamic = "force-dynamic";

async function addClinicalNote(formData: FormData) {
  "use server";

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return;
  }

  const patientId = String(formData.get("patient_id") ?? "").trim();
  const providerName = String(formData.get("provider_name") ?? "").trim();
  const encounterDate = String(formData.get("encounter_date") ?? "").trim();
  const diagnosisCode = String(formData.get("diagnosis_code") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();

  if (!patientId || !providerName || !encounterDate || !note) {
    return;
  }

  const insertRes = await supabase
    .from("clinical_notes")
    .insert({
      patient_id: patientId,
      provider_name: providerName,
      encounter_date: encounterDate,
      diagnosis_code: diagnosisCode || null,
      note,
    })
    .select("id")
    .single();

  if (!insertRes.error && insertRes.data?.id) {
    await writeAuditEvent(supabase, {
      action: "clinical_note.create",
      actor_role: "provider",
      entity_type: "clinical_notes",
      entity_id: insertRes.data.id,
      metadata: { patient_id: patientId, diagnosis_code: diagnosisCode || null },
    });
  }

  revalidatePath("/");
  revalidatePath("/medical-records");
}

export default async function MedicalRecordsPage() {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return (
      <section className="stack">
        <PageHeader
          title="Medical Records"
          description="Clinical documentation and coding support for every patient encounter."
        />
        <div className="panel">
          <p className="notice notice-error">{getSupabaseConfigError()}</p>
        </div>
      </section>
    );
  }

  const [patientsRes, notesRes] = await Promise.all([
    supabase.from("patients").select("id, first_name, last_name").order("first_name", { ascending: true }),
    supabase
      .from("clinical_notes")
      .select("id, patient_id, provider_name, encounter_date, diagnosis_code, note")
      .order("encounter_date", { ascending: false })
      .limit(120),
  ]);

  const patients = (patientsRes.data ?? []) as Patient[];
  const notes = (notesRes.data ?? []) as ClinicalNote[];
  const patientMap = new Map<string, string>(patients.map((patient) => [patient.id, patientDisplayName(patient)]));

  return (
    <section className="stack">
      <PageHeader
        title="Medical Records"
        description="Capture clinical notes with diagnosis coding and provider details."
      />

      <article className="panel">
        <h3>Add Clinical Note</h3>
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
        <form action={addClinicalNote} className="stack" style={{ marginTop: "0.8rem" }}>
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
              <label htmlFor="encounter_date">Encounter Date</label>
              <input id="encounter_date" name="encounter_date" type="date" required />
            </div>

            <div className="field">
              <label htmlFor="diagnosis_code">Diagnosis Code (ICD-10)</label>
              <input id="diagnosis_code" name="diagnosis_code" placeholder="E11.9" />
            </div>
          </div>

          <div className="field">
            <label htmlFor="note">Clinical Note</label>
            <textarea id="note" name="note" required placeholder="Visit summary, findings, treatment plan, follow-up..." />
          </div>

          <div className="form-actions">
            <button type="submit" className="button">
              Save Note
            </button>
          </div>
        </form>
      </article>

      <article className="panel">
        <h3>Recent Clinical Notes</h3>

        {notesRes.error ? <p className="notice notice-error">Failed to load notes: {notesRes.error.message}</p> : null}

        {!notesRes.error && notes.length === 0 ? <p className="notice">No clinical notes found.</p> : null}

        {notes.length > 0 ? (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Patient</th>
                  <th>Provider</th>
                  <th>Diagnosis</th>
                  <th>Note</th>
                </tr>
              </thead>
              <tbody>
                {notes.map((entry) => (
                  <tr key={entry.id}>
                    <td>{formatDate(entry.encounter_date)}</td>
                    <td>{patientMap.get(entry.patient_id) ?? entry.patient_id}</td>
                    <td>{entry.provider_name}</td>
                    <td>{entry.diagnosis_code || "-"}</td>
                    <td>{entry.note}</td>
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
