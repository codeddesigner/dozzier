"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

/** Right rail: table of contents with scrollspy, plus related articles. */
export function OnThisPage({ toc, related }: { toc: { id: string; label: string }[]; related: { slug: string; title: string }[] }) {
  const [active, setActive] = useState(toc[0]?.id);
  useEffect(() => {
    const els = toc.map((t) => document.getElementById(t.id)).filter(Boolean) as HTMLElement[];
    const io = new IntersectionObserver((entries) => {
      const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (vis[0]) setActive(vis[0].target.id);
    }, { rootMargin: "-90px 0px -65% 0px" });
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, [toc]);
  return (
    <aside className="doc-toc">
      <div className="doc-side-label">On this page</div>
      {toc.map((t) => <a key={t.id} href={`#${t.id}`} className={`doc-toc-link ${active === t.id ? "on" : ""}`}>{t.label}</a>)}
      {related.length > 0 && (
        <>
          <div className="doc-side-label" style={{ marginTop: 28 }}>Related</div>
          {related.map((r) => <Link key={r.slug} href={`/docs/${r.slug}`} className="doc-related">{r.title}</Link>)}
        </>
      )}
    </aside>
  );
}
