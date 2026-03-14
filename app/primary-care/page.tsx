import { revalidatePath } from "next/cache";
import { PageHeader } from "@/components/page-header";
import { writeAuditEvent } from "@/lib/audit";
import {
  buildPrimaryCareNote,
  diagnosisCodeForTemplate,
  primaryCareRecommendations,
  type PrimaryCareTemplateId,
} from "@/lib/primary-care";
import { formatDate, patientDisplayName } from "@/lib/format";
import { getSupabaseConfigError, getSupabaseServerClient } from "@/lib/supabase/client";
import type { CareGapStatus, Patient, PrimaryCareGap } from "@/lib/types";

export const dynamic = "force-dynamic";

const careGapStatuses: CareGapStatus[] = ["open", "completed", "dismissed"];
const templateIds: PrimaryCareTemplateId[] = [
  "annual_wellness",
  "hypertension_followup",
  "diabetes_followup",
  "preventive_visit",
];

async function createTemplateNote(formData: FormData) {
  "use server";

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return;
  }

  const patientId = String(formData.get("patient_id") ?? "").trim();
  const providerName = String(formData.get("provider_name") ?? "").trim();
  const template = String(formData.get("template_id") ?? "") as PrimaryCareTemplateId;
  const subjective = String(formData.get("subjective") ?? "").trim();
  const objective = String(formData.get("objective") ?? "").trim();
  const assessment = String(formData.get("assessment") ?? "").trim();
  const plan = String(formData.get("plan") ?? "").trim();
  const bloodPressure = String(formData.get("blood_pressure") ?? "").trim();
  const bmi = String(formData.get("bmi") ?? "").trim();
  const a1c = String(formData.get("a1c") ?? "").trim();
  const smokingStatus = String(formData.get("smoking_status") ?? "").trim();

  if (!patientId || !providerName || !template || !subjective || !assessment || !plan) {
    return;
  }

  if (!templateIds.includes(template)) {
    return;
  }

  const note = buildPrimaryCareNote(template, {
    subjective,
    objective,
    assessment,
    plan,
    bloodPressure: bloodPressure || undefined,
    bmi: bmi || undefined,
    a1c: a1c || undefined,
    smokingStatus: smokingStatus || undefined,
  });

  const encounterDate = new Date().toISOString().slice(0, 10);

  const insertRes = await supabase
    .from("clinical_notes")
    .insert({
      patient_id: patientId,
      provider_name: providerName,
      encounter_date: encounterDate,
      diagnosis_code: diagnosisCodeForTemplate(template),
      note,
    })
    .select("id")
    .single();

  if (!insertRes.error && insertRes.data?.id) {
    await writeAuditEvent(supabase, {
      action: "clinical_note.create_template",
      actor_role: "provider",
      entity_type: "clinical_notes",
      entity_id: insertRes.data.id,
      metadata: { template, patient_id: patientId },
    });
  }

  const patientRes = await supabase
    .from("patients")
    .select("dob")
    .eq("id", patientId)
    .limit(1);

  const patientDob = (patientRes.data ?? [])[0]?.dob;
  if (patientDob) {
    const suggestedGaps = primaryCareRecommendations(patientDob);

    for (const gap of suggestedGaps) {
      const existing = await supabase
        .from("primary_care_gaps")
        .select("id")
        .eq("patient_id", patientId)
        .eq("gap_type", gap.gap_type)
        .eq("status", "open")
        .limit(1);

      if ((existing.data ?? []).length > 0) {
        continue;
      }

      await supabase.from("primary_care_gaps").insert({
        patient_id: patientId,
        gap_type: gap.gap_type,
        due_date: gap.due_date,
        status: "open",
        notes: gap.rationale,
      });
    }
  }

  revalidatePath("/medical-records");
  revalidatePath("/primary-care");
  revalidatePath("/reports");
}

