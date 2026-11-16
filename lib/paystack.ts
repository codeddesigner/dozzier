import { createClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";

/** Server-only Paystack helpers. Prices are in the smallest unit (cents for USD). */
import { BILLING_CURRENCY, PRICE_TABLE } from "@/lib/prices";
export const CURRENCY = BILLING_CURRENCY;
const T = PRICE_TABLE[CURRENCY];
export const PRICES: Record<"personal" | "standard" | "datarooms", { name: string; monthly: number; annual: number; perSeat: boolean }> = {
  personal: { name: "Personal", ...T.personal, perSeat: false },
  standard: { name: "Standard", ...T.standard, perSeat: true },
  datarooms: { name: "Data Rooms", ...T.datarooms, perSeat: false },
};
/** The secret key, tolerating stray spaces, newlines or quotes pasted into the env var. */
const secret = () => (process.env.PAYSTACK_SECRET_KEY || "").trim().replace(/^["']|["']$/g, "").trim();
export const enabled = () => !!secret();

export async function paystack<T = Record<string, unknown>>(path: string, init?: { method?: string; body?: unknown }) {
  const key = secret();
  if (key.startsWith("pk_")) throw new Error("Billing is misconfigured: PAYSTACK_SECRET_KEY holds the public key (pk_…). Use the secret key (sk_…).");
  const r = await fetch(`https://api.paystack.co${path}`, {
    method: init?.method || "GET",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: init?.body ? JSON.stringify(init.body) : undefined, cache: "no-store",
  });
  const j = (await r.json().catch(() => ({}))) as { status?: boolean; message?: string; data?: T };
  if (r.status === 401 || /invalid key/i.test(j.message || "")) throw new Error("Billing is misconfigured: Paystack rejected the secret key. Please contact support.");
  if (!r.ok || j.status === false) throw new Error(j.message || `Paystack error ${r.status}`);
  return j.data as T;
}

/** Finds or creates the Paystack plan for this price; one plan per plan/interval/seat count. */
export async function ensurePlan(name: string, amount: number, interval: "monthly" | "annually") {
  const list = await paystack<{ plan_code: string; name: string; amount: number; interval: string; currency: string }[]>(`/plan?perPage=200`);
  const hit = list.find((p) => p.name === name && p.amount === amount && p.interval === interval && p.currency === CURRENCY);
  if (hit) return hit.plan_code;
  const p = await paystack<{ plan_code: string }>(`/plan`, { method: "POST", body: { name, amount, interval, currency: CURRENCY, send_invoices: true, send_sms: false } });
  return p.plan_code;
}

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://hxgcoekovalkmdwcabll.supabase.co";
const SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_D1l_C12Kv_Y-yhzzALG6oA_rL3T1WQ1";
export const anonDb = () => createClient(SB_URL, SB_KEY, { auth: { persistSession: false } });

/** The signed-in user (from the Bearer token), their workspace and role. */
export async function authed(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const sb = createClient(SB_URL, SB_KEY, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } });
  const { data: u } = await sb.auth.getUser(token);
  if (!u.user) return null;
  const [{ data: ws }, { data: role }] = await Promise.all([sb.rpc("ws"), sb.rpc("ws_role")]);
  return { sb, user: u.user, ws: (ws as string) || u.user.id, role: (role as string) || "Owner" };
}

/** Writes billing state through the secret-checked database function. */
export async function billingUpdate(a: { ws?: string | null; customer?: string | null; plan?: string | null; status?: string | null; subscription?: string | null; seats?: number | null }) {
  const { error } = await anonDb().rpc("billing_update", { p_secret: process.env.DOZZIER_HOOK_SECRET, p_ws: a.ws ?? null, p_customer: a.customer ?? null, p_plan: a.plan ?? null, p_status: a.status ?? null, p_subscription: a.subscription ?? null, p_seats: a.seats ?? null });
  if (error) throw error;
}
