import { supabase } from "@/integrations/supabase/client";

export type AuditEvent =
  | "log_created"
  | "log_updated"
  | "log_deleted"
  | "category_created"
  | "category_updated"
  | "category_deleted"
  | "categories_reordered"
  | "account_deleted"
  | "password_changed"
  | "data_exported"
  | "fax_created"
  | "fax_updated"
  | "fax_deleted";

export async function logAuditEvent(
  event: AuditEvent,
  details: Record<string, unknown> = {},
): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("audit_logs").insert({ user_id: user.id, event, details });
  } catch {
    // Audit logging is best-effort — never block the main operation
  }
}
