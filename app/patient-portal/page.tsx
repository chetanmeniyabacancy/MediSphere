import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { patientDisplayName } from "@/lib/format";
import { getLoggedInPatient } from "@/lib/auth/patient-session";

export default async function PatientPortalHomePage() {
  const patient = await getLoggedInPatient();

  return (
    <section className="stack">
      <PageHeader
        title="Patient Portal"
        description="Secure patient access to appointments, labs, and clinic communication."
      />

      {!patient ? (
        <article className="panel">
          <h3>Login Required</h3>
          <p className="notice" style={{ marginTop: "0.75rem" }}>
            Sign in with your patient email and password to access your portal data.
          </p>
          <div className="form-actions" style={{ marginTop: "0.75rem" }}>
            <Link className="button" href="/patient-portal/login">
              Go to Login
            </Link>
          </div>
        </article>
      ) : (
        <>
          <article className="panel">
            <h3>Welcome</h3>
            <p className="notice" style={{ marginTop: "0.75rem" }}>
              Logged in as <strong>{patientDisplayName(patient)}</strong> ({patient.email})
            </p>
          </article>

          <article className="panel">
            <h3>Portal Navigation</h3>
            <div className="inline-links" style={{ marginTop: "0.75rem" }}>
              <Link className="button button-secondary" href="/patient-portal/appointments">
                View Appointments
              </Link>
              <Link className="button button-secondary" href="/patient-portal/lab-results">
                View Lab Results
              </Link>
              <Link className="button button-secondary" href="/patient-portal/messages">
                Messages
              </Link>
            </div>
          </article>
        </>
      )}
    </section>
  );
}
