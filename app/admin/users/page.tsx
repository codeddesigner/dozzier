"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Avatar, Loading, useLoad } from "@/components/ui";
import { adminRpc, bytes, day, PLAN_LABEL } from "@/lib/admin";
import { timeAgo } from "@/lib/format";

type Row = { id: string; email: string; full_name: string | null; workspace_name: string | null; plan: string; subscription_status: string | null; suspended_at: string | null; member_of: string | null;
  created_at: string; last_sign_in_at: string | null; confirmed: boolean; docs: number; bytes: number; visits: number; members: number };
const PAGE = 50;

export default function AdminUsers() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [term, setTerm] = useState("");
  const [plan, setPlan] = useState("");
  const [page, setPage] = useState(0);
  useEffect(() => { const p = new URLSearchParams(window.location.search).get("plan"); if (p) setPlan(p); }, []);
  useEffect(() => { const t = setTimeout(() => { setTerm(q); setPage(0); }, 250); return () => clearTimeout(t); }, [q]);
  const { data, loading } = useLoad(() => adminRpc<{ total: number; rows: Row[] }>("admin_users", { p_q: term, p_plan: plan, p_limit: PAGE, p_offset: page * PAGE }), [term, plan, page]);
  return (
    <>
      <div className="adm-head"><h1>Users &amp; workspaces</h1><span className="caption muted">{data ? `${data.total.toLocaleString()} accounts` : ""}</span></div>
      <div className="row gap-8 wrap">
        <label className="search" style={{ width: 300 }}><Search size={16} /><input placeholder="Search email, name or workspace" value={q} onChange={(e) => setQ(e.target.value)} autoFocus /></label>
        <select className="input" style={{ width: 170 }} value={plan} onChange={(e) => { setPlan(e.target.value); setPage(0); }}>
          <option value="">All plans</option>{Object.entries(PLAN_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}<option value="suspended">Suspended</option>
        </select>
      </div>
      <div className="adm-card" style={{ padding: "0 18px" }}>
        {loading && !data ? <Loading /> : (
          <table className="table">
            <thead><tr><th>Account</th><th>Plan</th><th>Docs</th><th>Visits</th><th>Storage</th><th>Joined</th><th>Last sign-in</th></tr></thead>
            <tbody>
              {!data?.rows.length && <tr><td colSpan={7} className="table-empty">No accounts match.</td></tr>}
              {data?.rows.map((r) => (
                <tr key={r.id} className="clickable" onClick={() => router.push(`/admin/users/${r.id}`)}>
                  <td><div className="row gap-10"><Avatar name={r.full_name} email={r.email} size={30} /><div className="col" style={{ minWidth: 0 }}>
                    <span className="medium ellipsis">{r.full_name || r.email.split("@")[0]}{!r.confirmed && <span className="badge badge-warn" style={{ marginLeft: 6 }}>Unconfirmed</span>}</span>
                    <span className="caption muted ellipsis">{r.email}{r.member_of ? " · team member" : r.workspace_name ? ` · ${r.workspace_name}` : ""}{r.members ? ` · ${r.members + 1} seats` : ""}</span></div></div></td>
                  <td>{r.suspended_at ? <span className="badge badge-danger">Suspended</span> : <span className={`badge ${r.plan === "trial" ? "badge-muted" : r.plan === "canceled" ? "badge-warn" : "badge-brand"}`}>{PLAN_LABEL[r.plan] || r.plan}</span>}
                    {r.subscription_status === "past_due" && <span className="badge badge-warn" style={{ marginLeft: 4 }}>Past due</span>}</td>
                  <td>{r.docs}</td><td>{r.visits}</td><td>{bytes(r.bytes)}</td><td className="muted">{day(r.created_at)}</td><td className="muted">{r.last_sign_in_at ? timeAgo(r.last_sign_in_at) : "Never"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {data && data.total > PAGE && (
        <div className="row gap-8"><span className="caption muted grow">{page * PAGE + 1}–{Math.min(data.total, (page + 1) * PAGE)} of {data.total}</span>
          <button className="btn btn-secondary btn-s" disabled={!page} onClick={() => setPage(page - 1)}>Previous</button>
          <button className="btn btn-secondary btn-s" disabled={(page + 1) * PAGE >= data.total} onClick={() => setPage(page + 1)}>Next</button></div>
      )}
    </>
  );
}
