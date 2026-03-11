import { createClient } from "@supabase/supabase-js";

import { Database } from "@/lib/database.types";
import { env } from "@/lib/env";

let adminClient: ReturnType<typeof createClient<Database>> | null = null;

export function getSupabaseAdminClient() {
  if (adminClient) {
    return adminClient;
  }

  const { url } = env.requireSupabase();
  const internalUrl = env.supabaseInternalUrl ?? url;
  const serviceRoleKey = env.requireServiceRoleKey();

  adminClient = createClient<Database>(internalUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });

  return adminClient;
}
