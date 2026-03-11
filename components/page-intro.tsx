type PageIntroProps = {
  eyebrow: string;
  title: string;
  description: string;
};

export function PageIntro({ eyebrow, title, description }: PageIntroProps) {
  return (
    <header style={{ display: "grid", gap: 8 }}>
      {eyebrow ? (
        <p style={{ margin: 0, color: "var(--accent-strong)", fontSize: 13 }}>
          {eyebrow}
        </p>
      ) : null}
      <h1
        style={{
          margin: 0,
          fontFamily: "var(--font-heading), serif",
          fontSize: 34,
          lineHeight: 1
        }}
      >
        {title}
      </h1>
      {description ? (
        <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.5 }}>
          {description}
        </p>
      ) : null}
    </header>
  );
}
