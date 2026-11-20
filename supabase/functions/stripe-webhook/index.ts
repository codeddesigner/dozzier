// Stripe → Dozzier. Verifies the signature, keeps the workspace's plan in sync and triggers the receipt email.
import { json, admin, stripe, webhookSecret, PRICES } from "./stripe.ts";

type Meta = { ws?: string; plan?: string; annual?: string; seats?: string; prev_status?: string };
type Sub = { id: string; status: string; cancel_at_period_end?: boolean; customer: string; metadata?: Meta; items?: { data?: { quantity?: number }[] } };
type Session = { client_reference_id?: string | null; customer?: string | null; subscription?: string | null; metadata?: Meta; mode?: string };
type Invoice = { id: string; number?: string | null; customer_email?: string | null; customer_name?: string | null; amount_paid: number; currency: string; subscription?: string | { id: string } | null;
  parent?: { subscription_details?: { subscription?: string | { id: string } | null } | null } | null;
  status_transitions?: { paid_at?: number | null }; lines?: { data?: { quantity?: number; parent?: { subscription_item_details?: { subscription?: string | null } | null } | null }[] } };
type FullSub = { id: string; metadata?: Meta; items?: { data?: { quantity?: number; price?: { recurring?: { interval?: string } } }[] } };

/** The invoice's subscription id, wherever this webhook's Stripe API version puts it. */
function invoiceSub(inv: Invoice): string | null {
  const pick = (v?: string | { id: string } | null) => (typeof v === "string" ? v : v?.id) || null;
  return pick(inv.subscription) || pick(inv.parent?.subscription_details?.subscription) || inv.lines?.data?.[0]?.parent?.subscription_item_details?.subscription || null;
}

const enc = new TextEncoder();
async function verify(raw: string, header: string | null) {
  const secret = webhookSecret();
  if (!secret || !header) return false;
  const t = Number(header.split(",").find((p) => p.startsWith("t="))?.slice(2));
  if (!t || Math.abs(Date.now() / 1000 - t) > 300) return false;
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(`${t}.${raw}`)));
  const want = Array.from(sig, (b) => b.toString(16).padStart(2, "0")).join("");
  return header.split(",").filter((p) => p.startsWith("v1=")).some((p) => {
    const got = p.slice(3);
    if (got.length !== want.length) return false;
    let diff = 0; for (let i = 0; i < got.length; i++) diff |= got.charCodeAt(i) ^ want.charCodeAt(i);
    return diff === 0;
  });
}

const planOf = (m?: Meta) => (m?.plan && m.plan in PRICES ? m.plan : null);
function statusFor(s: Sub) {
  if (s.status === "canceled" || s.status === "incomplete_expired") return "canceled";
  if (s.status === "past_due" || s.status === "unpaid") return "past_due";
  if (s.status === "incomplete") return "incomplete";
  return s.cancel_at_period_end ? "canceling" : "active";
}

/** Only touches the workspace whose current subscription this is, so a replaced subscription can't overwrite the new one. */
async function syncSub(id: string, status: string, plan?: string | null, seats?: number | null) {
  const patch: Record<string, unknown> = { subscription_status: status };
  if (status === "canceled") patch.plan = "canceled"; else if (plan) patch.plan = plan;
  if (seats) patch.billing_seats = seats;
  const { error } = await admin().from("profiles").update(patch).eq("billing_subscription", id);
  if (error) throw error;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ ok: true });
  const raw = await req.text();
  if (!webhookSecret()) return json({ error: "not configured" }, 503);
  if (!(await verify(raw, req.headers.get("stripe-signature")))) return json({ error: "bad signature" }, 401);
  const ev = JSON.parse(raw) as { type: string; data: { object: unknown } };
  const db = admin();
  try {
    switch (ev.type) {
      case "checkout.session.completed": {
        const s = ev.data.object as Session;
        const ws = s.client_reference_id || s.metadata?.ws;
        if (s.mode !== "subscription" || !s.subscription || !ws) break;
        if (s.metadata?.plan === "test") {
          // Admin test plan: record the subscription so the receipt and Manage subscription work; leave the plan alone.
          const { error } = await db.from("profiles").update({ billing_customer: s.customer, billing_subscription: s.subscription, subscription_status: "active" }).eq("id", ws);
          if (error) throw error;
          break;
        }
        const { data: prev } = await db.from("profiles").select("billing_subscription").eq("id", ws).maybeSingle();
        const { error } = await db.from("profiles").update({
          plan: planOf(s.metadata) || undefined, billing_customer: s.customer, subscription_status: "active",
          billing_subscription: s.subscription, billing_seats: s.metadata?.seats ? Number(s.metadata.seats) : undefined,
          comp_ends_at: null,
        }).eq("id", ws);
        if (error) throw error;
        // A plan change: stop the old subscription now that the new one is live.
        const old = prev?.billing_subscription as string | null;
        if (old && old !== s.subscription && old.startsWith("sub_")) await stripe(`/subscriptions/${old}`, { prorate: "true" }, "DELETE").catch(() => {});
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const s = ev.data.object as Sub;
        if (s.metadata?.plan === "test") {
          // Ending the admin test plan restores the workspace's previous billing status.
          const patch = ev.type.endsWith("deleted") ? { billing_subscription: null, subscription_status: s.metadata.prev_status || null } : { subscription_status: statusFor(s) };
          const { error } = await db.from("profiles").update(patch).eq("billing_subscription", s.id);
          if (error) throw error;
          break;
        }
        await syncSub(s.id, ev.type.endsWith("deleted") ? "canceled" : statusFor(s), planOf(s.metadata), s.items?.data?.[0]?.quantity ?? null);
        break;
      }
      case "invoice.paid": {
        const inv = ev.data.object as Invoice;
        const subId = invoiceSub(inv);
        if (subId) await syncSub(subId, "active");
        if (inv.customer_email && inv.amount_paid) {
          // Read plan, interval and seats from the subscription itself (stable regardless of webhook API version).
          const sub = subId ? await stripe<FullSub>(`/subscriptions/${subId}`).catch(() => null) : null;
          const item = sub?.items?.data?.[0];
          const meta = sub?.metadata || {};
          const cur = inv.currency.toUpperCase();
          // The app sends the Dozzier-designed receipt (same path as the welcome and digest emails).
          await db.rpc("lifecycle_post", { p_payload: {
            event: "receipt", to: inv.customer_email, name: inv.customer_name || null,
            plan: meta.plan === "test" ? "Test (admin only)" : PRICES[planOf(meta) || "standard"].name,
            interval: (item?.price?.recurring?.interval || (meta.annual === "1" ? "year" : "month")) === "year" ? "annually" : "monthly",
            seats: item?.quantity ?? inv.lines?.data?.[0]?.quantity ?? null,
            amount: new Intl.NumberFormat("en-US", { style: "currency", currency: cur, minimumFractionDigits: 2 }).format(inv.amount_paid / 100),
            reference: inv.number || inv.id, currency: cur,
            date: new Date((inv.status_transitions?.paid_at || Date.now() / 1000) * 1000).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
          } });
        }
        break;
      }
      case "invoice.payment_failed": {
        const inv = ev.data.object as Invoice;
        const subId = invoiceSub(inv);
        if (subId) await syncSub(subId, "past_due");
        break;
      }
    }
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "failed" }, 500);
  }
  return json({ received: true });
});
