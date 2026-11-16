"use client";
import Link from "next/link";
import { Loading, useLoad } from "@/components/ui";
import { adminRpc, day, PLAN_LABEL } from "@/lib/admin";

type Row = { id: string; domain: string; status: string; is_primary: boolean; created_at: string; owner_id: string; email: string; plan: string | null };

export default function AdminDomains() {
  const { data, loading } = useLoad(() => adminRpc<Row[]>("admin_domains"), []);
  if (loading && !data) return <Loading />;
  const rows = data || [];
  return (
    <>
      <div className="adm-head"><h1>Custom domains</h1><span className="caption muted">{rows.filter((r) => r.status === "active").length} live · {rows.filter((r) => r.status !== "active").length} waiting for DNS</span><span className="grow" />
        <a className="btn btn-secondary btn-s" href="https://vercel.com/getchidera-5359s-projects/dozzier/settings/domains" target="_blank" rel="noreferrer">Open in Vercel</a></div>
      <div className="adm-card" style={{ padding: "0 18px" }}>
        <table className="table">
          <thead><tr><th>Domain</th><th>Status</th><th>Workspace</th><th>Plan</th><th>Added</th></tr></thead>
          <tbody>
            {!rows.length && <tr><td colSpan={5} className="table-empty">No custom domains yet.</td></tr>}
            {rows.map((r) => (
              <tr key={r.id}>
                <td><a className="medium link" href={`https://${r.domain}`} target="_blank" rel="noreferrer">{r.domain}</a>{r.is_primary && <span className="caption muted"> · primary</span>}</td>
                <td><span className={`badge ${r.status === "active" ? "badge-success" : "badge-warn"}`}>{r.status === "active" ? "Live" : "Waiting for DNS"}</span></td>
                <td><Link className="link" href={`/admin/users/${r.owner_id}`}>{r.email}</Link></td><td>{PLAN_LABEL[r.plan || "trial"]}</td><td className="muted">{day(r.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
