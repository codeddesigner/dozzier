import { NextRequest, NextResponse } from "next/server";
import { PRICES, CURRENCY, enabled, ensurePlan, paystack, authed, billingUpdate } from "@/lib/paystack";

export const dynamic = "force-dynamic";

/** POST { plan, annual } → a Paystack checkout URL for this workspace's subscription. */
export async function POST(req: NextRequest) {
  if (!enabled()) return NextResponse.json({ error: "Billing isn’t connected yet", disabled: true }, { status: 503 });
  const a = await authed(req);
  if (!a) return NextResponse.json({ error: "Sign in again" }, { status: 401 });
  if (a.role !== "Owner" && a.role !== "Admin") return NextResponse.json({ error: "Only workspace admins can change the plan" }, { status: 403 });
  const { plan, annual } = (await req.json().catch(() => ({}))) as { plan?: keyof typeof PRICES; annual?: boolean };
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
  const amount = (annual ? p.annual : p.monthly) * seats;
  const name = `Dozzier ${p.name} · ${annual ? "Annual" : "Monthly"}${p.perSeat ? ` · ${seats} seat${seats > 1 ? "s" : ""}` : ""}`;
  try {
    const planCode = await ensurePlan(name, amount, annual ? "annually" : "monthly");
    const email = a.user.email!;
    const customer = await paystack<{ customer_code: string }>("/customer", { method: "POST", body: { email } });
    await billingUpdate({ ws: a.ws, customer: customer.customer_code });
    const origin = req.headers.get("origin") || "https://dozzier.co";
    const tx = await paystack<{ authorization_url: string; reference: string }>("/transaction/initialize", {
      method: "POST",
      body: { email, amount, currency: CURRENCY, plan: planCode, callback_url: `${origin}/app/settings/billing?paid=1`, metadata: { ws: a.ws, plan, annual: !!annual, seats, cancel_action: `${origin}/app/upgrade` } },
    });
    return NextResponse.json({ url: tx.authorization_url });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Couldn’t start checkout" }, { status: 502 });
  }
}
