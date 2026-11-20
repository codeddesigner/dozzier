import { createClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";
import crypto from "crypto";
import { PRICE_TABLE } from "@/lib/prices";

/** Server-only Stripe helpers (plain REST, no SDK). Prices are in cents, USD. */
export const PRICES: Record<"personal" | "standard" | "datarooms", { name: string; monthly: number; annual: number; perSeat: boolean }> = {
  personal: { name: "Personal", ...PRICE_TABLE.USD.personal, perSeat: false },
  standard: { name: "Standard", ...PRICE_TABLE.USD.standard, perSeat: true },
  datarooms: { name: "Data Rooms", ...PRICE_TABLE.USD.datarooms, perSeat: false },
};
export type PlanKey = keyof typeof PRICES;

/** Env values tolerate stray spaces, newlines or quotes from pasting. */
const env = (k: string) => (process.env[k] || "").trim().replace(/^["']|["']$/g, "").trim();
export const enabled = () => !!env("STRIPE_SECRET_KEY");
export const isStripeCustomer = (id?: string | null) => !!id && /^cus_/.test(id);

/** Flattens { a: { b: [ { c: 1 } ] } } into a[b][0][c]=1, Stripe's form encoding. */
function form(obj: Record<string, unknown>, prefix = "", out = new URLSearchParams()) {
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    const key = prefix ? `${prefix}[${k}]` : k;
    if (Array.isArray(v)) v.forEach((item, i) => (typeof item === "object" && item !== null ? form(item as Record<string, unknown>, `${key}[${i}]`, out) : out.append(`${key}[${i}]`, String(item))));
    else if (typeof v === "object") form(v as Record<string, unknown>, key, out);
    else out.append(key, String(v));
  }
  return out;
}

export async function stripe<T = Record<string, unknown>>(path: string, params?: Record<string, unknown>, method: "GET" | "POST" | "DELETE" = params ? "POST" : "GET") {
  const key = env("STRIPE_SECRET_KEY");
  if (!key) throw new Error("Billing isn’t connected yet");
  if (key.startsWith("pk_")) throw new Error("Billing is misconfigured: STRIPE_SECRET_KEY holds the publishable key (pk_…). Use the secret key (sk_… or rk_…).");
  const body = params && method !== "GET" ? form(params).toString() : undefined;
  const qs = params && method === "GET" ? `?${form(params).toString()}` : "";
  const r = await fetch(`https://api.stripe.com/v1${path}${qs}`, {
    method, cache: "no-store",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/x-www-form-urlencoded", "Stripe-Version": "2024-06-20" },
    body,
  });
  const j = (await r.json().catch(() => ({}))) as T & { error?: { message?: string } };
  if (r.status === 401) throw new Error("Billing is misconfigured: Stripe rejected the secret key. Please contact support.");
  if (!r.ok) throw new Error(j.error?.message || `Stripe error ${r.status}`);
  return j as T;
}

/** Verifies the Stripe-Signature header (HMAC-SHA256 of "t.payload", 5-minute tolerance). */
export function verifyWebhook(raw: string, header: string | null) {
  const secret = env("STRIPE_WEBHOOK_SECRET");
  if (!secret || !header) return false;
  const parts = Object.fromEntries(header.split(",").map((p) => p.split("=") as [string, string]).filter((p) => p.length === 2).map(([k, v]) => [k, v]));
  const t = Number(parts.t);
  if (!t || Math.abs(Date.now() / 1000 - t) > 300) return false;
  const want = crypto.createHmac("sha256", secret).update(`${t}.${raw}`).digest("hex");
  return header.split(",").filter((p) => p.startsWith("v1=")).some((p) => {
    const got = p.slice(3);
    return got.length === want.length && crypto.timingSafeEqual(Buffer.from(got), Buffer.from(want));
  });
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

/** Updates the workspace whose current subscription is `subscription` (ignores replaced subscriptions). */
export async function syncSubscription(subscription: string, status: string | null, plan?: string | null, seats?: number | null) {
  const { error } = await anonDb().rpc("billing_sync_subscription", { p_secret: process.env.DOZZIER_HOOK_SECRET, p_subscription: subscription, p_status: status, p_plan: plan ?? null, p_seats: seats ?? null });
  if (error) throw error;
}

/** Stripe subscription status → Dozzier's. */
export function statusFor(s: { status: string; cancel_at_period_end?: boolean }) {
  if (s.status === "canceled" || s.status === "incomplete_expired") return "canceled";
  if (s.status === "past_due" || s.status === "unpaid") return "past_due";
  if (s.status === "incomplete") return "incomplete";
  return s.cancel_at_period_end ? "canceling" : "active";
}
