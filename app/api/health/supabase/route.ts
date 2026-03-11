import { NextResponse } from "next/server";

import { env } from "@/lib/env";

export async function GET() {
  return NextResponse.json({
    ok: true,
    hasSupabaseEnv: env.hasSupabase,
    hasServiceRole: Boolean(env.serviceRoleKey)
  });
}
