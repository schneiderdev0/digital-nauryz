import { cookies, headers } from "next/headers";

export {
  APP_LOCALE_COOKIE,
  getAppMetadata,
  normalizeLocale,
  pickLocale,
  type AppLocale
} from "@/lib/locale-core";
import { normalizeLocale, type AppLocale } from "@/lib/locale-core";

export async function getRequestLocale(): Promise<AppLocale> {
  const cookieStore = await cookies();
  const savedLocale = normalizeLocale(cookieStore.get("app_locale")?.value);

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
