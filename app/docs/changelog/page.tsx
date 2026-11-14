import Link from "next/link";
import { CHANGELOG } from "@/lib/docs";
import { DocIcon } from "@/components/docs/DocIcon";
import { Subscribe } from "@/components/docs/Subscribe";

export const metadata = { title: "What’s new — Dozzier Docs" };

export default function Changelog() {
  return (
    <main className="cl-wrap">
      <h1 className="display-l h-in">What’s new</h1>
      <div className="row" style={{ margin: "24px 0 40px" }}><span className="muted grow">Product updates from the Dozzier team.</span><Subscribe /></div>
      {CHANGELOG.map((c) => (
        <section key={c.title} className="cl-entry" data-reveal>
          <div className="cl-date"><span className="muted" style={{ fontSize: 14 }}>{c.date}</span><span className={`badge ${c.tag === "New" ? "badge-brand" : "badge-success"}`}>{c.tag}</span></div>
          <div className="cl-body">
            <h2 className="h2">{c.title}</h2>
            <p className="muted">{c.body}</p>
            {c.icon && <div className="cl-media"><span className="cl-media-ico"><DocIcon name={c.icon} size={24} /></span></div>}
            <Link href={`/docs/${c.guide}`} className="link caption">Read the guide <span className="arrow">→</span></Link>
          </div>
        </section>
      ))}
    </main>
  );
}
