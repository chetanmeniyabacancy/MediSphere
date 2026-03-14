import { NextResponse } from "next/server";
import { writeAuditEvent } from "@/lib/audit";
import { requireRole } from "@/lib/compliance/rbac";
import {
  collapseSafetyAlerts,
  evaluatePrescriptionSafety,
  suggestedPrescriptionStatus,
} from "@/lib/prescription-safety";
import { getSupabaseConfigError, getSupabaseServerClient } from "@/lib/supabase/client";
import type { PrescriptionStatus } from "@/lib/types";

const statuses: PrescriptionStatus[] = ["active", "stopped", "pending_review"];

function errorResponse(message: string, status = 500) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(request: Request) {
  const roleCheck = requireRole(request, ["admin", "provider", "billing", "staff"]);
  if (roleCheck.denial) {
    return roleCheck.denial;
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return errorResponse(getSupabaseConfigError());
  }

  const url = new URL(request.url);
  const patientId = url.searchParams.get("patientId");

  let query = supabase
    .from("prescriptions")
    .select("id, patient_id, prescribed_by, medication_name, dosage, frequency, route, start_date, end_date, instructions, status, safety_alerts, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  if (patientId) {
    query = query.eq("patient_id", patientId);
  }

  const { data, error } = await query;

  if (error) {
    return errorResponse(error.message, 400);
  }

  return NextResponse.json({ data });
}

export async function POST(request: Request) {
  const roleCheck = requireRole(request, ["admin", "provider"]);
  if (roleCheck.denial) {
    return roleCheck.denial;
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return errorResponse(getSupabaseConfigError());
  }

  const body = (await request.json()) as {
    patient_id?: string;
    prescribed_by?: string;
    medication_name?: string;
    dosage?: string;
    frequency?: string;
    route?: string;
    start_date?: string;
    end_date?: string;
    instructions?: string;
    status?: PrescriptionStatus;
  };

  const patientId = body.patient_id?.trim() ?? "";
  const prescribedBy = body.prescribed_by?.trim() ?? "";
  const medicationName = body.medication_name?.trim() ?? "";
  const dosage = body.dosage?.trim() ?? "";
  const frequency = body.frequency?.trim() ?? "";
  const startDate = body.start_date?.trim() ?? "";

  if (!patientId || !prescribedBy || !medicationName || !dosage || !frequency || !startDate) {
    return errorResponse(
      "patient_id, prescribed_by, medication_name, dosage, frequency, and start_date are required.",
      400,
    );
  }

  const [allergiesRes, activeRxRes] = await Promise.all([
    supabase
      .from("patient_allergies")
      .select("allergen, reaction, severity")
      .eq("patient_id", patientId),
    supabase
      .from("prescriptions")
      .select("medication_name, dosage")
      .eq("patient_id", patientId)
      .in("status", ["active", "pending_review"]),
  ]);

  const alerts = evaluatePrescriptionSafety({
    medicationName,
    allergies: (allergiesRes.data ?? []).map((allergy) => ({
      allergen: allergy.allergen,
      reaction: allergy.reaction,
      severity: allergy.severity,
    })),
    activeMedications: (activeRxRes.data ?? []).map((rx) => ({
      medication_name: rx.medication_name,
      dosage: rx.dosage,
    })),
  });

  const requestedStatus = body.status && statuses.includes(body.status) ? body.status : null;

  const { data, error } = await supabase
    .from("prescriptions")
    .insert({
      patient_id: patientId,
      prescribed_by: prescribedBy,
      medication_name: medicationName,
      dosage,
      frequency,
      route: body.route?.trim() || null,
      start_date: startDate,
      end_date: body.end_date?.trim() || null,
      instructions: body.instructions?.trim() || null,
      status: requestedStatus ?? suggestedPrescriptionStatus(alerts),
      safety_alerts: collapseSafetyAlerts(alerts),
    })
    .select("*")
    .single();

  if (error) {
    return errorResponse(error.message, 400);
  }
  const created = data as { id?: string } | null;

  await writeAuditEvent(supabase, {
    action: "prescription.create.api",
    actor_role: roleCheck.role,
    entity_type: "prescriptions",
    entity_id: created?.id ?? null,
    metadata: {
      patient_id: patientId,
      medication_name: medicationName,
      alert_count: alerts.length,
    },
  });

  return NextResponse.json({ data }, { status: 201 });
}
