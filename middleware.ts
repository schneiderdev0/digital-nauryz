import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { env } from "@/lib/env";
import { updateSupabaseSession } from "@/lib/supabase/middleware";

export function middleware(request: NextRequest) {
  if (!env.activitiesEnabled) {
    const { pathname } = request.nextUrl;

    if (pathname.startsWith("/events/")) {
      return NextResponse.redirect(new URL("/", request.url));
    }

    if (/^\/api\/day(14|15|16|17|18|19|20)(\/|$)/.test(pathname)) {
      return NextResponse.json(
        { error: "Activities are disabled." },
        { status: 503 }
      );
    }
  }

  const response = NextResponse.next();
  return updateSupabaseSession(request, response);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"]
};
