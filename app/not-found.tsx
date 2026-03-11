import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { PageIntro } from "@/components/page-intro";

export default function NotFound() {
  return (
    <AppShell
      eyebrow="404"
      title="Страница не найдена"
      description="Маршрут отсутствует или ещё не подготовлен."
    >
      <PageIntro
        eyebrow="Навигация"
        title="Вернуться в приложение"
        description="Основные разделы уже доступны на главной странице."
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
        На главную
      </Link>
    </AppShell>
  );
}
