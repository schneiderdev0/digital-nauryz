import type { NextRequest, NextResponse } from "next/server";

import { createServerClient } from "@supabase/ssr";

import { Database } from "@/lib/database.types";
import { env } from "@/lib/env";

export function updateSupabaseSession(
  request: NextRequest,
  response: NextResponse
) {
  if (!env.hasSupabase) {
    return response;
  }

  const config = env.requireSupabase();
  const internalUrl = env.supabaseInternalUrl ?? config.url;

  const supabase = createServerClient<Database>(internalUrl, config.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookieList) {
        cookieList.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        });
      }
    }
  });

  void supabase.auth.getUser();

  return response;
}
