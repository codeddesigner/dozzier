import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ChevronRight, Info } from "lucide-react";
import { ARTICLES, CATEGORIES, article, category, inCat, type Block } from "@/lib/docs";
import { LinkSettingsFigure, SpacePermissionsFigure, VisitorTimelineFigure } from "@/components/docs/Figures";
import { OnThisPage } from "@/components/docs/OnThisPage";
import { Helpful } from "@/components/docs/Helpful";

export function generateStaticParams() { return ARTICLES.map((a) => ({ slug: a.slug })); }

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const a = article(slug);
  return { title: a ? `${a.title} — Dozzier Docs` : "Dozzier Docs", description: a?.summary };
}

const anchor = (s: string) => s.toLowerCase().replace(/^\d+\.\s*/, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

function Render({ b }: { b: Block }) {
  if ("h" in b) return <h2 id={anchor(b.h)} className="doc-h2">{b.h}</h2>;
  if ("p" in b) return <p className="doc-p">{b.p}</p>;
  if ("list" in b) return <ul className="doc-list">{b.list.map((x) => <li key={x}>{x}</li>)}</ul>;
  if ("steps" in b) return <ol className="doc-steps">{b.steps.map((x) => <li key={x}>{x}</li>)}</ol>;
  if ("note" in b) return <div className="notice info doc-note"><Info size={16} />{b.note}</div>;
  if (b.figure === "link-settings") return <LinkSettingsFigure />;
  if (b.figure === "space-permissions") return <SpacePermissionsFigure />;
  return <VisitorTimelineFigure />;
}

export default async function DocArticle({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const a = article(slug);
  if (!a) return notFound();
  const cat = category(a.cat)!;
  const toc = [{ id: "overview", label: "Overview" }, ...a.body.filter((b): b is { h: string } => "h" in b).map((b) => ({ id: anchor(b.h), label: b.h })), ...(a.faq ? [{ id: "faq", label: "FAQ" }] : [])];
  const idx = ARTICLES.findIndex((x) => x.slug === a.slug);
  const next = ARTICLES[idx + 1];

  return (
    <div className="doc-shell">
      <aside className="doc-side">
        {CATEGORIES.map((c) => (
          <div key={c.id} className="doc-side-group">
            <div className="doc-side-label">{c.title}</div>
            {inCat(c.id).map((x) => <Link key={x.slug} href={`/docs/${x.slug}`} className={`doc-side-link ${x.slug === a.slug ? "on" : ""}`}>{x.title.replace(" before someone views your document", "").replace(" in a data room", "")}</Link>)}
          </div>
        ))}
      </aside>
      <article className="doc-main" key={a.slug}>
        <nav className="doc-crumbs"><Link href="/docs">Guides</Link><ChevronRight size={12} /><Link href={`/docs/${inCat(cat.id)[0].slug}`}>{cat.title}</Link><ChevronRight size={12} /><span>{a.title.split(" before")[0]}</span></nav>
        <h1 className="doc-title" id="overview">{a.title}</h1>
        <div className="row gap-8 doc-meta">
          <span className="avatar" style={{ width: 22, height: 22, fontSize: 9, background: "#ff7a3d" }}>Dz</span>
          <span>Updated {a.updated} · {a.read} min read</span><span className="badge badge-muted">{a.plan}</span>
        </div>
        {a.body.map((b, i) => <Render key={i} b={b} />)}
        {a.faq && (
          <>
            <h2 id="faq" className="doc-h2">FAQ</h2>
            {a.faq.map(([q, ans]) => <div key={q} className="doc-faq"><div className="medium">{q}</div><p className="muted">{ans}</p></div>)}
          </>
        )}
        <Helpful slug={a.slug} />
        {next && <Link href={`/docs/${next.slug}`} className="doc-next"><span className="caption faint">Next</span><span className="medium row gap-6">{next.title}<ChevronRight size={14} /></span></Link>}
      </article>
      <OnThisPage toc={toc} related={(a.related || []).map((s) => article(s)).filter(Boolean).map((r) => ({ slug: r!.slug, title: r!.title.split(" before")[0].split(" in a")[0] }))} />
    </div>
  );
}
