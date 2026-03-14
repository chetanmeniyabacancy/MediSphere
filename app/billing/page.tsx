import { revalidatePath } from "next/cache";
import { writeAuditEvent } from "@/lib/audit";
import { PageHeader } from "@/components/page-header";
import { formatCurrency, formatDate, patientDisplayName } from "@/lib/format";
import { getSupabaseConfigError, getSupabaseServerClient } from "@/lib/supabase/client";
import type { BillingClaim, ClaimStatus, Patient } from "@/lib/types";

export const dynamic = "force-dynamic";

const claimStatuses: ClaimStatus[] = ["draft", "submitted", "paid", "rejected"];

async function createClaim(formData: FormData) {
  "use server";

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return;
  }

  const patientId = String(formData.get("patient_id") ?? "").trim();
  const cptCode = String(formData.get("cpt_code") ?? "").trim();
  const icd10Code = String(formData.get("icd10_code") ?? "").trim();
  const amountRaw = String(formData.get("amount") ?? "").trim();
  const status = String(formData.get("status") ?? "draft") as ClaimStatus;

  if (!patientId || !cptCode || !icd10Code || !amountRaw) {
    return;
  }

  const amount = Number.parseFloat(amountRaw);
  if (!Number.isFinite(amount)) {
    return;
  }

  const insertRes = await supabase
    .from("billing_claims")
    .insert({
      patient_id: patientId,
      cpt_code: cptCode,
      icd10_code: icd10Code,
      amount,
      status: claimStatuses.includes(status) ? status : "draft",
    })
    .select("id")
    .single();

  if (!insertRes.error && insertRes.data?.id) {
    await writeAuditEvent(supabase, {
      action: "billing_claim.create",
      actor_role: "billing",
      entity_type: "billing_claims",
      entity_id: insertRes.data.id,
      metadata: { patient_id: patientId, cpt_code: cptCode, icd10_code: icd10Code },
    });
  }

  revalidatePath("/");
  revalidatePath("/billing");
  revalidatePath("/reports");
}

export default async function BillingPage() {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return (
      <section className="stack">
        <PageHeader
          title="Billing"
          description="CPT/ICD10 claim operations and revenue cycle tracking."
        />
        <div className="panel">
          <p className="notice notice-error">{getSupabaseConfigError()}</p>
        </div>
      </section>
    );
  }

  const [patientsRes, claimsRes] = await Promise.all([
    supabase.from("patients").select("id, first_name, last_name").order("first_name", { ascending: true }),
    supabase
      .from("billing_claims")
      .select("id, patient_id, cpt_code, icd10_code, amount, status, created_at")
      .order("created_at", { ascending: false })
      .limit(150),
  ]);

  const patients = (patientsRes.data ?? []) as Patient[];
  const claims = (claimsRes.data ?? []) as BillingClaim[];
  const patientMap = new Map<string, string>(patients.map((patient) => [patient.id, patientDisplayName(patient)]));

  return (
    <section className="stack">
      <PageHeader
        title="Billing"
        description="Generate and monitor claims with coding and payment status visibility."
      />

      <article className="panel">
        <h3>Create Billing Claim</h3>
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
        <form action={createClaim} className="stack" style={{ marginTop: "0.8rem" }}>
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
              <label htmlFor="cpt_code">CPT Code</label>
              <input id="cpt_code" name="cpt_code" required placeholder="99213" />
            </div>

            <div className="field">
              <label htmlFor="icd10_code">ICD-10 Code</label>
              <input id="icd10_code" name="icd10_code" required placeholder="E11.9" />
            </div>

            <div className="field">
              <label htmlFor="amount">Amount (USD)</label>
              <input id="amount" name="amount" type="number" min="0" step="0.01" required />
            </div>

            <div className="field">
              <label htmlFor="status">Claim Status</label>
              <select id="status" name="status" defaultValue="draft">
                {claimStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" className="button">
              Save Claim
            </button>
          </div>
        </form>
      </article>

      <article className="panel">
        <h3>Recent Claims</h3>

        {claimsRes.error ? <p className="notice notice-error">Failed to load claims: {claimsRes.error.message}</p> : null}

        {!claimsRes.error && claims.length === 0 ? <p className="notice">No claims recorded yet.</p> : null}

        {claims.length > 0 ? (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Created</th>
                  <th>Patient</th>
                  <th>CPT</th>
                  <th>ICD-10</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {claims.map((claim) => (
                  <tr key={claim.id}>
                    <td>{formatDate(claim.created_at)}</td>
                    <td>{patientMap.get(claim.patient_id) ?? claim.patient_id}</td>
                    <td>{claim.cpt_code}</td>
                    <td>{claim.icd10_code}</td>
                    <td>{formatCurrency(claim.amount)}</td>
                    <td>
                      <span className="badge">{claim.status}</span>
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
