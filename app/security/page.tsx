import type { Metadata } from "next";
import Link from "next/link";
import { Lock, ScanEye, Stamp, TimerOff, KeyRound, Globe } from "lucide-react";
import { SiteNav, SiteCta, SiteFooter, PageHero, CardGrid, DEMO } from "@/components/marketing/Chrome";
import { SecurityBento } from "@/components/marketing/Mocks";

export const metadata: Metadata = { title: "Security | Dozzier", description: "Your documents stay yours — encrypted, permissioned, logged and revocable at any moment." };

export default function Security() {
  return (
    <main>
      <SiteNav active="/security" />
      <PageHero pill="Security & trust" title="Enterprise-grade by default" sub="Your documents stay yours — encrypted, permissioned, logged and revocable at any moment." ctas={false} />
      <div className="mk-sec-bento"><SecurityBento head={false} /></div>
      <CardGrid overline="How we protect you" title="Security at every layer" cards={[
        [Lock, "Encryption", "Files encrypted at rest and in transit; keys rotated regularly."],
        [ScanEye, "Screenshot protection", "Blur and block screen capture on sensitive links."],
        [Stamp, "Dynamic watermarks", "Viewer email, time and IP stamped on every page."],
        [TimerOff, "Expiry & revoke", "Kill access instantly — even after a file was shared as a viewer link."],
        [KeyRound, "SSO & SCIM", "SAML SSO with Okta, Google and Microsoft Entra; automatic provisioning."],
        [Globe, "Data residency", "Choose EU or US storage for your workspace."],
      ]} />
      <section className="mk-trust-wrap">
        <div className="mk-trust" data-reveal>
          <div className="col gap-4 grow"><span className="mk-card-t" style={{ fontSize: 20, lineHeight: "26px" }}>Need our security documentation?</span><span className="muted">Request our security overview, penetration test summary and DPA, or send us your questionnaire.</span></div>
          <div className="row gap-12 wrap"><Link href="/talk-to-sales" className="btn btn-secondary">Request documents</Link><Link href={DEMO} className="btn btn-brand">Talk to sales</Link></div>
        </div>
      </section>
      <SiteCta />
      <SiteFooter />
    </main>
  );
}
