import Link from "next/link";
import type { Route } from "next";

type AppShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  titleAddon?: React.ReactNode;
  children: React.ReactNode;
};

export function AppShell({
  eyebrow,
  title,
  description,
  titleAddon,
  children
}: AppShellProps) {
  const hasHeaderMeta = Boolean(eyebrow || description || titleAddon);

  return (
    <main className="page-shell">
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
          <NavLink href="/">Главная</NavLink>
          <NavLink href="/leaderboard">Рейтинг</NavLink>
          <NavLink href="/profile">Профиль</NavLink>
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
