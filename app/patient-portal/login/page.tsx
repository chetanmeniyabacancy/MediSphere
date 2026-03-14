import { PageHeader } from "@/components/page-header";
import { PortalAuthForm } from "./portal-auth-form";

export default function PortalLoginPage() {
  return (
    <section className="stack">
      <PageHeader
        title="Portal Login"
        description="Manual patient email/password authentication for portal access."
      />

      <article className="panel">
        <h3>Authentication</h3>
        <div style={{ marginTop: "0.8rem" }}>
          <PortalAuthForm />
        </div>
      </article>
    </section>
  );
}
