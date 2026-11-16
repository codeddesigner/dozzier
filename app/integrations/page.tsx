import type { Metadata } from "next";
import Link from "next/link";
import { SiteNav, SiteCta, SiteFooter, PageHero } from "@/components/marketing/Chrome";
import { IntegrationsCatalog } from "@/components/marketing/IntegrationsCatalog";

export const metadata: Metadata = { title: "Integrations | Dozzier", description: "Get alerts where you work, automate with Zapier, and bring Dozzier into Claude, ChatGPT and Cursor with MCP." };

export default function Integrations() {
  return (
    <main>
      <SiteNav active="/integrations" />
      <PageHero pill="Integrations" title="Fits the stack you already use" sub="Get alerts where you work, automate with 6,000+ apps through Zapier, and bring your deal data into your AI tools." ctas={false} />
      <IntegrationsCatalog />
      <section className="mk-dev">
        <div className="mk-dev-in">
          <div className="col gap-12 mk-dev-text" data-stagger="80">
            <span className="overline">Developers</span>
            <h2 className="mk-h2">Build on Dozzier with MCP</h2>
            <p className="body-m muted">Connect Claude, ChatGPT, Cursor or any MCP client to read documents, links and visitor analytics — and create tracked links. One key per workspace, read-only by default.</p>
            <div><Link href="/docs/mcp" className="btn btn-secondary">Read the MCP docs</Link></div>
          </div>
          <pre className="mk-code" data-reveal>{`$ claude mcp add --transport http dozzier \\
    https://dozzier.co/api/mcp \\
    --header "Authorization: Bearer dz_…"

> Which investors read the financials this week?

`}<span className="c">● dozzier · get_document_analytics</span>{`
`}<span className="g">  Acme, Northwind and Kestrel each spent 4+ min
  on pages 12–14 of the Series A deck.</span></pre>
        </div>
      </section>
      <SiteCta />
      <SiteFooter />
    </main>
  );
}
