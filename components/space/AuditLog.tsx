"use client";
import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { supabase, SpaceItem } from "@/lib/supabase";
import { Avatar, useLoad } from "@/components/ui";
import { Audit, downloadText, toCsv } from "@/lib/space";

const RANGES = [{ d: 7, l: "Last 7 days" }, { d: 30, l: "Last 30 days" }, { d: 90, l: "Last 90 days" }, { d: 0, l: "All time" }];
const KINDS: Record<string, string> = { join: "Joined / opened", view: "Viewed", download: "Downloaded", request: "Requests", permission: "Permissions", upload: "Uploads", change: "Settings" };

const fmt = (s: string) => new Date(s).toLocaleString("en-GB", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" }).replace(",", ",");

export function AuditLog({ spaceId, spaceName, items }: { spaceId: string; spaceName: string; items: SpaceItem[] }) {
  const [range, setRange] = useState(7);
  const [who, setWho] = useState("");
  const [kind, setKind] = useState("");
  const [folder, setFolder] = useState("");
  const { data } = useLoad(async () => {
    let q = supabase.from("space_audit").select("id,actor,action,kind,item_id,location,created_at").eq("space_id", spaceId).order("created_at", { ascending: false }).limit(1000);
    if (range) q = q.gte("created_at", new Date(Date.now() - range * 86400000).toISOString());
    return ((await q).data || []) as Audit[];
  }, [spaceId, range]);
  const rootOf = useMemo(() => {
    const by = new Map(items.map((i) => [i.id, i]));
    return (id: string | null) => { let it = id ? by.get(id) : undefined; while (it?.parent_id) it = by.get(it.parent_id); return it?.id || null; };
  }, [items]);
  const folders = items.filter((i) => !i.parent_id && i.kind === "folder");
  const rows = (data || []).filter((a) => (!who || a.actor === who) && (!kind || a.kind === kind) && (!folder || rootOf(a.item_id) === folder));
  const actors = [...new Set((data || []).map((a) => a.actor).filter(Boolean))] as string[];

  return (
    <div className="mt-24">
      <div className="row gap-8 wrap">
        <select className="filter-pill" value={range} onChange={(e) => setRange(Number(e.target.value))}>{RANGES.map((r) => <option key={r.d} value={r.d}>{r.l}</option>)}</select>
        <select className="filter-pill" value={who} onChange={(e) => setWho(e.target.value)}><option value="">All people</option>{actors.map((a) => <option key={a}>{a}</option>)}</select>
        <select className="filter-pill" value={kind} onChange={(e) => setKind(e.target.value)}><option value="">All actions</option>{Object.entries(KINDS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
        <select className="filter-pill" value={folder} onChange={(e) => setFolder(e.target.value)}><option value="">All folders</option>{folders.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}</select>
        <span className="grow" />
        <button className="btn btn-secondary btn-s" disabled={!rows.length} onClick={() => downloadText(`${spaceName.replace(/[^\w]+/g, "-")}-audit-log.csv`, toCsv([["Time (UTC)", "Person", "Action", "Location"], ...rows.map((a) => [a.created_at, a.actor, a.action, a.location])]))}><Download size={14} />Export CSV</button>
      </div>
      <div className="card mt-16 audit-list">
        {!data && <div className="skeleton" style={{ padding: 16 }}><span /><span /><span /></div>}
        {data && rows.length === 0 && <div className="table-empty" style={{ padding: 28 }}>No activity in this period. Every view, download, permission change and request is recorded here.</div>}
        {rows.map((a, i) => (
          <div key={a.id} className="audit-row" style={{ animationDelay: `${Math.min(i, 12) * 20}ms` }}>
            <span className="caption muted audit-time">{fmt(a.created_at)}</span>
            <span className="row gap-8 audit-who"><Avatar email={a.actor?.includes("@") ? a.actor : null} name={a.actor || "?"} size={20} /><span className="ellipsis" style={{ fontSize: 14 }}>{a.actor}</span></span>
            <span className="grow audit-what" style={{ fontSize: 14 }}>{a.action}</span>
            <span className="caption muted hide-sm">{a.location || "—"}</span>
          </div>
        ))}
      </div>
      <p className="caption faint mt-8">Entries can’t be edited or deleted. {rows.length ? `${rows.length} shown.` : ""}</p>
    </div>
  );
}
