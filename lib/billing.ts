"use client";
import { supabase } from "@/lib/supabase";

/** Calls a billing edge function (Supabase) and normalises its reply, including error bodies. */
async function call(fn: "billing-checkout" | "billing-portal", body?: unknown) {
  const { data, error } = await supabase.functions.invoke(fn, { body: body ?? {} });
  if (!error) return { ok: true, ...(data as { url?: string }) } as { ok: boolean; url?: string; error?: string; disabled?: boolean };
  const ctx = (error as { context?: Response }).context;
  const j = ctx ? await ctx.json().catch(() => ({})) : {};
  return { ok: false, error: (j as { error?: string }).error || "Something went wrong — please try again", disabled: !!(j as { disabled?: boolean }).disabled };
}

/** Starts Stripe checkout; returns { disabled: true } when billing isn't connected yet. */
export const startCheckout = (plan: string, annual: boolean) => call("billing-checkout", { plan, annual });
export const openBillingPortal = () => call("billing-portal");
