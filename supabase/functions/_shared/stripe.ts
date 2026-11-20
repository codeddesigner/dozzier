// Shared by the billing edge functions. Stripe over plain REST; keys come from Supabase secrets.
import { createClient } from "jsr:@supabase/supabase-js@2";

export const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};
export const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

// Prices in US cents. Keep in sync with lib/prices.ts in the app.
export const PRICES: Record<string, { name: string; monthly: number; annual: number; perSeat: boolean }> = {
  personal: { name: "Personal", monthly: 500, annual: 4800, perSeat: false },
  standard: { name: "Standard", monthly: 2500, annual: 24000, perSeat: true },
  datarooms: { name: "Data Rooms", monthly: 14000, annual: 134400, perSeat: false },
};

const clean = (v?: string) => (v || "").trim().replace(/^["']|["']$/g, "").trim();
/** Finds a secret by its preferred names, then by its Stripe prefix, so the exact secret name doesn't matter. */
function findSecret(names: string[], prefixes: string[]) {
  for (const n of names) { const v = clean(Deno.env.get(n)); if (v) return v; }
  for (const [k, v] of Object.entries(Deno.env.toObject())) {
    if (/stripe/i.test(k) && prefixes.some((p) => clean(v).startsWith(p))) return clean(v);
  }
  return "";
}
export const stripeKey = () => findSecret(["STRIPE_SECRET_KEY", "STRIPE_RESTRICTED_KEY", "STRIPE_API_KEY", "STRIPE_KEY", "STRIPE_SECRET"], ["sk_", "rk_"]);
export const webhookSecret = () => findSecret(["STRIPE_WEBHOOK_SECRET", "STRIPE_WEBHOOK_SIGNING_SECRET", "STRIPE_SIGNING_SECRET", "STRIPE_ENDPOINT_SECRET"], ["whsec_"]);

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

export async function stripe<T = Record<string, unknown>>(path: string, params?: Record<string, unknown>, method: "GET" | "POST" | "DELETE" = params ? "POST" : "GET"): Promise<T> {
  const key = stripeKey();
  if (!key) throw new Error("Billing isn’t connected yet");
  if (key.startsWith("pk_")) throw new Error("Billing is misconfigured: the Stripe secret holds the publishable key (pk_…).");
  const r = await fetch(`https://api.stripe.com/v1${path}`, {
    method,
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/x-www-form-urlencoded", "Stripe-Version": "2024-06-20" },
    body: params && method !== "GET" ? form(params).toString() : undefined,
  });
  const j = await r.json().catch(() => ({})) as T & { error?: { message?: string } };
  if (r.status === 401) throw new Error("Billing is misconfigured: Stripe rejected the secret key.");
  if (!r.ok) throw new Error(j.error?.message || `Stripe error ${r.status}`);
  return j as T;
}

const URL_ = Deno.env.get("SUPABASE_URL")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY") || (() => { try { return Object.values(JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") || "{}"))[0] as string; } catch { return ""; } })();
const SERVICE = (() => { try { const k = Object.values(JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}"))[0] as string; if (k) return k; } catch {} return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""; })();

/** Full-access client for webhook writes (server only). */
export const admin = () => createClient(URL_, SERVICE, { auth: { persistSession: false } });

/** The signed-in caller, their workspace and role; null if the token is missing or invalid. */
export async function caller(req: Request) {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const sb = createClient(URL_, ANON, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } });
  const { data: u } = await sb.auth.getUser(token);
  if (!u.user) return null;
  const [{ data: ws }, { data: role }] = await Promise.all([sb.rpc("ws"), sb.rpc("ws_role")]);
  // If the role lookup fails, treat the caller as having no role (deny) rather than as the owner.
  return { sb, user: u.user, ws: (ws as string) || u.user.id, role: (role as string) || "" };
}

export const isStripeCustomer = (id?: string | null) => !!id && /^cus_/.test(id);
export const origin = (req: Request) => { const o = req.headers.get("origin") || ""; return /^https:\/\/([a-z0-9-]+\.)*dozzier\.co$/.test(o) ? o : "https://dozzier.co"; };
