"use client";
import { useEffect, useState } from "react";
import { openBillingPortal } from "@/lib/billing";
import Link from "next/link";
import { CreditCard, Receipt } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useApp } from "@/components/AppContext";
import { Loading, toast, useLoad } from "@/components/ui";
import { Card, SettingsHead } from "@/components/settings/kit";
import { PLAN_LIMITS } from "@/lib/limits";

const PLAN = PLAN_LIMITS;

const STATUS: Record<string, string> = { active: "Subscription active", canceling: "Cancels at the end of this period", canceled: "Subscription ended", past_due: "Last payment failed — update your card" };

export default function Billing() {
  const { profile, refreshProfile } = useApp();
  const [opening, setOpening] = useState(false);
  async function manage() { setOpening(true); const r = await openBillingPortal(); setOpening(false); if (r.url) window.open(r.url, "_blank"); else toast(r.error || "Couldn’t open billing"); }
  // Back from Paystack checkout: the webhook updates the plan within a few seconds.
  useEffect(() => {
    if (!new URLSearchParams(window.location.search).get("paid")) return;
    toast("Payment received — updating your plan…");
    window.history.replaceState(null, "", "/app/settings/billing");
    const t = [2000, 5000, 10000].map((ms) => setTimeout(() => refreshProfile(), ms));
    return () => t.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const plan = PLAN[profile.plan] || PLAN.trial;
  const trialEnds = new Date(new Date(profile.created_at).getTime() + 14 * 86400000);
  const { data, loading } = useLoad(async () => {
    const [inv, mem, sp, ag, docs] = await Promise.all([
      supabase.from("invites").select("id", { count: "exact", head: true }).is("accepted_at", null),
      supabase.from("workspace_members").select("user_id", { count: "exact", head: true }),
      supabase.from("spaces").select("id", { count: "exact", head: true }),
      supabase.from("agreements").select("id", { count: "exact", head: true }),
      supabase.from("documents").select("size_bytes").is("deleted_at", null),
    ]);
    const bytes = (docs.data || []).reduce((a, d: { size_bytes: number | null }) => a + (d.size_bytes || 0), 0);
    return { seats: 1 + (mem.count || 0) + (inv.count || 0), rooms: sp.count || 0, esign: ag.count || 0, gb: bytes / 1e9 };
  }, []);
  const meters: [string, number, number, (n: number) => string][] = data ? [
    ["Seats", data.seats, plan.seats, (n) => `${n}`], ["Data rooms", data.rooms, plan.rooms, (n) => `${n}`],
    ["eSignatures", data.esign, plan.esign, (n) => `${n}`], ["Storage", data.gb, plan.gb, (n) => (n < 1 ? `${Math.round(n * 1000)} MB` : `${n.toFixed(1)} GB`)],
  ] : [];
  return (
    <>
      <SettingsHead title="Billing & plan" sub="Manage your subscription and invoices." />
      <div className="row gap-16" style={{ alignItems: "stretch", flexWrap: "wrap" }}>
        <div className="plan-card">
          <span className="overline" style={{ color: "rgba(255,255,255,.75)" }}>Current plan</span>
          <span className="h2" style={{ color: "#fff" }}>{plan.name}</span>
          <span style={{ color: "rgba(255,255,255,.85)", fontSize: 14 }}>{profile.plan === "trial" ? `Ends ${trialEnds.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}` : plan.price}</span>
          <div className="row gap-8" style={{ marginTop: 8 }}><Link href="/app/upgrade" className="btn btn-s" style={{ background: "#fff", color: "#111827" }}>{profile.plan === "trial" ? "Choose a plan" : "Change plan"}</Link></div>
        </div>
        <Card title="Payment & subscription" style={{ flex: 1, minWidth: 240 }}>
          <div className="row gap-10"><CreditCard size={20} className="faint" /><span className="grow muted" style={{ fontSize: 14 }}>{STATUS[profile.subscription_status || ""] || (profile.plan === "trial" ? "Free trial — no card needed" : "No subscription yet")}</span></div>
          {profile.billing_subscription
            ? <><p className="caption faint">Update your card, download receipts or cancel on Paystack’s secure page.</p><div><button className="btn btn-secondary btn-s" disabled={opening} onClick={manage}>{opening ? "Opening…" : "Manage subscription"}</button></div></>
            : <p className="caption faint">Payments are processed securely by Paystack. Pick a plan to subscribe.</p>}
        </Card>
      </div>
      <Card title="Usage this period">
        {loading && !data ? <Loading /> : (
          <div className="usage-grid">
            {meters.map(([l, n, max, f]) => (
              <div key={l} className="col gap-6">
                <div className="row"><span className="medium grow">{l}</span><span className="caption muted">{f(n)} of {l === "Storage" ? `${max} GB` : max}</span></div>
                <div className="usage-bar"><span style={{ width: `${Math.min(100, (n / Math.max(1, max)) * 100)}%` }} /></div>
              </div>
            ))}
          </div>
        )}
      </Card>
      <Card title="Invoices">
        <div className="row gap-10" style={{ padding: "8px 0" }}><Receipt size={18} className="faint" /><span className="muted" style={{ fontSize: 14 }}>{profile.billing_subscription ? "Paystack emails a receipt for every payment. Past invoices are on the Manage subscription page." : `No invoices yet${profile.plan === "trial" ? " — you’re on the free trial" : ""}.`}</span></div>
      </Card>
    </>
  );
}
