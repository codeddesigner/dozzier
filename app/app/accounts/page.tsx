"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Archive, ArchiveRestore, Trash2 } from "lucide-react";
import { supabase, Account } from "@/lib/supabase";
import { Avatar, Loading, Menu, useLoad } from "@/components/ui";
import { timeAgo, intentScore, intentLevel } from "@/lib/format";

type V = { account_id: string; visitor_email: string | null; started_at: string; duration_seconds: number; downloaded: boolean };

export default function Accounts() {
  const router = useRouter();
  const [activity, setActivity] = useState<"active" | "idle" | "all">("active");
  const [archived, setArchived] = useState(false);
  const { data, loading, reload } = useLoad(async () => {
    const [a, v] = await Promise.all([
      supabase.from("accounts").select("*").order("created_at", { ascending: false }),
      supabase.from("visits").select("account_id,visitor_email,started_at,duration_seconds,downloaded").not("account_id", "is", null).order("started_at", { ascending: false }),
    ]);
    return { accounts: (a.data || []) as Account[], visits: (v.data || []) as V[] };
  }, []);

  const rows = useMemo(() => {
    if (!data) return [];
    return data.accounts.filter((a) => archived || !a.archived).map((a) => {
      const vs = data.visits.filter((v) => v.account_id === a.id);
      const last = vs[0]?.started_at || null;
      return { a, vs, last, visitors: [...new Set(vs.map((v) => v.visitor_email))].filter(Boolean) as string[],
        score: intentScore({ seconds: vs.reduce((s, v) => s + v.duration_seconds, 0), visits: vs.length, downloads: vs.filter((v) => v.downloaded).length }) };
    }).filter((r) => activity === "all" || (activity === "active" ? r.last && Date.now() - +new Date(r.last) < 14 * 86400000 : !r.last || Date.now() - +new Date(r.last) >= 14 * 86400000))
      .sort((x, y) => +new Date(y.last || 0) - +new Date(x.last || 0));
  }, [data, activity, archived]);

  return (
    <div className="content">
      <div className="page-head"><h1 className="page-title">Accounts</h1><span className="stat-pill"><Building2 size={14} />{data?.accounts.filter((a) => !a.archived).length ?? "–"}</span></div>
      <div className="row gap-8 mt-24 wrap">
        {(["active", "idle", "all"] as const).map((f) => <button key={f} className={`chip ${activity === f ? "active" : ""}`} onClick={() => setActivity(f)}>{f[0].toUpperCase() + f.slice(1)}</button>)}
        <span style={{ width: 1, height: 20, background: "var(--dz-border-default)" }} />
        <label className="checkbox"><input type="checkbox" checked={archived} onChange={(e) => setArchived(e.target.checked)} />Include archived accounts</label>
      </div>
      {loading && !data ? <Loading /> : (
        <table className="table caps mt-24">
          <thead><tr><th>Name</th><th className="hide-sm">Last activity</th><th className="hide-sm">Contributors</th><th>Intent</th><th className="num">Visits</th><th className="num">Visitors</th><th style={{ width: 40 }} /></tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={7} className="table-empty">No accounts match. Accounts are created automatically from visitors’ company email domains.</td></tr>}
            {rows.map(({ a, vs, last, visitors, score }) => {
              const lvl = intentLevel(score);
              return (
                <tr key={a.id} className="clickable" onClick={() => router.push(`/app/accounts/${a.id}`)}>
                  <td><span className="medium">{a.name}</span> {a.is_sample && <span className="tag">Sample account</span>} {a.archived && <span className="tag">Archived</span>}</td>
                  <td className="hide-sm">{last ? timeAgo(last) : "No activity"}</td>
                  <td className="hide-sm"><div className="avatar-stack">{visitors.slice(0, 3).map((e) => <Avatar key={e} email={e} size={24} />)}</div></td>
                  <td><span className={`intent ${lvl.tone}`}>{lvl.label} · {score}</span></td>
                  <td className="num">{vs.length}</td><td className="num">{visitors.length}</td>
                  <td><Menu items={[
                    a.archived ? { label: "Unarchive", icon: <ArchiveRestore size={14} />, onClick: async () => { await supabase.from("accounts").update({ archived: false }).eq("id", a.id); reload(); } }
                      : { label: "Archive", icon: <Archive size={14} />, onClick: async () => { await supabase.from("accounts").update({ archived: true }).eq("id", a.id); reload(); } },
                    { label: "Delete", icon: <Trash2 size={14} />, danger: true, onClick: async () => { await supabase.from("accounts").delete().eq("id", a.id); reload(); } },
                  ]} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
