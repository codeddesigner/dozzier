import { NextRequest, NextResponse } from "next/server";
import { PRICES, type PlanKey, enabled, stripe, authed, isStripeCustomer } from "@/lib/stripe";

export const dynamic = "force-dynamic";

/** POST { plan, annual } → a Stripe Checkout URL for this workspace's subscription (USD). */
export async function POST(req: NextRequest) {
  if (!enabled()) return NextResponse.json({ error: "Billing isn’t connected yet", disabled: true }, { status: 503 });
  const a = await authed(req);
  if (!a) return NextResponse.json({ error: "Sign in again" }, { status: 401 });
  if (a.role !== "Owner" && a.role !== "Admin") return NextResponse.json({ error: "Only workspace admins can change the plan" }, { status: 403 });
  const { plan, annual } = (await req.json().catch(() => ({}))) as { plan?: PlanKey; annual?: boolean };
  const p = plan && PRICES[plan];
  if (!p) return NextResponse.json({ error: "Unknown plan" }, { status: 400 });

  // Standard is per user: everyone in the workspace plus pending invites.
  let seats = 1;
  if (p.perSeat) {
    const [m, i] = await Promise.all([
      a.sb.from("workspace_members").select("user_id", { count: "exact", head: true }),
      a.sb.from("invites").select("id", { count: "exact", head: true }).is("accepted_at", null),
    ]);
    seats = Math.max(1, 1 + (m.count || 0) + (i.count || 0));
  }
  const { data: prof } = await a.sb.from("profiles").select("billing_customer").eq("id", a.ws).maybeSingle();
  const customer = isStripeCustomer(prof?.billing_customer) ? prof!.billing_customer as string : null;
  const origin = req.headers.get("origin") || "https://dozzier.co";
  const meta = { ws: a.ws, plan: plan!, annual: annual ? "1" : "0", seats: String(seats) };
  try {
    const s = await stripe<{ url: string }>("/checkout/sessions", {
      mode: "subscription",
      client_reference_id: a.ws,
      ...(customer ? { customer } : { customer_email: a.user.email }),
      line_items: [{
        quantity: seats,
        price_data: {
          currency: "usd",
          unit_amount: annual ? p.annual : p.monthly,
          recurring: { interval: annual ? "year" : "month" },
          product_data: { name: `Dozzier ${p.name}`, description: p.perSeat ? "Per user" : undefined },
        },
      }],
      metadata: meta,
      subscription_data: { metadata: meta },
      allow_promotion_codes: true,
      billing_address_collection: "auto",
      success_url: `${origin}/app/settings/billing?paid=1`,
      cancel_url: `${origin}/app/upgrade`,
    });
    return NextResponse.json({ url: s.url });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Couldn’t start checkout" }, { status: 502 });
  }
}
