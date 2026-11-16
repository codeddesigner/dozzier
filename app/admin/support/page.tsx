"use client";
import { useState } from "react";
import Link from "next/link";
import { Check, Mail, RotateCcw } from "lucide-react";
import { Loading, Tabs, toast, useLoad } from "@/components/ui";
import { adminRpc } from "@/lib/admin";
import { timeAgo } from "@/lib/format";

type Req = { id: string; user_id: string | null; name: string | null; email: string; topic: string | null; subject: string | null; body: string; status: string; created_at: string; meta: Record<string, unknown> | null };

export default function AdminSupport() {
  const [tab, setTab] = useState<"open" | "resolved">("open");
  const { data, loading, reload } = useLoad(() => adminRpc<Req[]>("admin_support", { p_status: tab }), [tab]);
  async function set(id: string, s: string) { try { await adminRpc("admin_support_set", { p_id: id, p_status: s }); toast(s === "resolved" ? "Marked resolved" : "Reopened"); reload(); } catch (e) { toast((e as Error).message); } }
  return (
    <>
      <div className="adm-head"><h1>Support</h1></div>
      <Tabs value={tab} onChange={setTab} tabs={[{ id: "open", label: "Open" }, { id: "resolved", label: "Resolved" }]} />
      {loading && !data ? <Loading /> : !data?.length ? <p className="muted">{tab === "open" ? "Inbox zero — no open requests." : "Nothing resolved yet."}</p> : data.map((r) => (
        <div key={r.id} className="adm-card">
          <div className="row gap-10 wrap">
            <div className="col grow" style={{ minWidth: 0 }}><span className="medium">{r.subject || r.topic || "Support request"}</span>
              <span className="caption muted">{r.name ? `${r.name} · ` : ""}{r.user_id ? <Link className="link" href={`/admin/users/${r.user_id}`}>{r.email}</Link> : r.email}{r.topic ? ` · ${r.topic}` : ""} · {timeAgo(r.created_at)}</span></div>
            <a className="btn btn-secondary btn-s" href={`mailto:${r.email}?subject=${encodeURIComponent(`Re: ${r.subject || r.topic || "your Dozzier request"}`)}`}><Mail size={14} />Reply by email</a>
            {r.status === "open" ? <button className="btn btn-brand btn-s" onClick={() => set(r.id, "resolved")}><Check size={14} />Resolve</button> : <button className="btn btn-ghost btn-s" onClick={() => set(r.id, "open")}><RotateCcw size={14} />Reopen</button>}
          </div>
          <p className="adm-pre">{r.body}</p>
        </div>
      ))}
    </>
  );
}
