import Link from "next/link";
import type { Route } from "next";
import type { AppLocale } from "@/lib/locale";
import { NavPrefetch } from "@/components/nav-prefetch";

type AppShellProps = {
  locale?: AppLocale;
  eyebrow: string;
  title: string;
  description: string;
  titleAddon?: React.ReactNode;
  children: React.ReactNode;
};

export function AppShell({
  locale = "ru",
  eyebrow,
  title,
  description,
  titleAddon,
  children
}: AppShellProps) {
  const hasHeaderMeta = Boolean(eyebrow || description || titleAddon);
  const nav = locale === "kk"
    ? {
        home: "Басты бет",
        leaderboard: "Рейтинг",
        profile: "Профиль"
      }
    : {
        home: "Главная",
        leaderboard: "Рейтинг",
        profile: "Профиль"
      };

  return (
    <main className="page-shell">
      <NavPrefetch />
      <section
        className="surface"
        style={{
          padding: hasHeaderMeta ? 24 : 16,
          display: "grid",
          gap: 20
        }}
      >
        <header style={{ display: "grid", gap: 12 }}>
          {eyebrow ? (
            <p style={{ margin: 0, color: "var(--accent-strong)", fontSize: 13 }}>
              {eyebrow}
            </p>
          ) : null}
          <div style={{ display: "grid", gap: 8 }}>
            <h1
              style={{
                margin: 0,
                fontFamily: "var(--font-heading), serif",
                fontSize: 42,
                lineHeight: 0.95,
                textAlign: "center"
              }}
            >
              {title}
            </h1>
            {titleAddon}
            {description ? (
              <p
                style={{
                  margin: 0,
                  color: "var(--muted)",
                  lineHeight: 1.5,
                  textAlign: "center"
                }}
              >
                {description}
              </p>
            ) : null}
          </div>
        </header>

        <nav
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: 10
          }}
        >
          <NavLink href="/">{nav.home}</NavLink>
          <NavLink href="/leaderboard">{nav.leaderboard}</NavLink>
          <NavLink href="/profile">{nav.profile}</NavLink>
        </nav>

        {children}
      </section>
    </main>
  );
}

function NavLink({
  href,
  children
}: {
  href: Route;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      prefetch
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "0 14px",
        height: 48,
        lineHeight: 1,
        borderRadius: 16,
        border: "1px solid var(--line)",
        background: "var(--surface-strong)"
      }}
    >
      {children}
    </Link>
  );
}
