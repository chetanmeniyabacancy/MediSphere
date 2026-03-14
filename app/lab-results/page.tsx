import { revalidatePath } from "next/cache";
import { writeAuditEvent } from "@/lib/audit";
import { PageHeader } from "@/components/page-header";
import { formatDate, patientDisplayName } from "@/lib/format";
import { getSupabaseConfigError, getSupabaseServerClient } from "@/lib/supabase/client";
import type { LabResult, Patient } from "@/lib/types";

export const dynamic = "force-dynamic";

async function createLabResult(formData: FormData) {
  "use server";

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return;
  }

  const patientId = String(formData.get("patient_id") ?? "").trim();
  const testName = String(formData.get("test_name") ?? "").trim();
  const resultValue = String(formData.get("result_value") ?? "").trim();
  const referenceRange = String(formData.get("reference_range") ?? "").trim();
  const collectedAt = String(formData.get("collected_at") ?? "").trim();

  if (!patientId || !testName || !resultValue || !collectedAt) {
    return;
  }

  const insertRes = await supabase
    .from("lab_results")
    .insert({
      patient_id: patientId,
      test_name: testName,
      result_value: resultValue,
      reference_range: referenceRange || null,
      collected_at: collectedAt,
    })
    .select("id")
    .single();

  if (!insertRes.error && insertRes.data?.id) {
    await writeAuditEvent(supabase, {
      action: "lab_result.create",
      actor_role: "provider",
      entity_type: "lab_results",
      entity_id: insertRes.data.id,
      metadata: { patient_id: patientId, test_name: testName },
    });
  }

  revalidatePath("/");
  revalidatePath("/lab-results");
  revalidatePath("/patient-portal/lab-results");
}

export default async function LabResultsPage() {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return (
      <section className="stack">
        <PageHeader
          title="Lab Results"
          description="Order and review patient lab results with trend visibility."
        />
        <div className="panel">
          <p className="notice notice-error">{getSupabaseConfigError()}</p>
        </div>
      </section>
    );
  }

  const [patientsRes, labsRes] = await Promise.all([
    supabase.from("patients").select("id, first_name, last_name").order("first_name", { ascending: true }),
    supabase
      .from("lab_results")
      .select("id, patient_id, test_name, result_value, reference_range, collected_at")
      .order("collected_at", { ascending: false })
      .limit(150),
  ]);

  const patients = (patientsRes.data ?? []) as Patient[];
  const labs = (labsRes.data ?? []) as LabResult[];
  const patientMap = new Map<string, string>(patients.map((patient) => [patient.id, patientDisplayName(patient)]));

  return (
    <section className="stack">
      <PageHeader
        title="Lab Results"
        description="Capture and monitor lab findings with patient-level context."
      />

      <article className="panel">
        <h3>Add Lab Result</h3>
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
        <form action={createLabResult} className="stack" style={{ marginTop: "0.8rem" }}>
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
              <label htmlFor="test_name">Test Name</label>
              <input id="test_name" name="test_name" required placeholder="HbA1c" />
            </div>

            <div className="field">
              <label htmlFor="result_value">Result Value</label>
              <input id="result_value" name="result_value" required placeholder="6.3%" />
            </div>

            <div className="field">
              <label htmlFor="reference_range">Reference Range</label>
              <input id="reference_range" name="reference_range" placeholder="4.0% - 5.6%" />
            </div>

            <div className="field">
              <label htmlFor="collected_at">Collected On</label>
              <input id="collected_at" name="collected_at" type="date" required />
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" className="button">
              Save Result
            </button>
          </div>
        </form>
      </article>

      <article className="panel">
        <h3>Recent Lab Results</h3>

        {labsRes.error ? <p className="notice notice-error">Failed to load lab results: {labsRes.error.message}</p> : null}

        {!labsRes.error && labs.length === 0 ? <p className="notice">No lab results found.</p> : null}

        {labs.length > 0 ? (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Patient</th>
                  <th>Test</th>
                  <th>Result</th>
                  <th>Reference Range</th>
                </tr>
              </thead>
              <tbody>
                {labs.map((lab) => (
                  <tr key={lab.id}>
                    <td>{formatDate(lab.collected_at)}</td>
                    <td>{patientMap.get(lab.patient_id) ?? lab.patient_id}</td>
                    <td>{lab.test_name}</td>
                    <td>{lab.result_value}</td>
                    <td>{lab.reference_range || "-"}</td>
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
