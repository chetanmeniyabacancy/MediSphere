import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types";

let cachedClient: SupabaseClient<Database> | null | undefined;

export function getSupabaseServerClient(): SupabaseClient<Database> | null {
  if (cachedClient !== undefined) {
    return cachedClient;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    cachedClient = null;
    return cachedClient;
  }

  cachedClient = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
    },
    global: {
      fetch: (input, init = {}) =>
        fetch(input, {
          ...init,
          cache: "no-store",
        }),
    },
  });

  return cachedClient;
}

export function getSupabaseConfigError(): string {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.";
  }

  return "";
}
