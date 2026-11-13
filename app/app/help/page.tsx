import Link from "next/link";
import { Faq } from "@/components/Faq";

export default function Help() {
  return (
    <div className="content" style={{ maxWidth: 860 }}>
      <div className="page-head"><h1 className="page-title">Help</h1></div>
      <div className="grid-3 mt-16" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
        {[["1. Upload", "Go to Content → Add content and drop in a PDF, deck or image.", "/app/content"], ["2. Create a link", "Open the document and click Create link. Choose email gate, passcode, expiry and more.", "/app/content"], ["3. Watch it land", "Visits, time per page and intent scores show up on your Dashboard in real time.", "/app"]].map(([t, b, h]) => (
          <Link key={t} href={h} className="card col gap-8" style={{ padding: 20 }}><span className="h3">{t}</span><span className="muted">{b}</span></Link>
        ))}
      </div>
      <h2 className="h1 mt-32" style={{ marginBottom: 8 }}>FAQ</h2>
      <Faq />
      <p className="muted mt-24">Still stuck? Email <a className="brand" href="mailto:support@dozzier.io">support@dozzier.io</a>.</p>
    </div>
  );
}
