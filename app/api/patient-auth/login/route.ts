import { NextResponse } from "next/server";
import { verifyPassword } from "@/lib/auth/password";
import {
  createPatientSessionToken,
  PATIENT_SESSION_COOKIE,
  PATIENT_SESSION_TTL_SECONDS,
} from "@/lib/auth/session";
import { getSupabaseConfigError, getSupabaseServerClient } from "@/lib/supabase/client";
import type { Patient } from "@/lib/types";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;

function errorResponse(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
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

  if (!password) {
    return errorResponse("Password is required.", 400);
  }

  const { data, error } = await supabase
    .from("patients")
    .select("id, email, first_name, last_name, password_hash, created_at")
    .eq("email", email)
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) {
    return errorResponse(error.message, 400);
  }

  const patient = ((data ?? [])[0] ?? null) as (Patient & { password_hash?: string | null }) | null;

  if (!patient || !patient.email || !verifyPassword(password, patient.password_hash)) {
    return errorResponse("Invalid email or password.", 401);
  }

  let token: string;
  try {
    token = createPatientSessionToken({
      sub: patient.id,
      email: patient.email,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to create session token.";
    return errorResponse(message, 500);
  }

  const response = NextResponse.json({
    data: {
      patient_id: patient.id,
      email: patient.email,
      name: `${patient.first_name} ${patient.last_name}`.trim(),
    },
  });

  response.cookies.set({
    name: PATIENT_SESSION_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: PATIENT_SESSION_TTL_SECONDS,
  });

  return response;
}
