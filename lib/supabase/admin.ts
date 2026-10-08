import "server-only";
import { createClient } from "@supabase/supabase-js";

/** Cliente con service role: salta RLS. Solo para Server Actions del admin; nunca importar desde el cliente. */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("Falta SUPABASE_SERVICE_ROLE_KEY.");
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
