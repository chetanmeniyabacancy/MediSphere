import { PageHeader } from "@/components/page-header";

const securityChecklist = [
  "Encryption at rest in Supabase/Postgres",
  "Audit logging tables and immutable event tracking",
  "Role-based access control (admin/provider/staff/patient)",
  "Secure authentication via Supabase Auth/JWT",
  "Data retention and PHI-safe logging policy",
  "Production RLS hardening via supabase/rls_hardening.sql and app_role JWT claims",
  "Backend writes through server-side service role key",
];

export default function SettingsPage() {
  return (
    <section className="stack">
      <PageHeader
        title="Settings"
        description="Security, compliance, and integration guardrails for MedFlow AI operations."
      />

      <article className="panel">
        <h3>HIPAA Security Checklist</h3>
        <div className="stack" style={{ marginTop: "0.8rem" }}>
          {securityChecklist.map((item) => (
            <p key={item} className="notice">
              {item}
            </p>
          ))}
        </div>
      </article>

      <article className="panel panel-muted">
        <h3>Integration Targets</h3>
        <p className="small" style={{ marginTop: "0.65rem" }}>
          Planned connectors: Twilio, SendGrid, Stripe, and HL7 FHIR ingestion APIs.
        </p>
      </article>
    </section>
  );
}
