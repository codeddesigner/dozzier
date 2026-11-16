import type { Metadata } from "next";
import { Link2, FolderUp, ShieldCheck } from "lucide-react";
import { SiteNav, SiteFooter } from "@/components/marketing/Chrome";
import { SalesForm } from "@/components/marketing/SalesForm";

export const metadata: Metadata = { title: "Talk to sales | Dozzier", description: "Book a tailored Dozzier demo, get help migrating from DocSend, and pricing for larger teams and data rooms." };

export default function TalkToSales() {
  return (
    <main>
      <SiteNav />
      <section className="mk-sales">
        <div className="mk-sales-l" data-stagger="80">
          <span className="overline">Talk to sales</span>
          <h1 className="mk-h1s">Let’s find the right plan for your team</h1>
          <p className="body-m muted">Get a tailored demo, help migrating from DocSend, and pricing for larger teams, data rooms and regulated industries.</p>
          <div className="col gap-20 mt-8">
            {([[Link2, "A 30-minute tailored demo", "See Dozzier with your own decks and data rooms."], [FolderUp, "Migration help", "We’ll move your documents and links over for you."], [ShieldCheck, "Security review", "SSO, DPA and security questionnaires handled."]] as const).map(([I, t, b]) => (
              <div key={t} className="row gap-12" style={{ alignItems: "flex-start" }}><span className="mk-ico s"><I size={20} /></span><div className="col"><span className="medium">{t}</span><span className="caption muted" style={{ fontSize: 14, lineHeight: "20px" }}>{b}</span></div></div>
            ))}
          </div>
        </div>
        <div data-reveal><SalesForm /></div>
      </section>
      <SiteFooter />
    </main>
  );
}
