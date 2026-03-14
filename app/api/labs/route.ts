import { NextResponse } from "next/server";
import { getSupabaseConfigError, getSupabaseServerClient } from "@/lib/supabase/client";

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
    .from("lab_results")
    .select("id, patient_id, test_name, result_value, reference_range, collected_at, created_at")
    .order("collected_at", { ascending: false })
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
    test_name?: string;
    result_value?: string;
    reference_range?: string;
    collected_at?: string;
  };

  const patientId = body.patient_id?.trim() ?? "";
  const testName = body.test_name?.trim() ?? "";
  const resultValue = body.result_value?.trim() ?? "";
  const collectedAt = body.collected_at?.trim() ?? "";

  if (!patientId || !testName || !resultValue || !collectedAt) {
    return errorResponse("patient_id, test_name, result_value, and collected_at are required.", 400);
  }

  const { data, error } = await supabase
    .from("lab_results")
    .insert({
      patient_id: patientId,
      test_name: testName,
      result_value: resultValue,
      reference_range: body.reference_range?.trim() || null,
      collected_at: collectedAt,
    })
    .select("*")
    .single();

  if (error) {
    return errorResponse(error.message, 400);
  }

  return NextResponse.json({ data }, { status: 201 });
}
