import { cookies } from "next/headers";

import { createServerClient } from "@supabase/ssr";

import { Database } from "@/lib/database.types";
import { env } from "@/lib/env";

export async function getSupabaseServerClient() {
  const cookieStore = await cookies();
  const config = env.requireSupabase();
  const internalUrl = env.supabaseInternalUrl ?? config.url;

  return createServerClient<Database>(internalUrl, config.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookieList) {
        // Server Components can read cookies, but only Route Handlers / Server Actions
        // are allowed to mutate them. Auth-refresh writes are handled in middleware/routes.
        void cookieList;
      }
    }
  });
}