async function createCareGap(formData: FormData) {
  "use server";

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return;
  }

  const patientId = String(formData.get("patient_id") ?? "").trim();
  const gapType = String(formData.get("gap_type") ?? "").trim();
  const dueDate = String(formData.get("due_date") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  if (!patientId || !gapType || !dueDate) {
    return;
  }

  const insertRes = await supabase
    .from("primary_care_gaps")
    .insert({
      patient_id: patientId,
      gap_type: gapType,
      due_date: dueDate,
      status: "open",
      notes: notes || null,
    })
    .select("id")
    .single();

  if (!insertRes.error && insertRes.data?.id) {
    await writeAuditEvent(supabase, {
      action: "primary_care_gap.create",
      actor_role: "provider",
      entity_type: "primary_care_gaps",
      entity_id: insertRes.data.id,
      metadata: { patient_id: patientId, gap_type: gapType },
    });
  }

  revalidatePath("/primary-care");
  revalidatePath("/reports");
}

async function updateCareGapStatus(formData: FormData) {
  "use server";

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return;
  }

  const gapId = String(formData.get("gap_id") ?? "").trim();
  const status = String(formData.get("status") ?? "open") as CareGapStatus;

  if (!gapId || !careGapStatuses.includes(status)) {
    return;
  }

  const updateRes = await supabase
    .from("primary_care_gaps")
    .update({ status })
    .eq("id", gapId)
    .select("id")
    .single();

  if (!updateRes.error && updateRes.data?.id) {
    await writeAuditEvent(supabase, {
      action: "primary_care_gap.update_status",
      actor_role: "provider",
      entity_type: "primary_care_gaps",
      entity_id: updateRes.data.id,
      metadata: { status },
    });
  }

  revalidatePath("/primary-care");
  revalidatePath("/reports");
}

type SearchParams = Record<string, string | string[] | undefined>;

