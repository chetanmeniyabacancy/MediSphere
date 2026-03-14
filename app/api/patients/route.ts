import { NextResponse } from "next/server";
import { hashPassword } from "@/lib/auth/password";
import { getSupabaseConfigError, getSupabaseServerClient } from "@/lib/supabase/client";
import type { Gender } from "@/lib/types";

const genders: Gender[] = ["male", "female", "other", "unknown"];

function errorResponse(message: string, status = 500) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET() {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return errorResponse(getSupabaseConfigError());
  }

  const { data, error } = await supabase
    .from("patients")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

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
    first_name?: string;
    last_name?: string;
    dob?: string;
    gender?: Gender;
    phone?: string;
    email?: string;
    insurance_provider?: string;
    insurance_member_id?: string;
    password?: string;
  };

  const firstName = body.first_name?.trim() ?? "";
  const lastName = body.last_name?.trim() ?? "";
  const dob = body.dob?.trim() ?? "";

  if (!firstName || !lastName || !dob) {
    return errorResponse("first_name, last_name, and dob are required.", 400);
  }

  if (body.password && body.password.trim().length > 0 && body.password.trim().length < 6) {
    return errorResponse("password must be at least 6 characters when provided.", 400);
  }

  const passwordHash =
    body.password && body.password.trim().length >= 6
      ? hashPassword(body.password.trim())
      : null;

  const payload = {
    first_name: firstName,
    last_name: lastName,
    dob,
    gender: genders.includes(body.gender ?? "unknown") ? (body.gender ?? "unknown") : "unknown",
    phone: body.phone?.trim() || null,
    email: body.email?.trim() || null,
    insurance_provider: body.insurance_provider?.trim() || null,
    insurance_member_id: body.insurance_member_id?.trim() || null,
    password_hash: passwordHash,
  };

  const { data, error } = await supabase.from("patients").insert(payload).select("*").single();

  if (error) {
    return errorResponse(error.message, 400);
  }

  return NextResponse.json({ data }, { status: 201 });
}
