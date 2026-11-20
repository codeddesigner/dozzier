"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { PricingCards } from "@/components/Pricing";
import { useApp } from "@/components/AppContext";
import { toast } from "@/components/ui";
import { startCheckout } from "@/lib/billing";

export default function Upgrade() {
  const { profile, refreshProfile } = useApp();
  const [annual, setAnnual] = useState(true);
  const { role } = useApp();
  const [busy, setBusy] = useState<string | null>(null);
  // Platform admins get a hidden $1/month test plan to check the whole billing flow with a real card.
  const [staff, setStaff] = useState(false);
  useEffect(() => { supabase.rpc("is_platform_admin").then(({ data }) => setStaff(!!data)); }, []);
  async function pick(plan: string) {
    if (role !== "Owner" && role !== "Admin") return toast("Ask a workspace admin to change the plan");
    setBusy(plan);
    const r = await startCheckout(plan, plan === "test" ? false : annual);
    if (r.url) { window.location.href = r.url; return; }
    if (r.disabled && plan === "test") toast("Billing isn’t connected yet");
    else if (r.disabled) {
      // Billing not connected yet: unlock the plan on the trial.
      await supabase.from("profiles").update({ plan }).eq("id", profile.id);
      await refreshProfile();
      toast("Plan unlocked on your free trial");
    } else toast(r.error || "Couldn’t start checkout");
    setBusy(null);
  }
  return (
    <div className="content">
      <div className="col gap-8" style={{ alignItems: "center", textAlign: "center" }}>
        <h1 className="page-title">Pick the plan that closes deals</h1>
        <p className="body-l muted">Every plan includes secure links, page-level analytics and unlimited visitors.</p>
        <div className="segmented mt-8"><button className={!annual ? "active" : ""} onClick={() => setAnnual(false)}>Monthly</button><button className={annual ? "active" : ""} onClick={() => setAnnual(true)}>Annually · save 20%</button></div>
      </div>
      <div className="mt-32">
        <PricingCards annual={annual} trial={profile.plan === "trial"} cta={(id) => profile.plan === id || (profile.plan === "trial" && id === "datarooms")
          ? <button className="btn btn-block btn-brand" aria-disabled="true">Current plan</button>
          : <button className={`btn btn-block ${id === "standard" ? "btn-dark" : "btn-brand"}`} disabled={busy !== null} onClick={() => pick(id)}>{busy === id ? "Opening checkout…" : id === "datarooms" ? "Start free trial" : "Select plan"}</button>} />
      </div>
      {staff && (
        <div className="card row gap-12 wrap mt-24" style={{ padding: 16, borderStyle: "dashed" }}>
          <div className="col grow" style={{ gap: 2 }}>
            <span className="medium">Test plan · $1/month <span className="badge">Admins only</span></span>
            <span className="caption muted">Charges your card $1 to check checkout, the webhook, the receipt email and Manage subscription. Your workspace’s plan doesn’t change; cancelling it puts everything back.</span>
          </div>
          <button className="btn btn-secondary" disabled={busy !== null} onClick={() => pick("test")}>{busy === "test" ? "Opening checkout…" : "Buy $1 test plan"}</button>
        </div>
      )}
      <p className="caption faint mt-24">Prices in US dollars{annual ? ", billed annually at 20% off" : ", billed monthly"}. Standard is charged per member of your workspace. Payments are processed securely by Stripe, and you can cancel any time.</p>
    </div>
  );
}
