import { NextResponse } from "next/server";

import { APP_LOCALE_COOKIE, normalizeLocale } from "@/lib/locale";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | { locale?: string }
    | null;
  const locale = normalizeLocale(body?.locale);

  if (!locale) {
    return NextResponse.json({ error: "Invalid locale." }, { status: 400 });
  }

  const response = NextResponse.json({ ok: true, locale });
  response.cookies.set(APP_LOCALE_COOKIE, locale, {
    path: "/",
    sameSite: "lax",
    secure: true,
    maxAge: 60 * 60 * 24 * 365
  });

  return response;
}
