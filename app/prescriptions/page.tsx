import { revalidatePath } from "next/cache";
import { PageHeader } from "@/components/page-header";
import { writeAuditEvent } from "@/lib/audit";
import {
  collapseSafetyAlerts,
  evaluatePrescriptionSafety,
  suggestedPrescriptionStatus,
} from "@/lib/prescription-safety";
import { formatDate, patientDisplayName } from "@/lib/format";
import { getSupabaseConfigError, getSupabaseServerClient } from "@/lib/supabase/client";
import type {
  AllergySeverity,
  Patient,
  PatientAllergy,
  Prescription,
  PrescriptionStatus,
} from "@/lib/types";

export const dynamic = "force-dynamic";

const allergySeverities: AllergySeverity[] = ["mild", "moderate", "severe"];
const prescriptionStatuses: PrescriptionStatus[] = ["active", "pending_review", "stopped"];

async function addAllergy(formData: FormData) {
  "use server";

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return;
  }

  const patientId = String(formData.get("patient_id") ?? "").trim();
  const allergen = String(formData.get("allergen") ?? "").trim();
  const reaction = String(formData.get("reaction") ?? "").trim();
  const severity = String(formData.get("severity") ?? "moderate") as AllergySeverity;

  if (!patientId || !allergen || !allergySeverities.includes(severity)) {
    return;
  }

  const insertRes = await supabase
    .from("patient_allergies")
    .insert({
      patient_id: patientId,
      allergen,
      reaction: reaction || null,
      severity,
    })
    .select("id")
    .single();

  if (!insertRes.error && insertRes.data?.id) {
    await writeAuditEvent(supabase, {
      action: "allergy.create",
      actor_role: "provider",
      entity_type: "patient_allergies",
      entity_id: insertRes.data.id,
      metadata: { patient_id: patientId, allergen },
    });
  }

  revalidatePath("/prescriptions");
  revalidatePath("/reports");
}

async function createPrescription(formData: FormData) {
  "use server";

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return;
  }

  const patientId = String(formData.get("patient_id") ?? "").trim();
  const prescribedBy = String(formData.get("prescribed_by") ?? "").trim();
  const medicationName = String(formData.get("medication_name") ?? "").trim();
  const dosage = String(formData.get("dosage") ?? "").trim();
  const frequency = String(formData.get("frequency") ?? "").trim();
  const route = String(formData.get("route") ?? "").trim();
  const startDate = String(formData.get("start_date") ?? "").trim();
  const endDate = String(formData.get("end_date") ?? "").trim();
  const instructions = String(formData.get("instructions") ?? "").trim();

  if (!patientId || !prescribedBy || !medicationName || !dosage || !frequency || !startDate) {
    return;
  }

  const [allergiesRes, activeRxRes] = await Promise.all([
    supabase
      .from("patient_allergies")
      .select("allergen, reaction, severity")
      .eq("patient_id", patientId),
    supabase
      .from("prescriptions")
      .select("medication_name, dosage")
      .eq("patient_id", patientId)
      .in("status", ["active", "pending_review"]),
  ]);

  const alerts = evaluatePrescriptionSafety({
    medicationName,
    allergies: (allergiesRes.data ?? []).map((allergy) => ({
      allergen: allergy.allergen,
      reaction: allergy.reaction,
      severity: allergy.severity,
    })),
    activeMedications: (activeRxRes.data ?? []).map((rx) => ({
      medication_name: rx.medication_name,
      dosage: rx.dosage,
    })),
  });

  const insertRes = await supabase
    .from("prescriptions")
    .insert({
      patient_id: patientId,
      prescribed_by: prescribedBy,
      medication_name: medicationName,
      dosage,
      frequency,
      route: route || null,
      start_date: startDate,
      end_date: endDate || null,
      instructions: instructions || null,
      status: suggestedPrescriptionStatus(alerts),
      safety_alerts: collapseSafetyAlerts(alerts),
    })
    .select("id")
    .single();

  if (!insertRes.error && insertRes.data?.id) {
    await writeAuditEvent(supabase, {
      action: "prescription.create",
      actor_role: "provider",
      entity_type: "prescriptions",
      entity_id: insertRes.data.id,
      metadata: {
        patient_id: patientId,
        medication_name: medicationName,
        alert_count: alerts.length,
      },
    });
  }

  revalidatePath("/prescriptions");
  revalidatePath("/reports");
}

