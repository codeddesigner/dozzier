import { NextRequest, NextResponse } from "next/server";
import { authed, enabled, paystack } from "@/lib/paystack";

export const dynamic = "force-dynamic";

/** GET → Paystack's hosted page where the workspace owner updates the card or cancels. */
export async function GET(req: NextRequest) {
  if (!enabled()) return NextResponse.json({ error: "Billing isn’t connected yet", disabled: true }, { status: 503 });
  const a = await authed(req);
  if (!a) return NextResponse.json({ error: "Sign in again" }, { status: 401 });
  if (a.role !== "Owner" && a.role !== "Admin") return NextResponse.json({ error: "Only workspace admins can manage billing" }, { status: 403 });
  const { data } = await a.sb.from("profiles").select("billing_subscription").eq("id", a.ws).maybeSingle();
  if (!data?.billing_subscription) return NextResponse.json({ error: "No active subscription" }, { status: 404 });
  try {
    const r = await paystack<{ link: string }>(`/subscription/${data.billing_subscription}/manage/link`);
    return NextResponse.json({ url: r.link });
  } catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : "Couldn’t open billing" }, { status: 502 }); }
}
