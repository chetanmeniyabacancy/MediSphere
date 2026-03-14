import { PageHeader } from "@/components/page-header";
import { formatDateTime } from "@/lib/format";
import { getSupabaseConfigError, getSupabaseServerClient } from "@/lib/supabase/client";
import type { AuditLog } from "@/lib/types";

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
  "/api/primary-care-gaps",
  "/api/prescriptions",
  "/api/billing",
  "/api/labs",
  "/api/reports",
];

export default async function AdminPage() {
  const supabase = getSupabaseServerClient();

  const auditRes = supabase
    ? await supabase
        .from("audit_logs")
        .select("id, action, actor_role, entity_type, created_at")
        .order("created_at", { ascending: false })
        .limit(30)
    : { data: null, error: { message: getSupabaseConfigError() } };

  const auditLogs = (auditRes.data ?? []) as AuditLog[];

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

      <article className="panel">
        <h3>RBAC Notes</h3>
        <div className="stack" style={{ marginTop: "0.75rem" }}>
          <p className="notice">
            API role is resolved from <code>x-medflow-role</code> header.
          </p>
          <p className="notice">
            Set <code>DEFAULT_APP_ROLE</code> in environment for fallback behavior.
          </p>
          <p className="notice">
            Use <code>admin</code>, <code>provider</code>, <code>billing</code>, or <code>staff</code> for clinic endpoints.
          </p>
          <p className="notice">
            Apply <code>supabase/rls_hardening.sql</code> to enforce DB-level RBAC and patient ownership policies.
          </p>
        </div>
      </article>

      <article className="panel">
        <h3>Audit Trail</h3>
        {auditRes.error ? (
          <p className="notice notice-error">Failed to load audit logs: {auditRes.error.message}</p>
        ) : null}

        {!auditRes.error && auditLogs.length === 0 ? (
          <p className="notice">No audit events yet.</p>
        ) : null}

        {auditLogs.length > 0 ? (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Action</th>
                  <th>Role</th>
                  <th>Entity</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log) => (
                  <tr key={log.id}>
                    <td>{formatDateTime(log.created_at)}</td>
                    <td>{log.action}</td>
                    <td>
                      <span className="badge">{log.actor_role}</span>
                    </td>
                    <td>{log.entity_type}</td>
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
