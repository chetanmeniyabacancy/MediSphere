import { cookies } from "next/headers";
import { PATIENT_SESSION_COOKIE, verifyPatientSessionToken } from "@/lib/auth/session";
import { getSupabaseServerClient } from "@/lib/supabase/client";
import type { Patient } from "@/lib/types";

export type LoggedInPatient = Pick<Patient, "id" | "first_name" | "last_name" | "email">;

export async function getLoggedInPatient(): Promise<LoggedInPatient | null> {
  const token = cookies().get(PATIENT_SESSION_COOKIE)?.value;
  const payload = verifyPatientSessionToken(token);

  if (!payload) {
    return null;
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("patients")
    .select("id, first_name, last_name, email")
    .eq("id", payload.sub)
    .limit(1);

  if (error) {
    return null;
  }

  const patient = (data ?? [])[0];
  if (!patient || !patient.email) {
    return null;
  }

  return patient as LoggedInPatient;
}
