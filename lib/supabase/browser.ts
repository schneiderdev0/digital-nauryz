"use client";

import { createBrowserClient } from "@supabase/ssr";

import { Database } from "@/lib/database.types";
import { env } from "@/lib/env";

let browserClient: ReturnType<typeof createBrowserClient<Database>> | null = null;

export function getSupabaseBrowserClient() {
  if (browserClient) {
    return browserClient;
  }

  const config = env.requireSupabase();

  browserClient = createBrowserClient<Database>(config.url, config.anonKey);

  return browserClient;
}
