import { MetricCard } from "@/components/metric-card";
import { PageHeader } from "@/components/page-header";
import { formatPercent } from "@/lib/format";
import { getSupabaseConfigError, getSupabaseServerClient } from "@/lib/supabase/client";
import type {
  Appointment,
  BillingClaim,
  Prescription,
  PrimaryCareGap,
  AuditLog,
} from "@/lib/types";

export default async function ReportsPage() {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return (
      <section className="stack">
        <PageHeader
          title="Reports"
          description="Operational and financial snapshots for leadership and practice managers."
        />
        <div className="panel">
          <p className="notice notice-error">{getSupabaseConfigError()}</p>
        </div>
      </section>
    );
  }

  const [patientsRes, appointmentsRes, claimsRes, messagesRes, prescriptionsRes, careGapsRes, auditRes] = await Promise.all([
    supabase.from("patients").select("id", { count: "exact", head: true }),
    supabase.from("appointments").select("id, provider_name, status"),
    supabase.from("billing_claims").select("id, status"),
    supabase.from("patient_messages").select("id", { count: "exact", head: true }),
    supabase.from("prescriptions").select("id, status"),
    supabase.from("primary_care_gaps").select("id, status"),
    supabase.from("audit_logs").select("id, created_at").order("created_at", { ascending: false }).limit(1000),
  ]);

  const appointments = (appointmentsRes.data ?? []) as Appointment[];
  const claims = (claimsRes.data ?? []) as BillingClaim[];
  const prescriptions = (prescriptionsRes.data ?? []) as Prescription[];
  const careGaps = (careGapsRes.data ?? []) as PrimaryCareGap[];
  const auditEvents = (auditRes.data ?? []) as AuditLog[];

  const completedAppointments = appointments.filter((item) => item.status === "completed").length;
  const uniqueProviders = new Set(appointments.map((item) => item.provider_name)).size;

  const paidClaims = claims.filter((claim) => claim.status === "paid").length;
  const rejectedClaims = claims.filter((claim) => claim.status === "rejected").length;
  const decidedClaims = paidClaims + rejectedClaims;

  const billingSuccessRate = claims.length === 0 ? 0 : paidClaims / claims.length;
  const claimAcceptanceRate = decidedClaims === 0 ? 0 : paidClaims / decidedClaims;
  const providerProductivity = uniqueProviders === 0 ? 0 : completedAppointments / uniqueProviders;
  const pendingReviewPrescriptions = prescriptions.filter((item) => item.status === "pending_review").length;
  const openCareGaps = careGaps.filter((item) => item.status === "open").length;

  return (
    <section className="stack">
      <PageHeader
        title="Reports"
        description="MVP success metrics mapped to patient growth, billing quality, and provider throughput."
      />

      <section className="grid-3">
        <MetricCard
          label="Patient Base"
          value={patientsRes.count ?? 0}
          caption="Proxy for customer and panel growth"
        />
        <MetricCard
          label="Billing Success Rate"
          value={formatPercent(billingSuccessRate)}
          caption="Paid claims over total claims"
        />
        <MetricCard
          label="Claim Acceptance Rate"
          value={formatPercent(claimAcceptanceRate)}
          caption="Paid over (paid + rejected)"
        />
        <MetricCard
          label="Portal Usage"
          value={messagesRes.count ?? 0}
          caption="Patient-initiated message interactions"
        />
        <MetricCard
          label="Provider Productivity"
          value={providerProductivity.toFixed(1)}
          caption="Completed appointments per provider"
        />
        <MetricCard
          label="System Uptime"
          value="External"
          caption="Track via hosting/APM observability"
        />
        <MetricCard
          label="Rx Safety Queue"
          value={pendingReviewPrescriptions}
          caption="Pending-review prescriptions with alerts"
        />
        <MetricCard
          label="Open Care Gaps"
          value={openCareGaps}
          caption="Preventive tasks pending completion"
        />
        <MetricCard
          label="Audit Events"
          value={auditEvents.length}
          caption="Recorded compliance activity entries"
        />
      </section>

      <article className="panel">
        <h3>How to read this report</h3>
        <div className="stack" style={{ marginTop: "0.75rem" }}>
          <p className="notice">
            <strong>Billing success rate</strong> highlights overall collection health and payer throughput.
          </p>
          <p className="notice">
            <strong>Claim acceptance rate</strong> isolates adjudicated outcomes and coding accuracy impact.
          </p>
          <p className="notice">
            <strong>Portal usage</strong> is currently measured via message volume; add appointment self-book and report views for richer adoption tracking.
          </p>
          <p className="notice">
            <strong>Rx safety queue and care gaps</strong> reflect primary-care quality workflow follow-through.
          </p>
        </div>
      </article>
    </section>
  );
}
