import { cookies, headers } from "next/headers";

export type AppLocale = "ru" | "kk";
export const APP_LOCALE_COOKIE = "app_locale";

export function normalizeLocale(value: string | null | undefined): AppLocale | null {
  if (value === "ru" || value === "kk") {
    return value;
  }

  return null;
}

export async function getRequestLocale(): Promise<AppLocale> {
  const cookieStore = await cookies();
  const savedLocale = normalizeLocale(cookieStore.get(APP_LOCALE_COOKIE)?.value);

  if (savedLocale) {
    return savedLocale;
  }

  const headerStore = await headers();
  const acceptLanguage = headerStore.get("accept-language")?.toLowerCase() ?? "";

  if (acceptLanguage.includes("kk")) {
    return "kk";
  }

  return "ru";
}

export function pickLocale<T>(
  locale: AppLocale,
  value: { ru: T; kk: T }
): T {
  return locale === "kk" ? value.kk : value.ru;
}

export function getAppMetadata(locale: AppLocale) {
  return {
    title: pickLocale(locale, {
      ru: "Цифровой Наурыз",
      kk: "Цифрлық Наурыз"
    }),
    description: pickLocale(locale, {
      ru: "Telegram Web App для интерактивных активностей Наурыза",
      kk: "Наурызға арналған интерактивті белсенділіктерге арналған Telegram Web App"
    })
  };
}
