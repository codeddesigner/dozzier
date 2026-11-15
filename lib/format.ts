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
  // Figma Avatar: first two letters of the first name — "Paul" → "Pa", "Priya Raman" → "Pr".
  const first = parts[0] || "?";
  return first.slice(0, 2).replace(/^./, (c) => c.toUpperCase());
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

export const AVATAR_COLORS = ["#3b8bff", "#ff4f8b", "#14c7b0", "#a66bff", "#ffb020", "#ff7a3d"];
export function colorFor(s: string): string {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

/** Data-room numbering: 1, 1.1, 1.2, 2 … following each folder's order (position, then name). */
export function indexItems<T extends { id: string; parent_id: string | null; position?: number; name: string }>(items: T[]): Map<string, string> {
  const out = new Map<string, string>();
  const kids = (pid: string | null) => items.filter((i) => i.parent_id === pid).sort((a, b) => (a.position ?? 0) - (b.position ?? 0) || a.name.localeCompare(b.name));
  const walk = (pid: string | null, prefix: string) => kids(pid).forEach((it, i) => { const n = prefix ? `${prefix}.${i + 1}` : String(i + 1); out.set(it.id, n); walk(it.id, n); });
  walk(null, "");
  return out;
}
