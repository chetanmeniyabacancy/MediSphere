import { NextResponse } from "next/server";
import { writeAuditEvent } from "@/lib/audit";
import { requireRole } from "@/lib/compliance/rbac";
import { getSupabaseConfigError, getSupabaseServerClient } from "@/lib/supabase/client";
import type { CareGapStatus } from "@/lib/types";

const statuses: CareGapStatus[] = ["open", "completed", "dismissed"];

function errorResponse(message: string, status = 500) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(request: Request) {
  const roleCheck = requireRole(request, ["admin", "provider", "staff", "billing"]);
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
    .from("primary_care_gaps")
    .select("id, patient_id, gap_type, due_date, status, notes, created_at")
    .order("due_date", { ascending: true })
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
    gap_type?: string;
    due_date?: string;
    status?: CareGapStatus;
    notes?: string;
  };

  const patientId = body.patient_id?.trim() ?? "";
  const gapType = body.gap_type?.trim() ?? "";
  const dueDate = body.due_date?.trim() ?? "";
  const status = (body.status ?? "open") as CareGapStatus;

  if (!patientId || !gapType || !dueDate || !statuses.includes(status)) {
    return errorResponse(
      "patient_id, gap_type, due_date, and a valid status are required.",
      400,
    );
  }

  const { data, error } = await supabase
    .from("primary_care_gaps")
    .insert({
      patient_id: patientId,
      gap_type: gapType,
      due_date: dueDate,
      status,
      notes: body.notes?.trim() || null,
    })
    .select("*")
    .single();

  if (error) {
    return errorResponse(error.message, 400);
  }
  const created = data as { id?: string } | null;

  await writeAuditEvent(supabase, {
    action: "primary_care_gap.create.api",
    actor_role: roleCheck.role,
    entity_type: "primary_care_gaps",
    entity_id: created?.id ?? null,
    metadata: { patient_id: patientId, gap_type: gapType },
  });

  return NextResponse.json({ data }, { status: 201 });
}
