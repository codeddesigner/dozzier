import { supabase } from "@/lib/supabase";

export type Level = "hidden" | "view" | "view_watermark" | "download";
export const LEVELS: { id: Level; label: string }[] = [
  { id: "download", label: "Download" }, { id: "view_watermark", label: "View + watermark" }, { id: "view", label: "View" }, { id: "hidden", label: "Hidden" },
];
export const levelLabel = (l: Level) => LEVELS.find((x) => x.id === l)?.label || l;

export type Group = { id: string; space_id: string; name: string; position: number };
export type Member = { id: string; space_id: string; group_id: string | null; email: string; name: string | null; role: "viewer" | "editor"; created_at: string };
export type Perm = { group_id: string; item_id: string; level: Level };
export type Req = { id: string; space_id: string; folder_id: string | null; title: string; details: string | null; requested_by: string | null; assignee: string | null; status: "open" | "in_review" | "done"; due_date: string | null; created_at: string };
export type Audit = { id: string; actor: string | null; action: string; kind: string; item_id: string | null; location: string | null; created_at: string };

/** Records an owner action in the Space's audit log. */
export async function audit(spaceId: string, actor: string, action: string, kind = "change", itemId?: string | null) {
  await supabase.from("space_audit").insert({ space_id: spaceId, actor, action, kind, item_id: itemId || null });
}

/** Finds an enabled link for the Space, or creates one using the Space's defaults. */
export async function spaceLink(space: { id: string; name: string; require_nda?: boolean; watermark?: boolean; allow_download?: boolean }) {
  const ex = await supabase.from("links").select("slug").eq("space_id", space.id).eq("enabled", true).order("created_at").limit(1);
  if (ex.data?.[0]) return ex.data[0].slug as string;
  const slug = `${space.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 32) || "space"}-${Math.random().toString(36).slice(2, 8)}`;
  const r = await supabase.from("links").insert({ space_id: space.id, name: space.name, slug, enabled: true, require_email: true, require_nda: !!space.require_nda, watermark: space.watermark ?? true, allow_download: !!space.allow_download, notify: true }).select("slug").single();
  if (r.error) throw r.error;
  return r.data.slug as string;
}

export function toCsv(rows: (string | number | null)[][]) {
  return rows.map((r) => r.map((c) => { const s = String(c ?? ""); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; }).join(",")).join("\n");
}
export function downloadText(name: string, text: string, type = "text/csv") {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a"); a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
