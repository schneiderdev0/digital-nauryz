import type { AppLocale } from "@/lib/locale";

type LoadingRingProps = {
  size?: number;
  label?: string;
  locale?: AppLocale;
};

export function LoadingRing({
  size = 44,
  label,
  locale = "ru"
}: LoadingRingProps) {
  const resolvedLabel = label ?? (locale === "kk" ? "Жүктеу" : "Загрузка");

  return (
    <div
      style={{
        display: "grid",
        justifyItems: "center",
        gap: 12
      }}
      aria-live="polite"
      aria-label={resolvedLabel}
    >
      <span
        className="ring-loader"
        style={{
          width: size,
          height: size
        }}
      />
    </div>
  );
}
