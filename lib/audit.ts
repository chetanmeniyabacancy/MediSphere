import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types";

type AuditInput = {
  action: string;
  actor_role: string;
  actor_id?: string | null;
  entity_type: string;
  entity_id?: string | null;
  metadata?: Record<string, unknown>;
};

export async function writeAuditEvent(
  supabase: SupabaseClient<Database>,
  input: AuditInput,
): Promise<void> {
  const payload = {
    action: input.action,
    actor_role: input.actor_role,
    actor_id: input.actor_id ?? null,
    entity_type: input.entity_type,
    entity_id: input.entity_id ?? null,
    metadata: input.metadata ?? {},
  };

  try {
    await supabase.from("audit_logs").insert(payload);
  } catch {
    // Audit failure should not block core clinical workflow.
  }
}
