export function LogoMark({ size = 32, color = "#0061fe", inner = "#fff" }: { size?: number; color?: string; inner?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <path d="M3 4.5A1.5 1.5 0 0 1 4.5 3H17a12 12 0 0 1 12 12v2a12 12 0 0 1-12 12H4.5A1.5 1.5 0 0 1 3 27.5Z" fill={color} />
      <path d="M11 11.5a2 2 0 0 1 2-2h3.5a6.5 6.5 0 0 1 0 13H13a2 2 0 0 1-2-2Z" fill={inner} />
    </svg>
  );
}

export function Logo({ height = 32, dark = false }: { height?: number; dark?: boolean }) {
  const s = height / 32;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 7 * s }} aria-label="Dozzier">
      <LogoMark size={height} />
      <span style={{ fontSize: 30 * s, lineHeight: 1, fontWeight: 700, letterSpacing: -1 * s, color: dark ? "#fff" : "var(--dz-text-primary)" }}>
        Dozzier
      </span>
    </span>
  );
}

export function AppIcon({ size = 56 }: { size?: number }) {
  return (
    <span style={{ width: size, height: size, borderRadius: 999, background: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
      <LogoMark size={size * 0.58} />
    </span>
  );
}
