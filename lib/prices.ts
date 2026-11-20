/** Plan prices in US cents. Shared by Stripe checkout and the pricing UI. */
export type Currency = "USD";
export type PlanId = "personal" | "standard" | "datarooms";

/** Stripe charges in US dollars. */
export const BILLING_CURRENCY: Currency = "USD";

export const PRICE_TABLE: Record<Currency, Record<PlanId, { monthly: number; annual: number }>> = {
  // Annual = 12 months at 20% off.
  USD: { personal: { monthly: 500, annual: 4800 }, standard: { monthly: 2500, annual: 24000 }, datarooms: { monthly: 14000, annual: 134400 } },
};

/** Per-month display price, e.g. "$25" or "$11.20". */
export function displayPrice(plan: PlanId, annual: boolean, currency: Currency = BILLING_CURRENCY) {
  const p = PRICE_TABLE[currency][plan];
  const perMonth = (annual ? p.annual / 12 : p.monthly) / 100;
  return `$${perMonth % 1 ? perMonth.toFixed(2) : perMonth}`;
}
