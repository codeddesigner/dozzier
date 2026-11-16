"use client";
import { useState } from "react";
import Link from "next/link";
import { Loading, Tabs, toast, useLoad } from "@/components/ui";
import { adminRpc } from "@/lib/admin";
import { timeAgo } from "@/lib/format";

type Rep = { id: string; slug: string; reason: string; details: string | null; reporter_email: string | null; status: string; created_at: string;
  link_id: string | null; link_name: string | null; link_enabled: boolean | null; owner_id: string | null; owner_email: string | null; document: string | null; suspended: boolean | null };

export default function AdminReports() {
  const [tab, setTab] = useState<"open" | "actioned" | "dismissed">("open");
  const { data, loading, reload } = useLoad(() => adminRpc<Rep[]>("admin_reports", { p_status: tab }), [tab]);
  async function run(fn: string, args: Record<string, unknown>, msg: string) { try { await adminRpc(fn, args); toast(msg); reload(); } catch (e) { toast((e as Error).message); } }
  return (
    <>
      <div className="adm-head"><h1>Reported links</h1><span className="caption muted">Visitors report links from the viewer (abuse, phishing, malware, copyright).</span></div>
      <Tabs value={tab} onChange={setTab} tabs={[{ id: "open", label: "Open" }, { id: "actioned", label: "Actioned" }, { id: "dismissed", label: "Dismissed" }]} />
      {loading && !data ? <Loading /> : !data?.length ? <p className="muted">No {tab} reports.</p> : data.map((r) => (
        <div key={r.id} className="adm-card">
          <div className="row gap-10 wrap">
            <div className="col grow" style={{ minWidth: 0 }}>
              <span className="medium"><span className="badge badge-danger" style={{ marginRight: 8 }}>{r.reason}</span>{r.document || r.link_name || r.slug}</span>
              <span className="caption muted"><a className="link" href={`/v/${r.slug}`} target="_blank" rel="noreferrer">/v/{r.slug}</a>{r.owner_email && <> · shared by <Link className="link" href={`/admin/users/${r.owner_id}`}>{r.owner_email}</Link></>}{r.suspended ? " · owner suspended" : ""} · reported {timeAgo(r.created_at)}{r.reporter_email ? ` by ${r.reporter_email}` : ""}</span>
            </div>
            {r.link_id && (r.link_enabled ? <button className="btn btn-secondary btn-s" onClick={() => run("admin_set_link", { p_link: r.link_id, p_enabled: false }, "Link turned off")}>Turn off link</button>
              : <button className="btn btn-ghost btn-s" onClick={() => run("admin_set_link", { p_link: r.link_id, p_enabled: true }, "Link turned back on")}>Turn link back on</button>)}
            {r.owner_id && <Link className="btn btn-secondary btn-s" href={`/admin/users/${r.owner_id}`}>Owner…</Link>}
            {r.status === "open" ? <>
              <button className="btn btn-brand btn-s" onClick={() => run("admin_report_set", { p_id: r.id, p_status: "actioned" }, "Marked actioned")}>Actioned</button>
              <button className="btn btn-ghost btn-s" onClick={() => run("admin_report_set", { p_id: r.id, p_status: "dismissed" }, "Dismissed")}>Dismiss</button>
            </> : <button className="btn btn-ghost btn-s" onClick={() => run("admin_report_set", { p_id: r.id, p_status: "open" }, "Reopened")}>Reopen</button>}
          </div>
          {r.details && <p className="adm-pre">{r.details}</p>}
        </div>
      ))}
    </>
  );
}
