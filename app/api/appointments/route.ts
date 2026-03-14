import { NextResponse } from "next/server";
import { writeAuditEvent } from "@/lib/audit";
import { requireRole } from "@/lib/compliance/rbac";
import { getSupabaseConfigError, getSupabaseServerClient } from "@/lib/supabase/client";
import type { AppointmentStatus } from "@/lib/types";

const statuses: AppointmentStatus[] = ["scheduled", "checked_in", "completed", "cancelled"];

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
    .from("appointments")
    .select("id, patient_id, provider_name, scheduled_at, status, notes, created_at")
    .order("scheduled_at", { ascending: true })
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
  const roleCheck = requireRole(request, ["admin", "provider", "staff"]);
  if (roleCheck.denial) {
    return roleCheck.denial;
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return errorResponse(getSupabaseConfigError());
  }

  const body = (await request.json()) as {
    patient_id?: string;
    provider_name?: string;
    scheduled_at?: string;
    status?: AppointmentStatus;
    notes?: string;
  };

  const patientId = body.patient_id?.trim() ?? "";
  const providerName = body.provider_name?.trim() ?? "";
  const scheduledAtRaw = body.scheduled_at?.trim() ?? "";

  if (!patientId || !providerName || !scheduledAtRaw) {
    return errorResponse("patient_id, provider_name, and scheduled_at are required.", 400);
  }

  const scheduledAt = new Date(scheduledAtRaw);
  if (Number.isNaN(scheduledAt.getTime())) {
    return errorResponse("scheduled_at must be a valid date.", 400);
  }

  const payload = {
    patient_id: patientId,
    provider_name: providerName,
    scheduled_at: scheduledAt.toISOString(),
    status: statuses.includes(body.status ?? "scheduled") ? (body.status ?? "scheduled") : "scheduled",
    notes: body.notes?.trim() || null,
  };

  const { data, error } = await supabase.from("appointments").insert(payload).select("*").single();

  if (error) {
    return errorResponse(error.message, 400);
  }
  const created = data as { id?: string } | null;

  await writeAuditEvent(supabase, {
    action: "appointment.create.api",
    actor_role: roleCheck.role,
    entity_type: "appointments",
    entity_id: created?.id ?? null,
    metadata: { patient_id: patientId, status: payload.status },
  });

  return NextResponse.json({ data }, { status: 201 });
}
