import { PageHeader } from "@/components/page-header";

const adminItems = [
  "Provider roster and facility management",
  "Insurance plan catalog and billing rules",
  "Clinical templates and diagnosis dictionaries",
  "Queue health for notifications and integrations",
  "Audit export and compliance review workflows",
];

const apiPaths = [
  "/api/patients",
  "/api/appointments",
  "/api/medical-records",
  "/api/billing",
  "/api/labs",
  "/api/reports",
];

export default function AdminPage() {
  return (
    <section className="stack">
      <PageHeader
        title="Admin Panel"
        description="Administrative surface for configuration, governance, and operations control."
      />

      <article className="panel">
        <h3>Administration Backlog</h3>
        <div className="stack" style={{ marginTop: "0.8rem" }}>
          {adminItems.map((item) => (
            <p key={item} className="notice">
              {item}
            </p>
          ))}
        </div>
      </article>

      <article className="panel panel-muted">
        <h3>Available REST Endpoints</h3>
        <div className="inline-links" style={{ marginTop: "0.75rem" }}>
          {apiPaths.map((path) => (
            <code key={path}>{path}</code>
          ))}
        </div>
      </article>
    </section>
  );
}
