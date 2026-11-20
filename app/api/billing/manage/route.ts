import { NextRequest, NextResponse } from "next/server";
import { authed, enabled, stripe, isStripeCustomer } from "@/lib/stripe";

export const dynamic = "force-dynamic";

/** GET → Stripe's customer portal: update the card, download invoices, change or cancel the plan. */
export async function GET(req: NextRequest) {
  if (!enabled()) return NextResponse.json({ error: "Billing isn’t connected yet", disabled: true }, { status: 503 });
  const a = await authed(req);
  if (!a) return NextResponse.json({ error: "Sign in again" }, { status: 401 });
  if (a.role !== "Owner" && a.role !== "Admin") return NextResponse.json({ error: "Only workspace admins can manage billing" }, { status: 403 });
  const { data } = await a.sb.from("profiles").select("billing_customer").eq("id", a.ws).maybeSingle();
  if (!isStripeCustomer(data?.billing_customer)) return NextResponse.json({ error: "No active subscription" }, { status: 404 });
  const origin = req.headers.get("origin") || "https://dozzier.co";
  try {
    const s = await stripe<{ url: string }>("/billing_portal/sessions", { customer: data!.billing_customer, return_url: `${origin}/app/settings/billing` });
    return NextResponse.json({ url: s.url });
  } catch (e) {
    const m = e instanceof Error ? e.message : "Couldn’t open billing";
    return NextResponse.json({ error: /configuration/i.test(m) ? "Billing portal isn’t set up yet. Please contact support." : m }, { status: 502 });
  }
}
