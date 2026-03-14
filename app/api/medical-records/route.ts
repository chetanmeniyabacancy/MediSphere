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
    .from("clinical_notes")
    .select("id, patient_id, provider_name, encounter_date, diagnosis_code, note, created_at")
    .order("encounter_date", { ascending: false })
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
    provider_name?: string;
    encounter_date?: string;
    diagnosis_code?: string;
    note?: string;
  };

  const patientId = body.patient_id?.trim() ?? "";
  const providerName = body.provider_name?.trim() ?? "";
  const encounterDate = body.encounter_date?.trim() ?? "";
  const note = body.note?.trim() ?? "";

  if (!patientId || !providerName || !encounterDate || !note) {
    return errorResponse("patient_id, provider_name, encounter_date, and note are required.", 400);
  }

  const { data, error } = await supabase
    .from("clinical_notes")
    .insert({
      patient_id: patientId,
      provider_name: providerName,
      encounter_date: encounterDate,
      diagnosis_code: body.diagnosis_code?.trim() || null,
      note,
    })
    .select("*")
    .single();

  if (error) {
    return errorResponse(error.message, 400);
  }

  return NextResponse.json({ data }, { status: 201 });
}
