"use client";
export type Theme = "light" | "dark" | "system";

/** Applies a theme to <html data-theme> and remembers it on this device. */
export function applyTheme(t: Theme) {
  const dark = t === "dark" || (t === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  const root = document.documentElement;
  root.classList.add("theme-anim");
  root.dataset.theme = dark ? "dark" : "light";
  try { localStorage.setItem("dz-theme", t); } catch {}
  setTimeout(() => root.classList.remove("theme-anim"), 400);
}
