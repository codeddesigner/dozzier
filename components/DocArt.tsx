"use client";
/** Document-with-check illustration used by Figma empty states (Agreements, File requests). */
export function DocArt({ big = false }: { big?: boolean }) {
  return (
    <svg width={big ? 120 : 96} height={big ? 100 : 80} viewBox="0 0 96 80" aria-hidden="true">
      <ellipse cx="48" cy="74" rx="44" ry="4" fill="#f2f4f7" />
      <rect x="14" y="10" width="44" height="56" rx="4" fill="#dbe7ff" transform="rotate(-8 36 38)" />
      <rect x="26" y="6" width="48" height="62" rx="4" fill="#fff" stroke="#111827" strokeWidth="2" />
      <rect x="34" y="16" width="26" height="3" rx="1.5" fill="#9ca3af" /><rect x="34" y="24" width="32" height="3" rx="1.5" fill="#9ca3af" /><rect x="34" y="32" width="20" height="3" rx="1.5" fill="#9ca3af" />
      <rect x="40" y="46" width="30" height="12" rx="2" fill="#4D94F7" />
      <circle cx="74" cy="8" r="8" fill="#4D94F7" /><path d="M70 8l3 3 5-6" stroke="#fff" strokeWidth="2" fill="none" />
    </svg>
  );
}

