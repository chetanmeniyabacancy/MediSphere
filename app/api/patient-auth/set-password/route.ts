import { NextResponse } from "next/server";
import { hashPassword } from "@/lib/auth/password";
import { getSupabaseConfigError, getSupabaseServerClient } from "@/lib/supabase/client";
import type { Patient } from "@/lib/types";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;

function errorResponse(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function isLocalHost(host: string): boolean {
  return /^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/i.test(host.trim());
}

function getRequestHost(request: Request): string {
  return request.headers.get("x-forwarded-host") || request.headers.get("host") || "";
}

function isManualPatientAuthEnabled(): boolean {
  const value = process.env.ENABLE_MANUAL_PATIENT_AUTH;

  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  return process.env.NODE_ENV !== "production";
}

export async function POST(request: Request) {
  if (!isManualPatientAuthEnabled()) {
    return errorResponse("Manual patient auth is disabled.", 403);
  }

  if (!isLocalHost(getRequestHost(request))) {
    return errorResponse("Password setup endpoint is available only on localhost.", 403);
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return errorResponse(getSupabaseConfigError(), 500);
  }

  const body = (await request.json()) as { email?: string; password?: string };
  const email = body.email?.trim().toLowerCase() ?? "";
  const password = body.password ?? "";

  if (!EMAIL_PATTERN.test(email)) {
    return errorResponse("Invalid email format.", 400);
  }

  if (password.length < 6) {
    return errorResponse("Password must be at least 6 characters.", 400);
  }

  const { data, error } = await supabase
    .from("patients")
    .select("id, email, created_at")
    .eq("email", email)
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) {
    return errorResponse(error.message, 400);
  }

  const patient = ((data ?? [])[0] ?? null) as Pick<Patient, "id" | "email"> | null;

  if (!patient) {
    return errorResponse("No patient found for this email.", 404);
  }

  const passwordHash = hashPassword(password);

  const { error: updateError } = await supabase
    .from("patients")
    .update({ password_hash: passwordHash })
    .eq("id", patient.id);

  if (updateError) {
    return errorResponse(updateError.message, 400);
  }

  return NextResponse.json({
    data: {
      patient_id: patient.id,
      email,
      password_set: true,
    },
  });
}
