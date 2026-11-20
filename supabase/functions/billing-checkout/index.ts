// POST { plan, annual } → Stripe Checkout URL for the caller's workspace (USD).
// GET → which Stripe secrets are present (never their values), for setup checks.
import { CORS, json, PRICES, stripe, stripeKey, webhookSecret, caller, isStripeCustomer, origin } from "./stripe.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method === "GET") return json({ stripe_key: !!stripeKey(), stripe_key_mode: stripeKey().includes("_live_") ? "live" : stripeKey() ? "test" : null, webhook_secret: !!webhookSecret() });
  if (!stripeKey()) return json({ error: "Billing isn’t connected yet", disabled: true }, 503);
  const a = await caller(req);
  if (!a) return json({ error: "Sign in again" }, 401);
  if (a.role !== "Owner" && a.role !== "Admin") return json({ error: "Only workspace admins can change the plan" }, 403);
  const { plan, annual } = await req.json().catch(() => ({})) as { plan?: string; annual?: boolean };
  // "test" is a hidden $1/month plan for platform admins to check the whole billing flow with a real card.
  const isTest = plan === "test";
  if (isTest) {
    const { data: staff } = await a.sb.rpc("is_platform_admin");
    if (!staff) return json({ error: "Unknown plan" }, 400);
  }
  const p = isTest ? { name: "Test (admin only)", monthly: 100, annual: 100, perSeat: false } : plan ? PRICES[plan] : undefined;
  if (!p) return json({ error: "Unknown plan" }, 400);

  // Standard is per user: everyone in the workspace plus pending invites.
  let seats = 1;
  if (p.perSeat) {
    const [m, i] = await Promise.all([
      a.sb.from("workspace_members").select("user_id", { count: "exact", head: true }),
      a.sb.from("invites").select("id", { count: "exact", head: true }).is("accepted_at", null),
    ]);
    seats = Math.max(1, 1 + (m.count || 0) + (i.count || 0));
  }
  const { data: prof } = await a.sb.from("profiles").select("billing_customer, subscription_status").eq("id", a.ws).maybeSingle();
  const customer = isStripeCustomer(prof?.billing_customer) ? prof!.billing_customer as string : null;
  const site = origin(req);
  // The test plan remembers the workspace's billing status so cancelling it can put it back.
  const meta = { ws: a.ws, plan, annual: annual && !isTest ? "1" : "0", seats: String(seats), ...(isTest ? { prev_status: prof?.subscription_status || "" } : {}) };
  try {
    const s = await stripe<{ url: string }>("/checkout/sessions", {
      mode: "subscription",
      client_reference_id: a.ws,
      ...(customer ? { customer } : { customer_email: a.user.email }),
      line_items: [{ quantity: seats, price_data: {
        currency: "usd", unit_amount: annual && !isTest ? p.annual : p.monthly, recurring: { interval: annual && !isTest ? "year" : "month" },
        product_data: { name: `Dozzier ${p.name}`, description: p.perSeat ? "Per user" : undefined },
      } }],
      metadata: meta,
      subscription_data: { metadata: meta },
      allow_promotion_codes: true,
      billing_address_collection: "auto",
      success_url: `${site}/app/settings/billing?paid=1`,
      cancel_url: `${site}/app/upgrade`,
    });
    return json({ url: s.url });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Couldn’t start checkout" }, 502);
  }
});
