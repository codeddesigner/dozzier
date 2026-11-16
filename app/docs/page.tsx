import Link from "next/link";
import { ChevronRight, FileText, Play } from "lucide-react";
import { ARTICLES, CATEGORIES, POPULAR, article, inCat } from "@/lib/docs";
import { DocIcon } from "@/components/docs/DocIcon";
import { HeroSearch } from "@/components/docs/HeroSearch";
import { WordReveal } from "@/components/Motion";

export default function DocsHome() {
  return (
    <main>
      <section className="docs-hero">
        <h1 className="docs-h1"><WordReveal text="How can we help?" /></h1>
        <p className="body-l muted h-in" style={{ animationDelay: ".25s" }}>Guides, answers and API docs for sharing securely with Dozzier.</p>
        <HeroSearch />
        <div className="row gap-8 wrap h-in" style={{ justifyContent: "center", animationDelay: ".45s" }}>
          <span className="muted" style={{ fontSize: 14 }}>Popular:</span>
          {[["Create a secure link", "create-a-secure-link"], ["Data room permissions", "folder-permissions"], ["Custom domain", "custom-domain"], ["Visitor analytics", "visitor-activity"]].map(([t, s]) => (
            <Link key={s} href={`/docs/${s}`} className="pill-opt" style={{ display: "inline-flex", alignItems: "center" }}>{t}</Link>
          ))}
        </div>
      </section>

      <section className="docs-wrap">
        <div className="docs-cats" data-stagger="60">
          {CATEGORIES.map((c) => {
            const list = inCat(c.id);
            return (
              <Link key={c.id} href={`/docs/${list[0]?.slug || ""}`} className="docs-cat spotlight">
                <span className="docs-cat-ico"><DocIcon name={c.icon} /></span>
                <span className="h3">{c.title}</span>
                <span className="muted" style={{ fontSize: 14 }}>{c.blurb}</span>
                <span className="caption brand">{list.length} article{list.length === 1 ? "" : "s"}</span>
              </Link>
            );
          })}
        </div>

        <div className="docs-lower">
          <div className="docs-popular" data-reveal>
            <div className="h3" style={{ padding: "20px 18px 16px" }}>Popular articles</div>
            {POPULAR.map((s) => { const a = article(s)!; return (
              <Link key={s} href={`/docs/${s}`} className="docs-pop-row"><FileText size={16} className="faint" /><span className="grow">{a.title}</span><ChevronRight size={16} className="faint" /></Link>
            ); })}
          </div>
          <div className="col gap-16" style={{ width: 324 }}>
            <Link href="/docs/send-your-first-link" className="docs-video" data-reveal="scale">
              <span className="docs-video-thumb"><span className="docs-play"><Play size={18} /></span></span>
              <span className="h3" style={{ color: "#fff" }}>Dozzier in 4 minutes</span>
              <span style={{ color: "#9ca3af", fontSize: 14 }}>Upload, share, track — the whole flow.</span>
            </Link>
            <div className="docs-stuck" data-reveal>
              <span className="h3">Still stuck?</span>
              <span className="muted" style={{ fontSize: 14 }}>Our team replies in under 2 hours on weekdays.</span>
              <Link href="/docs/contact" className="btn btn-primary" style={{ alignSelf: "flex-start" }}>Contact support</Link>
            </div>
          </div>
        </div>
        <p className="caption faint center" style={{ marginTop: 48 }}>{ARTICLES.length} guides · <Link href="/docs/api" className="link">Zapier &amp; MCP</Link> · <Link href="/docs/changelog" className="link">Changelog</Link></p>
      </section>
    </main>
  );
}
