import { NextRequest, NextResponse } from "next/server";
import { anonDb, billingUpdate, stripe, syncSubscription, statusFor, verifyWebhook, PRICES } from "@/lib/stripe";
import { deliver } from "@/lib/email/server";
import { receiptEmail } from "@/lib/email/messages";

export const dynamic = "force-dynamic";

type Meta = { ws?: string; plan?: string; annual?: string; seats?: string };
type Sub = { id: string; status: string; cancel_at_period_end?: boolean; customer: string; metadata?: Meta; items?: { data?: { quantity?: number }[] } };
type Session = { client_reference_id?: string | null; customer?: string | null; subscription?: string | null; metadata?: Meta; mode?: string };
type Invoice = { id: string; number?: string | null; customer: string; customer_email?: string | null; customer_name?: string | null; amount_paid: number; currency: string; subscription?: string | null; status_transitions?: { paid_at?: number | null }; lines?: { data?: { quantity?: number; price?: { recurring?: { interval?: string } }; metadata?: Meta }[] }; subscription_details?: { metadata?: Meta } };

const planOf = (m?: Meta) => (m?.plan && m.plan in PRICES ? m.plan : null);
const seatsOf = (s: Sub) => s.items?.data?.[0]?.quantity ?? (s.metadata?.seats ? Number(s.metadata.seats) : null);

/** Stripe → Dozzier. Verifies the signature, then keeps the workspace's plan in sync. */
export async function POST(req: NextRequest) {
  const raw = await req.text();
  if (!process.env.STRIPE_WEBHOOK_SECRET) return NextResponse.json({ error: "not configured" }, { status: 503 });
  if (!verifyWebhook(raw, req.headers.get("stripe-signature"))) return NextResponse.json({ error: "bad signature" }, { status: 401 });
  const ev = JSON.parse(raw) as { type: string; data: { object: unknown } };

  try {
    switch (ev.type) {
      case "checkout.session.completed": {
        const s = ev.data.object as Session;
        if (s.mode !== "subscription" || !s.subscription) break;
        const ws = s.client_reference_id || s.metadata?.ws;
        if (!ws) break;
        // A plan change: remember the old subscription so it can be stopped once the new one is live.
        const { data: prev } = await anonDb().rpc("billing_previous_subscription", { p_secret: process.env.DOZZIER_HOOK_SECRET, p_customer: s.customer });
        await billingUpdate({ ws, customer: s.customer, plan: planOf(s.metadata), status: "active", subscription: s.subscription, seats: s.metadata?.seats ? Number(s.metadata.seats) : null });
        const old = prev as string | null;
        if (old && old !== s.subscription && old.startsWith("sub_")) await stripe(`/subscriptions/${old}`, { prorate: "true" }, "DELETE").catch(() => {});
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const s = ev.data.object as Sub;
        await syncSubscription(s.id, ev.type.endsWith("deleted") ? "canceled" : statusFor(s), planOf(s.metadata), seatsOf(s));
        break;
      }
      case "invoice.paid": {
        const inv = ev.data.object as Invoice;
        if (inv.subscription) await syncSubscription(inv.subscription, "active");
        await sendReceipt(inv).catch((e) => console.error("receipt failed", e));
        break;
      }
      case "invoice.payment_failed": {
        const inv = ev.data.object as Invoice;
        if (inv.subscription) await syncSubscription(inv.subscription, "past_due");
        break;
      }
    }
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "failed" }, { status: 500 });
  }
  return NextResponse.json({ received: true });
}

/** Emails the payer a Dozzier-designed receipt for every paid invoice. */
async function sendReceipt(inv: Invoice) {
  if (!inv.customer_email || !inv.amount_paid) return;
  const line = inv.lines?.data?.[0];
  const meta = inv.subscription_details?.metadata || line?.metadata || {};
  const plan = PRICES[(planOf(meta) || "standard") as keyof typeof PRICES].name;
  const interval = line?.price?.recurring?.interval === "year" ? "annually" : "monthly";
  const cur = inv.currency.toUpperCase();
  const amount = new Intl.NumberFormat("en-US", { style: "currency", currency: cur, minimumFractionDigits: 2 }).format(inv.amount_paid / 100);
  const date = new Date((inv.status_transitions?.paid_at || Date.now() / 1000) * 1000).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  const m = receiptEmail({ name: inv.customer_name, plan, interval, seats: line?.quantity ?? null, amount, reference: inv.number || inv.id, date, currency: cur });
  await deliver({ to: [inv.customer_email], subject: m.subject, html: m.html, text: m.text, tag: "receipt" });
}
