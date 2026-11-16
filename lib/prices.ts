/** Plan prices per currency, in the smallest unit (cents / kobo). Shared by checkout and the pricing UI. */
export type Currency = "USD" | "NGN";
export type PlanId = "personal" | "standard" | "datarooms";

/** What Paystack charges in. NGN until USD is enabled on the Paystack account; set NEXT_PUBLIC_BILLING_CURRENCY=USD (Vercel) to switch. */
export const BILLING_CURRENCY: Currency = (process.env.NEXT_PUBLIC_BILLING_CURRENCY || process.env.PAYSTACK_CURRENCY || "NGN") === "USD" ? "USD" : "NGN";

export const PRICE_TABLE: Record<Currency, Record<PlanId, { monthly: number; annual: number }>> = {
  // Annual = 12 months at 20% off.
  USD: { personal: { monthly: 500, annual: 4800 }, standard: { monthly: 2500, annual: 24000 }, datarooms: { monthly: 14000, annual: 134400 } },
  // ≈ ₦1,600 / $1, rounded.
  NGN: { personal: { monthly: 800000, annual: 7680000 }, standard: { monthly: 4000000, annual: 38400000 }, datarooms: { monthly: 22500000, annual: 216000000 } },
};

/** Per-month display price, e.g. "$25" or "₦40,000". */
export function displayPrice(plan: PlanId, annual: boolean, currency: Currency = BILLING_CURRENCY) {
  const p = PRICE_TABLE[currency][plan];
  const perMonth = (annual ? p.annual / 12 : p.monthly) / 100;
  return currency === "USD" ? `$${perMonth % 1 ? perMonth.toFixed(2) : perMonth}` : `₦${Math.round(perMonth).toLocaleString("en-NG")}`;
}
