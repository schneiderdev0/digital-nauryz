import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { PageIntro } from "@/components/page-intro";
import { getRequestLocale, pickLocale } from "@/lib/locale";

export default async function NotFound() {
  const locale = await getRequestLocale();

  return (
    <AppShell
      locale={locale}
      eyebrow="404"
      title={pickLocale(locale, {
        ru: "Страница не найдена",
        kk: "Бет табылмады"
      })}
      description={pickLocale(locale, {
        ru: "Маршрут отсутствует или ещё не подготовлен.",
        kk: "Маршрут жоқ немесе әлі дайындалмаған."
      })}
    >
      <PageIntro
        eyebrow={pickLocale(locale, { ru: "Навигация", kk: "Навигация" })}
        title={pickLocale(locale, {
          ru: "Вернуться в приложение",
          kk: "Қосымшаға оралу"
        })}
        description={pickLocale(locale, {
          ru: "Основные разделы уже доступны на главной странице.",
          kk: "Негізгі бөлімдер басты бетте қолжетімді."
        })}
      />
      <Link
        href="/"
        style={{
          display: "inline-flex",
          justifyContent: "center",
          padding: "14px 18px",
          borderRadius: 16,
          background: "var(--accent-strong)",
          color: "white"
        }}
      >
        {pickLocale(locale, { ru: "На главную", kk: "Басты бетке" })}
      </Link>
    </AppShell>
  );
}