function getSearchValue(searchParams: SearchParams | undefined, key: string): string {
  const value = searchParams?.[key];
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

export default async function PrimaryCarePage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const supabase = getSupabaseServerClient();
  const selectedPatientId = getSearchValue(searchParams, "patientId").trim();

  if (!supabase) {
    return (
      <section className="stack">
        <PageHeader
          title="Primary Care"
          description="Template-driven primary care workflows and preventive care tracking."
        />
        <div className="panel">
          <p className="notice notice-error">{getSupabaseConfigError()}</p>
        </div>
      </section>
    );
  }

  const [patientsRes, gapsRes] = await Promise.all([
    supabase
      .from("patients")
      .select("id, first_name, last_name, dob")
      .order("first_name", { ascending: true }),
    supabase
      .from("primary_care_gaps")
      .select("id, patient_id, gap_type, due_date, status, notes, created_at")
      .order("due_date", { ascending: true })
      .limit(200),
  ]);

  const patients = (patientsRes.data ?? []) as Patient[];
  const patientMap = new Map<string, Patient>(patients.map((patient) => [patient.id, patient]));
  const gaps = (gapsRes.data ?? []) as PrimaryCareGap[];

  const selectedPatient = selectedPatientId ? patientMap.get(selectedPatientId) ?? null : null;
  const recommendations = selectedPatient ? primaryCareRecommendations(selectedPatient.dob) : [];

  return (
    <section className="stack">
      <PageHeader
        title="Primary Care"
        description="Primary-care templates and preventive care gap workflows for routine practice operations."
      />

      <article className="panel">
        <h3>Create Template-Based Clinical Note</h3>
        {patientsRes.error ? (
          <p className="notice notice-error" style={{ marginTop: "0.75rem" }}>
            Failed to load patients: {patientsRes.error.message}
          </p>
        ) : null}
        <form action={createTemplateNote} className="stack" style={{ marginTop: "0.8rem" }}>
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
              <label htmlFor="template_id">Template</label>
              <select id="template_id" name="template_id" defaultValue="annual_wellness">
                {templateIds.map((template) => (
                  <option key={template} value={template}>
                    {template.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label htmlFor="blood_pressure">Blood Pressure</label>
              <input id="blood_pressure" name="blood_pressure" placeholder="128/82" />
            </div>

            <div className="field">
              <label htmlFor="bmi">BMI</label>
              <input id="bmi" name="bmi" placeholder="26.1" />
            </div>

            <div className="field">
              <label htmlFor="a1c">A1c</label>
              <input id="a1c" name="a1c" placeholder="6.5%" />
            </div>

            <div className="field">
              <label htmlFor="smoking_status">Smoking Status</label>
              <input id="smoking_status" name="smoking_status" placeholder="Never smoker" />
            </div>
          </div>

          <div className="field">
            <label htmlFor="subjective">Subjective</label>
            <textarea id="subjective" name="subjective" required />
          </div>

          <div className="field">
            <label htmlFor="objective">Objective</label>
            <textarea id="objective" name="objective" />
          </div>

          <div className="field">
            <label htmlFor="assessment">Assessment</label>
            <textarea id="assessment" name="assessment" required />
          </div>

          <div className="field">
            <label htmlFor="plan">Plan</label>
            <textarea id="plan" name="plan" required />
          </div>

          <div className="form-actions">
            <button type="submit" className="button">
              Save Template Note
            </button>
          </div>
        </form>
      </article>

      <article className="panel">
        <h3>Preventive Care Recommendation Helper</h3>
        <form method="get" className="form-grid" style={{ marginTop: "0.75rem" }}>
          <div className="field">
            <label htmlFor="patientId">Select Patient</label>
            <select id="patientId" name="patientId" defaultValue={selectedPatientId}>
              <option value="">Choose patient</option>
              {patients.map((patient) => (
                <option key={patient.id} value={patient.id}>
                  {patientDisplayName(patient)}
                </option>
              ))}
            </select>
          </div>
          <div className="form-actions">
            <button type="submit" className="button button-secondary">
              Load Recommendations
            </button>
          </div>
        </form>

        {selectedPatient ? (
          <div className="stack" style={{ marginTop: "0.9rem" }}>
            <p className="small">Recommendations for {patientDisplayName(selectedPatient)}</p>
            {recommendations.map((recommendation) => (
              <form
                key={`${recommendation.gap_type}-${recommendation.due_date}`}
                action={createCareGap}
                className="notice"
              >
                <input type="hidden" name="patient_id" value={selectedPatient.id} />
                <input type="hidden" name="gap_type" value={recommendation.gap_type} />
                <input type="hidden" name="due_date" value={recommendation.due_date} />
                <input type="hidden" name="notes" value={recommendation.rationale} />
                <div>
                  <strong>{recommendation.gap_type}</strong>
                </div>
                <div className="small">Due: {formatDate(recommendation.due_date)}</div>
                <div className="small">{recommendation.rationale}</div>
                <div className="form-actions" style={{ marginTop: "0.5rem" }}>
                  <button type="submit" className="button button-secondary">
                    Add As Care Gap
                  </button>
                </div>
              </form>
            ))}
          </div>
        ) : (
          <p className="notice" style={{ marginTop: "0.85rem" }}>
            Choose a patient to see preventive care recommendations.
          </p>
        )}
      </article>

      <article className="panel">
        <h3>Care Gaps</h3>

        {gapsRes.error ? <p className="notice notice-error">Failed to load care gaps: {gapsRes.error.message}</p> : null}

        {!gapsRes.error && gaps.length === 0 ? (
          <p className="notice">No care gaps created yet.</p>
        ) : null}

        {gaps.length > 0 ? (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Gap</th>
                  <th>Due Date</th>
                  <th>Status</th>
                  <th>Notes</th>
                  <th>Update</th>
                </tr>
              </thead>
              <tbody>
                {gaps.map((gap) => (
                  <tr key={gap.id}>
                    <td>{patientDisplayName(patientMap.get(gap.patient_id) ?? { first_name: "Unknown", last_name: "" })}</td>
                    <td>{gap.gap_type}</td>
                    <td>{formatDate(gap.due_date)}</td>
                    <td>
                      <span className="badge">{gap.status}</span>
                    </td>
                    <td>{gap.notes || "-"}</td>
                    <td>
                      <form action={updateCareGapStatus} className="inline-links">
                        <input type="hidden" name="gap_id" value={gap.id} />
                        <select name="status" defaultValue={gap.status}>
                          {careGapStatuses.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                        <button type="submit" className="button button-secondary">
                          Save
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
