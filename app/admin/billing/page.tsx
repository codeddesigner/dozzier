"use client";
import Link from "next/link";
import { useState } from "react";
import { Gift } from "lucide-react";
import { Loading, useLoad } from "@/components/ui";
import { AssignSubscription } from "@/components/admin/AssignSubscription";
import { adminRpc, day, money, PLAN_LABEL } from "@/lib/admin";

type Row = { id: string; email: string; workspace: string | null; plan: string; subscription_status: string | null; billing_seats: number | null; billing_customer: string | null; billing_subscription: string | null; trial_ends_at: string | null; created_at: string; mrr_cents: number; comp_ends_at: string | null; comp_note: string | null };
const STATUS: Record<string, [string, string]> = { active: ["Active", "badge-success"], canceling: ["Cancels at period end", "badge-warn"], past_due: ["Payment failed", "badge-danger"], canceled: ["Ended", "badge-muted"], comped: ["Assigned", "badge-brand"] };

export default function AdminBilling() {
  const { data, loading, reload } = useLoad(() => adminRpc<Row[]>("admin_billing"), []);
  const [assign, setAssign] = useState(false);
  if (loading && !data) return <Loading />;
  const rows = data || [];
  const mrr = rows.reduce((a, r) => a + r.mrr_cents, 0);
  const n = (s: string) => rows.filter((r) => r.subscription_status === s).length;
  return (
    <>
      <div className="adm-head"><h1>Billing</h1><span className="grow" /><button className="btn btn-primary btn-s" onClick={() => setAssign(true)}><Gift size={14} />Assign subscription</button><a className="btn btn-secondary btn-s" href="https://dashboard.stripe.com/subscriptions" target="_blank" rel="noreferrer">Open Stripe</a></div>
      <div className="adm-kpis">
        <div className="adm-kpi"><b>{money(mrr)}</b><span>Monthly recurring revenue</span></div>
        <div className="adm-kpi"><b>{n("active")}</b><span>Active subscriptions</span></div>
        <div className={`adm-kpi ${n("past_due") ? "warn" : ""}`}><b>{n("past_due")}</b><span>Payment failed</span></div>
        <div className="adm-kpi"><b>{n("canceling")}</b><span>Cancelling</span></div>
        <div className="adm-kpi"><b>{n("comped")}</b><span>Assigned (free)</span></div>
      </div>
      <p className="caption muted">MRR counts monthly list prices (annual plans are billed upfront at 20% off). Stripe is the source of truth for money received.</p>
      <div className="adm-card" style={{ padding: "0 18px" }}>
        <table className="table">
          <thead><tr><th>Workspace</th><th>Plan</th><th>Status</th><th>Seats</th><th>MRR</th><th>Since</th></tr></thead>
          <tbody>
            {!rows.length && <tr><td colSpan={6} className="table-empty">No paid or comped workspaces yet.</td></tr>}
            {rows.map((r) => { const s = STATUS[r.subscription_status || ""]; return (
              <tr key={r.id}>
                <td><div className="col"><Link className="medium link" href={`/admin/users/${r.id}`}>{r.workspace || r.email}</Link><span className="caption muted">{r.email}</span></div></td>
                <td>{PLAN_LABEL[r.plan] || r.plan}</td>
                <td>{s ? <span className={`badge ${s[1]}`}>{s[0]}</span> : <span className="muted">—</span>}{r.subscription_status === "comped" && <div className="caption muted">{r.comp_ends_at ? `until ${day(r.comp_ends_at)}` : "no end date"}</div>}</td>
                <td>{r.billing_seats || "—"}</td><td>{r.mrr_cents ? money(r.mrr_cents) : "—"}</td><td className="muted">{day(r.created_at)}</td>
              </tr>
            ); })}
          </tbody>
        </table>
      </div>
      {assign && <AssignSubscription onClose={() => setAssign(false)} onDone={() => { setAssign(false); reload(); }} />}
    </>
  );
}