async function updatePrescriptionStatus(formData: FormData) {
  "use server";

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return;
  }

  const prescriptionId = String(formData.get("prescription_id") ?? "").trim();
  const status = String(formData.get("status") ?? "active") as PrescriptionStatus;

  if (!prescriptionId || !prescriptionStatuses.includes(status)) {
    return;
  }

  const updateRes = await supabase
    .from("prescriptions")
    .update({ status })
    .eq("id", prescriptionId)
    .select("id")
    .single();

  if (!updateRes.error && updateRes.data?.id) {
    await writeAuditEvent(supabase, {
      action: "prescription.update_status",
      actor_role: "provider",
      entity_type: "prescriptions",
      entity_id: updateRes.data.id,
      metadata: { status },
    });
  }

  revalidatePath("/prescriptions");
  revalidatePath("/reports");
}

export default async function PrescriptionsPage() {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return (
      <section className="stack">
        <PageHeader
          title="Prescriptions"
          description="Primary care e-prescribing with allergy and interaction safety checks."
        />
        <div className="panel">
          <p className="notice notice-error">{getSupabaseConfigError()}</p>
        </div>
      </section>
    );
  }

  const [patientsRes, prescriptionsRes, allergiesRes] = await Promise.all([
    supabase
      .from("patients")
      .select("id, first_name, last_name")
      .order("first_name", { ascending: true }),
    supabase
      .from("prescriptions")
      .select("id, patient_id, prescribed_by, medication_name, dosage, frequency, route, start_date, end_date, instructions, status, safety_alerts, created_at")
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("patient_allergies")
      .select("id, patient_id, allergen, reaction, severity, created_at")
      .order("created_at", { ascending: false })
      .limit(200),
  ]);

  const patients = (patientsRes.data ?? []) as Patient[];
  const patientMap = new Map<string, Patient>(patients.map((patient) => [patient.id, patient]));

  const prescriptions = (prescriptionsRes.data ?? []) as Prescription[];
  const allergies = (allergiesRes.data ?? []) as PatientAllergy[];

  return (
    <section className="stack">
      <PageHeader
        title="Prescriptions"
        description="Primary-care e-prescribing workflow with safety-aware medication management."
      />

      <article className="panel">
        <h3>Add Patient Allergy</h3>
        <form action={addAllergy} className="stack" style={{ marginTop: "0.8rem" }}>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="allergy_patient_id">Patient</label>
              <select id="allergy_patient_id" name="patient_id" required>
                <option value="">Select patient</option>
                {patients.map((patient) => (
                  <option key={patient.id} value={patient.id}>
                    {patientDisplayName(patient)}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label htmlFor="allergen">Allergen</label>
              <input id="allergen" name="allergen" required placeholder="Penicillin" />
            </div>

            <div className="field">
              <label htmlFor="reaction">Reaction</label>
              <input id="reaction" name="reaction" placeholder="Rash" />
            </div>

            <div className="field">
              <label htmlFor="severity">Severity</label>
              <select id="severity" name="severity" defaultValue="moderate">
                {allergySeverities.map((severity) => (
                  <option key={severity} value={severity}>
                    {severity}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" className="button">
              Save Allergy
            </button>
          </div>
        </form>
      </article>

      <article className="panel">
        <h3>Create Prescription</h3>
        {patientsRes.error ? (
          <p className="notice notice-error" style={{ marginTop: "0.75rem" }}>
            Failed to load patients: {patientsRes.error.message}
          </p>
        ) : null}

        <form action={createPrescription} className="stack" style={{ marginTop: "0.8rem" }}>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="rx_patient_id">Patient</label>
              <select id="rx_patient_id" name="patient_id" required>
                <option value="">Select patient</option>
                {patients.map((patient) => (
                  <option key={patient.id} value={patient.id}>
                    {patientDisplayName(patient)}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label htmlFor="prescribed_by">Prescribed By</label>
              <input id="prescribed_by" name="prescribed_by" required placeholder="Dr. Alice Carter" />
            </div>

            <div className="field">
              <label htmlFor="medication_name">Medication</label>
              <input id="medication_name" name="medication_name" required placeholder="Lisinopril" />
            </div>

            <div className="field">
              <label htmlFor="dosage">Dosage</label>
              <input id="dosage" name="dosage" required placeholder="10 mg" />
            </div>

            <div className="field">
              <label htmlFor="frequency">Frequency</label>
              <input id="frequency" name="frequency" required placeholder="Once daily" />
            </div>

            <div className="field">
              <label htmlFor="route">Route</label>
              <input id="route" name="route" placeholder="Oral" />
            </div>

            <div className="field">
              <label htmlFor="start_date">Start Date</label>
              <input id="start_date" name="start_date" type="date" required />
            </div>

            <div className="field">
              <label htmlFor="end_date">End Date</label>
              <input id="end_date" name="end_date" type="date" />
            </div>
          </div>

          <div className="field">
            <label htmlFor="instructions">Instructions</label>
            <textarea id="instructions" name="instructions" placeholder="Take with food. Monitor blood pressure weekly." />
          </div>

          <div className="form-actions">
            <button type="submit" className="button">
              Save Prescription
            </button>
          </div>
        </form>
      </article>

      <article className="panel">
        <h3>Allergy Registry</h3>
        {allergiesRes.error ? (
          <p className="notice notice-error">Failed to load allergies: {allergiesRes.error.message}</p>
        ) : null}

        {!allergiesRes.error && allergies.length === 0 ? (
          <p className="notice">No allergies recorded.</p>
        ) : null}

        {allergies.length > 0 ? (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Allergen</th>
                  <th>Reaction</th>
                  <th>Severity</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {allergies.map((allergy) => (
                  <tr key={allergy.id}>
                    <td>{patientDisplayName(patientMap.get(allergy.patient_id) ?? { first_name: "Unknown", last_name: "" })}</td>
                    <td>{allergy.allergen}</td>
                    <td>{allergy.reaction || "-"}</td>
                    <td>
                      <span className="badge">{allergy.severity}</span>
                    </td>
                    <td>{formatDate(allergy.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </article>

      <article className="panel">
        <h3>Prescription Ledger</h3>
        {prescriptionsRes.error ? (
          <p className="notice notice-error">Failed to load prescriptions: {prescriptionsRes.error.message}</p>
        ) : null}

        {!prescriptionsRes.error && prescriptions.length === 0 ? (
          <p className="notice">No prescriptions found.</p>
        ) : null}

        {prescriptions.length > 0 ? (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Medication</th>
                  <th>Dose/Frequency</th>
                  <th>Dates</th>
                  <th>Status</th>
                  <th>Safety</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {prescriptions.map((rx) => (
                  <tr key={rx.id}>
                    <td>{patientDisplayName(patientMap.get(rx.patient_id) ?? { first_name: "Unknown", last_name: "" })}</td>
                    <td>
                      <div>{rx.medication_name}</div>
                      <div className="small">By {rx.prescribed_by}</div>
                    </td>
                    <td>
                      <div>{rx.dosage}</div>
                      <div className="small">{rx.frequency}</div>
                    </td>
                    <td>
                      <div>{formatDate(rx.start_date)}</div>
                      <div className="small">to {rx.end_date ? formatDate(rx.end_date) : "ongoing"}</div>
                    </td>
                    <td>
                      <span className="badge">{rx.status}</span>
                    </td>
                    <td>{rx.safety_alerts || "No known alert"}</td>
                    <td>
                      <form action={updatePrescriptionStatus} className="inline-links">
                        <input type="hidden" name="prescription_id" value={rx.id} />
                        <select name="status" defaultValue={rx.status}>
                          {prescriptionStatuses.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                        <button type="submit" className="button button-secondary">
                          Update
                        </button>
                      </form>
                    </td>
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
