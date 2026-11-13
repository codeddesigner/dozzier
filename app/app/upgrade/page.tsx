"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { PricingCards } from "@/components/Pricing";
import { useApp } from "@/components/AppContext";
import { toast } from "@/components/ui";

export default function Upgrade() {
  const { profile, refreshProfile } = useApp();
  const [annual, setAnnual] = useState(false);
  async function pick(plan: string) {
    await supabase.from("profiles").update({ plan }).eq("id", profile.id);
    await refreshProfile();
    toast("Plan updated — enjoy your 14-day trial");
  }
  return (
    <div className="content">
      <div className="col gap-8" style={{ alignItems: "center", textAlign: "center" }}>
        <h1 className="page-title">Pick the plan that closes deals</h1>
        <p className="body-l muted">Every plan includes secure links, page-level analytics and unlimited visitors.</p>
        <div className="segmented mt-8"><button className={!annual ? "active" : ""} onClick={() => setAnnual(false)}>Monthly</button><button className={annual ? "active" : ""} onClick={() => setAnnual(true)}>Annually · save 20%</button></div>
      </div>
      <div className="mt-32">
        <PricingCards cta={(id) => profile.plan === id
          ? <button className="btn btn-block btn-secondary" disabled>Current plan</button>
          : <button className={`btn btn-block ${id === "standard" ? "btn-primary" : "btn-dark"}`} onClick={() => pick(id)}>{id === "datarooms" ? "Start free trial" : "Select plan"}</button>} />
      </div>
      <p className="caption faint mt-24">Relevant taxes are included automatically where Dozzier is registered. Prices in USD{annual ? ", billed annually at 20% off" : ""}. Billing isn’t connected yet — selecting a plan unlocks it on a trial.</p>
    </div>
  );
}
