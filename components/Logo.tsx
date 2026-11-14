// Mark path taken verbatim from the Figma "Logo/Lockup" component.
const MARK = "M16 0C24.8366 0 32 7.16343 32 16C32 24.8366 24.8366 32 16 32H0V0H16ZM13.7622 7.2619C9.07105 7.2619 5.2682 11.0652 5.2682 15.7563C5.26831 20.4473 9.07111 24.2503 13.7622 24.2503H22.2562V7.2619H13.7622Z";

export function LogoMark({ size = 32, color = "#0061FE" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" style={{ display: "block", flexShrink: 0 }}>
      <path d={MARK} fill={color} fillRule="evenodd" clipRule="evenodd" />
    </svg>
  );
}

/** Horizontal lockup: mark height : wordmark cap ≈ 32:30, gap 7 (per Figma component notes). */
export function Logo({ height = 32, dark = false }: { height?: number; dark?: boolean }) {
  const s = height / 32;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 7 * s }} aria-label="Dozzier">
      <LogoMark size={height} />
      <span style={{ fontSize: 34 * s, lineHeight: 1, fontWeight: 600, letterSpacing: "-0.035em", color: dark ? "#fff" : "#1A1918", transform: `translateY(${1 * s}px)` }}>
        Dozzier
      </span>
    </span>
  );
}

export function AppIcon({ size = 56 }: { size?: number }) {
  return (
    <span style={{ width: size, height: size, borderRadius: 999, background: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
      <LogoMark size={size * 0.5} />
    </span>
  );
}
