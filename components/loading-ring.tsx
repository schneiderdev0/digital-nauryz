type LoadingRingProps = {
  size?: number;
  label?: string;
};

export function LoadingRing({
  size = 44,
  label = "Загрузка"
}: LoadingRingProps) {
  return (
    <div
      style={{
        display: "grid",
        justifyItems: "center",
        gap: 12
      }}
      aria-live="polite"
      aria-label={label}
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
