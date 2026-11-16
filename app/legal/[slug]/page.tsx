import Link from "next/link";
import { notFound } from "next/navigation";
import { Logo } from "@/components/Logo";

const PAGES: Record<string, { title: string; intro: string; sections: [string, string][] }> = {
  privacy: { title: "Privacy", intro: "How Dozzier handles information about you and the people who view your documents.", sections: [
    ["What we collect", "Account details you give us (name, email, workspace), the files you upload, and visit data on your links: the visitor’s email if you require one, approximate location from their IP, browser, and time spent on each page."],
    ["How we use it", "To run the product — storing and showing your documents, recording visits so you can see analytics, and sending the alerts you turn on. We don’t sell personal data or use your documents to train models."],
    ["Who can see it", "Only members of your workspace. Visitors only see the content you share with them."],
    ["Your choices", "You can export or delete your data at any time from Settings, or by emailing privacy@dozzier.io."],
  ] },
  terms: { title: "Terms", intro: "The basics of using Dozzier.", sections: [
    ["Your content", "You own what you upload. You give us permission to store, process and display it only to provide the service to you and the people you share with."],
    ["Acceptable use", "Don’t use Dozzier to share content you don’t have the right to share, or to send malware or spam."],
    ["Plans and billing", "Paid plans renew automatically until cancelled. Every plan starts with a 14-day free trial."],
    ["Contact", "Questions about these terms: legal@dozzier.io."],
  ] },
  security: { title: "Security", intro: "How we keep documents safe.", sections: [
    ["Encryption", "Files are encrypted at rest and all traffic uses TLS."],
    ["Access control", "Row-level security ensures workspaces can only read their own data. Shared links are checked on every request, and you can switch any link off instantly."],
    ["Account protection", "Two-factor authentication with an authenticator app is available to every user."],
    ["Report an issue", "Found a vulnerability? Email security@dozzier.io."],
  ] },
  dpa: { title: "Data Processing Agreement", intro: "For customers who need a DPA under GDPR or similar laws.", sections: [
    ["Request a DPA", "Email legal@dozzier.io with your company name and we’ll send our standard DPA for signature."],
  ] },
};

export function generateStaticParams() { return Object.keys(PAGES).map((slug) => ({ slug })); }

export default async function Legal({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = PAGES[slug];
  if (!p) return notFound();
  return (
    <div style={{ minHeight: "100vh" }}>
      <header className="docs-head legal-head" style={{ height: 88 }}><Link href="/"><Logo height={24} /></Link><span className="spacer" />
        <nav className="legal-nav">{Object.entries(PAGES).map(([k, v]) => <Link key={k} href={`/legal/${k}`} className={k === slug ? "medium" : "muted"} style={{ fontSize: 14 }}>{v.title === "Data Processing Agreement" ? "DPA" : v.title}</Link>)}</nav>
      </header>
      <main className="cl-wrap">
        <h1 className="display-l h-in">{p.title}</h1>
        <p className="body-l muted" style={{ margin: "12px 0 32px" }}>{p.intro}</p>
        {p.sections.map(([h, b]) => <section key={h} data-reveal style={{ marginBottom: 24 }}><h2 className="doc-h2" style={{ marginTop: 0 }}>{h}</h2><p className="doc-p">{b}</p></section>)}
        <p className="caption faint">Last updated November 2026.</p>
      </main>
    </div>
  );
}
