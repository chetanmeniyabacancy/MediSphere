import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { getLoggedInPatient } from "@/lib/auth/patient-session";
import { formatDate, patientDisplayName } from "@/lib/format";
import { getSupabaseConfigError, getSupabaseServerClient } from "@/lib/supabase/client";
import type { LabResult } from "@/lib/types";

export default async function PortalLabResultsPage() {
  const supabase = getSupabaseServerClient();
  const patient = await getLoggedInPatient();

  if (!supabase) {
    return (
      <section className="stack">
        <PageHeader title="Portal Lab Results" description="Patient access to laboratory reports and values." />
        <div className="panel">
          <p className="notice notice-error">{getSupabaseConfigError()}</p>
        </div>
      </section>
    );
  }

  if (!patient) {
    return (
      <section className="stack">
        <PageHeader title="Portal Lab Results" description="Patient access to laboratory reports and values." />
        <article className="panel">
          <p className="notice">Please log in to view your lab results.</p>
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
    .from("lab_results")
    .select("id, patient_id, test_name, result_value, reference_range, collected_at")
    .eq("patient_id", patient.id)
    .order("collected_at", { ascending: false });

  const labs = (data ?? []) as LabResult[];

  return (
    <section className="stack">
      <PageHeader title="Portal Lab Results" description="Patients can review historic and recent lab values." />

      <article className="panel">
        <h3>Lab Results</h3>

        <p className="small" style={{ marginBottom: "0.6rem" }}>
          Patient: {patientDisplayName(patient)}
        </p>

        {error ? <p className="notice notice-error">Failed to load lab results: {error.message}</p> : null}

        {!error && labs.length === 0 ? <p className="notice">No lab results available.</p> : null}

        {labs.length > 0 ? (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Test</th>
                  <th>Result</th>
                  <th>Reference Range</th>
                </tr>
              </thead>
              <tbody>
                {labs.map((result) => (
                  <tr key={result.id}>
                    <td>{formatDate(result.collected_at)}</td>
                    <td>{result.test_name}</td>
                    <td>{result.result_value}</td>
                    <td>{result.reference_range || "-"}</td>
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
