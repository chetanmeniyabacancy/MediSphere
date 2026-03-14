import { NextResponse } from "next/server";
import { getSupabaseConfigError, getSupabaseServerClient } from "@/lib/supabase/client";
import type { ClaimStatus } from "@/lib/types";

const statuses: ClaimStatus[] = ["draft", "submitted", "paid", "rejected"];

function errorResponse(message: string, status = 500) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(request: Request) {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return errorResponse(getSupabaseConfigError());
  }

  const url = new URL(request.url);
  const patientId = url.searchParams.get("patientId");

  let query = supabase
    .from("billing_claims")
    .select("id, patient_id, cpt_code, icd10_code, amount, status, created_at")
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
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return errorResponse(getSupabaseConfigError());
  }

  const body = (await request.json()) as {
    patient_id?: string;
    cpt_code?: string;
    icd10_code?: string;
    amount?: number | string;
    status?: ClaimStatus;
  };

  const patientId = body.patient_id?.trim() ?? "";
  const cptCode = body.cpt_code?.trim() ?? "";
  const icd10Code = body.icd10_code?.trim() ?? "";
  const amount = typeof body.amount === "string" ? Number.parseFloat(body.amount) : body.amount;

  if (!patientId || !cptCode || !icd10Code || !Number.isFinite(amount)) {
    return errorResponse("patient_id, cpt_code, icd10_code, and numeric amount are required.", 400);
  }

  const { data, error } = await supabase
    .from("billing_claims")
    .insert({
      patient_id: patientId,
      cpt_code: cptCode,
      icd10_code: icd10Code,
      amount: amount as number,
      status: statuses.includes(body.status ?? "draft") ? (body.status ?? "draft") : "draft",
    })
    .select("*")
    .single();

  if (error) {
    return errorResponse(error.message, 400);
  }

  return NextResponse.json({ data }, { status: 201 });
}
