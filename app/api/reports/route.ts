import { NextResponse } from "next/server";
import { requireRole } from "@/lib/compliance/rbac";
import { getSupabaseConfigError, getSupabaseServerClient } from "@/lib/supabase/client";
import type { Appointment, BillingClaim } from "@/lib/types";

function errorResponse(message: string, status = 500) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(request: Request) {
  const roleCheck = requireRole(request, ["admin", "billing", "provider", "staff"]);
  if (roleCheck.denial) {
    return roleCheck.denial;
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return errorResponse(getSupabaseConfigError());
  }

  const [patientsRes, appointmentsRes, claimsRes, messagesRes, prescriptionsRes, careGapsRes, auditRes] = await Promise.all([
    supabase.from("patients").select("id", { count: "exact", head: true }),
    supabase.from("appointments").select("id, status, provider_name"),
    supabase.from("billing_claims").select("id, status"),
    supabase.from("patient_messages").select("id", { count: "exact", head: true }),
    supabase.from("prescriptions").select("id, status"),
    supabase.from("primary_care_gaps").select("id, status"),
    supabase.from("audit_logs").select("id", { count: "exact", head: true }),
  ]);

  if (appointmentsRes.error) {
    return errorResponse(appointmentsRes.error.message, 400);
  }

  if (claimsRes.error) {
    return errorResponse(claimsRes.error.message, 400);
  }

  const appointments = (appointmentsRes.data ?? []) as Appointment[];
  const claims = (claimsRes.data ?? []) as BillingClaim[];
  const prescriptions = prescriptionsRes.data ?? [];
  const careGaps = careGapsRes.data ?? [];

  const completedAppointments = appointments.filter((item) => item.status === "completed").length;
  const providers = new Set(appointments.map((item) => item.provider_name));

  const paidClaims = claims.filter((item) => item.status === "paid").length;
  const rejectedClaims = claims.filter((item) => item.status === "rejected").length;
  const decidedClaims = paidClaims + rejectedClaims;

  const billingSuccessRate = claims.length === 0 ? 0 : paidClaims / claims.length;
  const claimAcceptanceRate = decidedClaims === 0 ? 0 : paidClaims / decidedClaims;
  const providerProductivity = providers.size === 0 ? 0 : completedAppointments / providers.size;

  const pendingReviewPrescriptions = prescriptions.filter(
    (item) => item.status === "pending_review",
  ).length;
  const openCareGaps = careGaps.filter((item) => item.status === "open").length;

  return NextResponse.json({
    data: {
      patients: patientsRes.count ?? 0,
      portal_messages: messagesRes.count ?? 0,
      total_appointments: appointments.length,
      total_claims: claims.length,
      billing_success_rate: billingSuccessRate,
      claim_acceptance_rate: claimAcceptanceRate,
      provider_productivity: providerProductivity,
      pending_review_prescriptions: pendingReviewPrescriptions,
      open_care_gaps: openCareGaps,
      audit_events: auditRes.count ?? 0,
    },
  });
}
