import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { anonDb, billingUpdate, paystack } from "@/lib/paystack";

export const dynamic = "force-dynamic";
type Ev = { event: string; data: { customer?: { customer_code?: string }; metadata?: { ws?: string; plan?: string; seats?: number } | string; subscription_code?: string; plan?: { plan_code?: string }; status?: string } };

/** Paystack → Dozzier. Verifies the signature, then updates the workspace's plan. */
export async function POST(req: NextRequest) {
  const raw = await req.text();
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) return NextResponse.json({ error: "not configured" }, { status: 503 });
  const sig = req.headers.get("x-paystack-signature") || "";
  const want = crypto.createHmac("sha512", secret).update(raw).digest("hex");
  if (sig.length !== want.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(want))) return NextResponse.json({ error: "bad signature" }, { status: 401 });

  const ev = JSON.parse(raw) as Ev;
  const d = ev.data || {};
  const customer = d.customer?.customer_code || null;
  const meta = typeof d.metadata === "object" && d.metadata ? d.metadata : {};
  try {
    switch (ev.event) {
      case "charge.success":
        // First payment carries our metadata; renewals just confirm the subscription is healthy.
        if (meta.ws && meta.plan) await billingUpdate({ ws: meta.ws, customer, plan: meta.plan, status: "active", seats: meta.seats ?? null });
        else if (customer) await billingUpdate({ customer, status: "active" });
        break;
      case "subscription.create": {
        // A plan change: switch to the new subscription and stop the old one.
        const { data: prev } = await anonDb().rpc("billing_previous_subscription", { p_secret: process.env.DOZZIER_HOOK_SECRET, p_customer: customer });
        if (customer) await billingUpdate({ customer, subscription: d.subscription_code || null, status: "active" });
        const old = prev as string | null;
        if (old && old !== d.subscription_code) {
          try { const s = await paystack<{ email_token: string }>(`/subscription/${old}`); await paystack("/subscription/disable", { method: "POST", body: { code: old, token: s.email_token } }); } catch {}
        }
        break;
      }
      case "subscription.not_renew":
        if (d.subscription_code) await anonDb().rpc("billing_subscription_ended", { p_secret: process.env.DOZZIER_HOOK_SECRET, p_subscription: d.subscription_code, p_status: "canceling" });
        break;
      case "subscription.disable":
        if (d.subscription_code) await anonDb().rpc("billing_subscription_ended", { p_secret: process.env.DOZZIER_HOOK_SECRET, p_subscription: d.subscription_code, p_status: "canceled" });
        break;
      case "invoice.payment_failed":
        if (customer) await billingUpdate({ customer, status: "past_due" });
        break;
    }
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
