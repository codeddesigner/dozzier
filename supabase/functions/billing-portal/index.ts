// POST → Stripe customer portal URL: update card, download invoices, cancel.
import { CORS, json, stripe, stripeKey, caller, isStripeCustomer, origin } from "./stripe.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (!stripeKey()) return json({ error: "Billing isn’t connected yet", disabled: true }, 503);
  const a = await caller(req);
  if (!a) return json({ error: "Sign in again" }, 401);
  if (a.role !== "Owner" && a.role !== "Admin") return json({ error: "Only workspace admins can manage billing" }, 403);
  const { data } = await a.sb.from("profiles").select("billing_customer").eq("id", a.ws).maybeSingle();
  if (!isStripeCustomer(data?.billing_customer)) return json({ error: "No active subscription" }, 404);
  try {
    const s = await stripe<{ url: string }>("/billing_portal/sessions", { customer: data!.billing_customer, return_url: `${origin(req)}/app/settings/billing` });
    return json({ url: s.url });
  } catch (e) {
    const m = e instanceof Error ? e.message : "Couldn’t open billing";
    return json({ error: /configuration/i.test(m) ? "Billing portal isn’t set up yet. Please contact support." : m }, 502);
  }
});
