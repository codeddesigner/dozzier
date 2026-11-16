"use client";
import Link from "next/link";
import { Loading, useLoad } from "@/components/ui";
import { adminRpc, bytes, money, PLAN_LABEL } from "@/lib/admin";

type Overview = {
  users: number; signups_7d: number; signups_30d: number; active_7d: number; workspaces: number; paying: number; trials: number; past_due: number;
  mrr_cents: number; documents: number; links: number; visits_30d: number; storage_bytes: number; open_support: number; open_reports: number;
  plans: Record<string, number>; series: { day: string; signups: number; visits: number; uploads: number }[];
};

function Chart({ data, k, label }: { data: Overview["series"]; k: "signups" | "visits" | "uploads"; label: string }) {
  const max = Math.max(1, ...data.map((d) => d[k]));
  const total = data.reduce((a, d) => a + d[k], 0);
  return (
    <div className="adm-card">
      <div className="row"><span className="medium grow">{label}</span><span className="caption muted">{total.toLocaleString()} in 30 days</span></div>
      <div className="adm-chart">{data.map((d) => <i key={d.day} style={{ height: `${(d[k] / max) * 100}%` }} data-tip={`${new Date(d.day).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}: ${d[k]}`} />)}</div>
    </div>
  );
}

export default function AdminOverview() {
  const { data, loading, error } = useLoad(() => adminRpc<Overview>("admin_overview"), []);
  if (loading && !data) return <Loading />;
  if (!data) return <p className="error-text">{String(error || "Couldn’t load")}</p>;
  const k: [string, string | number, string?, string?][] = [
    ["MRR", money(data.mrr_cents), undefined, "/admin/billing"], ["Paying workspaces", data.paying, undefined, "/admin/billing"],
    ["On trial", data.trials, undefined, "/admin/users?plan=trial"], ["Payment failed", data.past_due, data.past_due ? "warn" : undefined, "/admin/billing"],
    ["Users", data.users, undefined, "/admin/users"], ["Sign-ups (7 days)", data.signups_7d], ["Active (7 days)", data.active_7d], ["Workspaces", data.workspaces],
    ["Documents", data.documents.toLocaleString()], ["Links", data.links.toLocaleString()], ["Visits (30 days)", data.visits_30d.toLocaleString()], ["Storage", bytes(data.storage_bytes)],
    ["Open support", data.open_support, data.open_support ? "warn" : undefined, "/admin/support"], ["Open reports", data.open_reports, data.open_reports ? "warn" : undefined, "/admin/reports"],
  ];
  return (
    <>
      <div className="adm-head"><h1>Overview</h1></div>
      <div className="adm-kpis">{k.map(([l, v, tone, href]) => {
        const body = <><b>{v}</b><span>{l}</span></>;
        return href ? <Link key={l} href={href} className={`adm-kpi ${tone || ""}`}>{body}</Link> : <div key={l} className={`adm-kpi ${tone || ""}`}>{body}</div>;
      })}</div>
      <div className="adm-grid2">
        <Chart data={data.series} k="signups" label="Sign-ups" />
        <Chart data={data.series} k="visits" label="Document visits" />
        <Chart data={data.series} k="uploads" label="Uploads" />
        <div className="adm-card">
          <span className="medium">Plans</span>
          {Object.entries(data.plans).sort((a, b) => b[1] - a[1]).map(([p, n]) => (
            <div key={p} className="row gap-10"><span className="grow">{PLAN_LABEL[p] || p}</span><span className="muted">{n}</span>
              <div className="usage-bar" style={{ width: 120 }}><span style={{ width: `${(n / Math.max(1, data.users)) * 100}%` }} /></div></div>
          ))}
          {!Object.keys(data.plans).length && <span className="caption muted">No accounts yet.</span>}
        </div>
      </div>
    </>
  );
}
