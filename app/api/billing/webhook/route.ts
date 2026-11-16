import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { anonDb, billingUpdate, paystack } from "@/lib/paystack";
import { deliver } from "@/lib/email/server";
import { receiptEmail } from "@/lib/email/messages";

export const dynamic = "force-dynamic";
type Ev = { event: string; data: { customer?: { customer_code?: string; email?: string; first_name?: string | null }; amount?: number; currency?: string; reference?: string; paid_at?: string; plan_object?: { name?: string; interval?: string }; metadata?: { ws?: string; plan?: string; seats?: number } | string; subscription_code?: string; plan?: { plan_code?: string; name?: string; interval?: string } | string; status?: string } };

/** Paystack → Dozzier. Verifies the signature, then updates the workspace's plan. */
export async function POST(req: NextRequest) {
  const raw = await req.text();
  const secret = (process.env.PAYSTACK_SECRET_KEY || "").trim().replace(/^["']|["']$/g, "").trim();
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
        await sendReceipt(d, meta).catch((e) => console.error("receipt failed", e));
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

const PLAN_NAME: Record<string, string> = { personal: "Personal", standard: "Standard", datarooms: "Data Rooms" };
/** Emails the payer a Dozzier receipt (Paystack sends its own too). */
async function sendReceipt(d: Ev["data"], meta: { plan?: string; seats?: number; annual?: boolean }) {
  const to = d.customer?.email; if (!to || !d.amount) return;
  const plan = typeof d.plan === "object" && d.plan ? d.plan : d.plan_object || {};
  const name = (plan.name || "").replace(/^Dozzier\s+/, "").split(" · ")[0] || PLAN_NAME[meta.plan || ""] || "Dozzier";
  const interval = plan.interval || (meta.annual ? "annually" : "monthly");
  const cur = (d.currency || "USD").toUpperCase();
  const amount = new Intl.NumberFormat("en-US", { style: "currency", currency: cur, minimumFractionDigits: 2 }).format(d.amount / 100);
  const date = new Date(d.paid_at || Date.now()).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  const m = receiptEmail({ name: d.customer?.first_name, plan: name, interval, seats: meta.seats ?? null, amount, reference: d.reference || "—", date, currency: cur });
  await deliver({ to: [to], subject: m.subject, html: m.html, text: m.text, tag: "receipt" });
}
