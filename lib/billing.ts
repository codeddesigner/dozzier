"use client";
import { supabase } from "@/lib/supabase";

async function call(path: string, method: "GET" | "POST", body?: unknown) {
  const { data } = await supabase.auth.getSession();
  const r = await fetch(path, { method, headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session?.access_token}` }, body: body ? JSON.stringify(body) : undefined });
  const j = (await r.json().catch(() => ({}))) as { url?: string; error?: string; disabled?: boolean };
  return { ok: r.ok, ...j };
}
/** Starts Stripe checkout; returns { disabled: true } when billing isn't connected yet. */
export const startCheckout = (plan: string, annual: boolean) => call("/api/billing/checkout", "POST", { plan, annual });
export const openBillingPortal = () => call("/api/billing/manage", "GET");
