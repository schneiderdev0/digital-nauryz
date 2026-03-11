import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { createServerClient } from "@supabase/ssr";

import { Database } from "@/lib/database.types";
import { env } from "@/lib/env";

export async function POST() {
  if (!env.hasSupabase) {
    return NextResponse.json({ ok: true });
  }

  const cookieStore = await cookies();
  const config = env.requireSupabase();
  const response = NextResponse.json({ ok: true });
  const internalUrl = env.supabaseInternalUrl ?? config.url;
  const supabase = createServerClient<Database>(internalUrl, config.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookieList) {
        cookieList.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      }
    }
  });

  const result = await supabase.auth.signOut();

  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: 500 });
  }

  return response;
}
