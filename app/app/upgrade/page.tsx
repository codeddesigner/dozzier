"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { PricingCards } from "@/components/Pricing";
import { useApp } from "@/components/AppContext";
import { toast } from "@/components/ui";
import { startCheckout } from "@/lib/billing";
import { BILLING_CURRENCY } from "@/lib/prices";

export default function Upgrade() {
  const { profile, refreshProfile } = useApp();
  const [annual, setAnnual] = useState(true);
  const { role } = useApp();
  const [busy, setBusy] = useState<string | null>(null);
  async function pick(plan: string) {
    if (role !== "Owner" && role !== "Admin") return toast("Ask a workspace admin to change the plan");
    setBusy(plan);
    const r = await startCheckout(plan, annual);
    if (r.url) { window.location.href = r.url; return; }
    if (r.disabled) {
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
        <PricingCards currency={BILLING_CURRENCY} annual={annual} trial={profile.plan === "trial"} cta={(id) => profile.plan === id || (profile.plan === "trial" && id === "datarooms")
          ? <button className="btn btn-block btn-brand" aria-disabled="true">Current plan</button>
          : <button className={`btn btn-block ${id === "standard" ? "btn-dark" : "btn-brand"}`} disabled={busy !== null} onClick={() => pick(id)}>{busy === id ? "Opening checkout…" : id === "datarooms" ? "Start free trial" : "Select plan"}</button>} />
      </div>
      <p className="caption faint mt-24">Relevant taxes are included automatically where Dozzier is registered. Prices in {BILLING_CURRENCY === "NGN" ? "Nigerian naira (NGN)" : "USD"}{annual ? ", billed annually at 20% off" : ", billed monthly"}. Standard is charged per member of your workspace. Payments are processed securely by Paystack.</p>
    </div>
  );
}
