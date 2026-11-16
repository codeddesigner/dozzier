"use client";
export type Theme = "light" | "dark" | "system";

type VTDocument = Document & { startViewTransition?: (cb: () => void) => { finished: Promise<void> } };

/**
 * Applies a theme to <html data-theme> and remembers it on this device.
 * The switch is one crossfade of the whole page (View Transitions), so every colour, icon and
 * image changes together instead of each element animating on its own. Browsers without
 * View Transitions, and people who prefer reduced motion, get an instant switch.
 */
export function applyTheme(t: Theme) {
  const dark = t === "dark" || (t === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  const next = dark ? "dark" : "light";
  const root = document.documentElement;
  try { localStorage.setItem("dz-theme", t); } catch {}
  if ((root.dataset.theme || "light") === next) return;
  const swap = () => { root.dataset.theme = next; };
  const doc = document as VTDocument;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!doc.startViewTransition || reduce) return swap();
  root.classList.add("theme-switching");
  doc.startViewTransition(swap).finished.finally(() => root.classList.remove("theme-switching"));
}
