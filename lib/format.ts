export function timeAgo(iso?: string | null): string {
  if (!iso) return "—";
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "Just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} minute${m === 1 ? "" : "s"} ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? "" : "s"} ago`;
  const d = Math.floor(h / 24);
  if (d === 1) return "Yesterday";
  if (d < 7) return `${d} days ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function duration(sec?: number | null): string {
  const s = Math.round(sec || 0);
  const m = Math.floor(s / 60);
  const r = s % 60;
  if (m >= 60) return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

export function shortDur(sec: number): string {
  const s = Math.round(sec);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function pct(cur: number, prev: number): { label: string; tone: "up" | "down" | "flat" } {
  if (!prev && !cur) return { label: "0%", tone: "flat" };
  if (!prev) return { label: "↑ 100%", tone: "up" };
  const p = Math.round(((cur - prev) / prev) * 100);
  if (p === 0) return { label: "0%", tone: "flat" };
  return { label: `${p > 0 ? "↑" : "↓"} ${Math.abs(p)}%`, tone: p > 0 ? "up" : "down" };
}

export function initials(name?: string | null, email?: string | null): string {
  const src = (name || email || "?").trim();
  const parts = src.split(/[\s@._-]+/).filter(Boolean);
  if (parts.length >= 2 && name) return (parts[0][0] + parts[1][0]).toUpperCase();
  return src.slice(0, 2).replace(/^./, (c) => c.toUpperCase());
}

export function displayName(email?: string | null, name?: string | null): string {
  if (name) return name;
  if (!email) return "Anonymous";
  const n = email.split("@")[0];
  return n.charAt(0).toUpperCase() + n.slice(1);
}

export function slugify(s: string): string {
  const base = s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "link";
  return `${base}-${Math.random().toString(36).slice(2, 8)}`;
}

export function fileKind(nameOrMime: string): string {
  const s = nameOrMime.toLowerCase();
  if (s.includes("pdf")) return "pdf";
  if (/(ppt|key|presentation)/.test(s)) return "deck";
  if (/(xls|csv|sheet)/.test(s)) return "sheet";
  if (/(doc|word|txt|rtf)/.test(s)) return "doc";
  if (/(png|jpe?g|gif|webp|svg|image)/.test(s)) return "image";
  if (/(mp4|mov|webm|video)/.test(s)) return "video";
  return "file";
}

/** 0–100 engagement score from time, revisits, downloads and breadth. */
export function intentScore(v: { seconds: number; visits: number; downloads: number; pages?: number }): number {
  const score = Math.min(45, v.seconds / 8) + Math.min(30, (v.visits - 1) * 10) + Math.min(15, v.downloads * 15) + Math.min(10, (v.pages || 0));
  return Math.round(Math.min(100, Math.max(0, score)));
}
export function intentLevel(score: number): { label: string; tone: "danger" | "warn" | "muted" } {
  if (score >= 70) return { label: "Hot", tone: "danger" };
  if (score >= 40) return { label: "Warm", tone: "warn" };
  return { label: "Cold", tone: "muted" };
}

export const AVATAR_COLORS = ["#ff5a1f", "#0061fe", "#7a5af8", "#0e9384", "#f79009", "#dd2590"];
export function colorFor(s: string): string {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}
