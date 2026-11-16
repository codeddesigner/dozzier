import type { Metadata } from "next";
import { SiteNav, SiteCta, SiteFooter } from "@/components/marketing/Chrome";
import { PricingPage } from "@/components/marketing/PricingPage";

export const metadata: Metadata = { title: "Pricing | Dozzier", description: "Simple plans for secure document sharing and data rooms. 14-day free trial, no credit card required." };

export default function Pricing() {
  return (
    <main>
      <SiteNav active="/pricing" />
      <PricingPage />
      <SiteCta />
      <SiteFooter />
    </main>
  );
}
