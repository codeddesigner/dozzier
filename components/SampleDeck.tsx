import { LogoMark } from "./Logo";

type Slide = { kicker: string; title: string; body?: string; stats?: [string, string][]; bullets?: string[]; cover?: boolean };

export const SAMPLE_SLIDES: Slide[] = [
  { kicker: "", title: "Dozzier", body: "Share documents. Know what happens next.", cover: true },
  { kicker: "01 — PROBLEM", title: "You send the deck. Then you wait.", body: "Attachments disappear into inboxes. You can't tell who opened them, what they read, or when to follow up." },
  { kicker: "02 — SOLUTION", title: "Every document becomes a smart, secure link.", bullets: ["Page-by-page analytics", "Live “viewing now” alerts", "Email gates, passcodes, NDAs and watermarks", "AI-drafted follow-ups"] },
  { kicker: "03 — TRACTION", title: "Teams close 31% faster when they know who’s reading.", stats: [["2,400+", "companies sharing with Dozzier"], ["1.8M", "tracked visits last quarter"], ["82%", "average deck completion"]] },
  { kicker: "04 — HOW IT WORKS", title: "Upload. Share. Act on real intent.", bullets: ["Drop in PDFs, decks or whole folders", "Share a link with the right controls", "Get an intent score per account"] },
  { kicker: "05 — ANALYTICS", title: "See where attention really goes.", body: "Time on every page, every visitor, every version — so you know which slide sparked the question." },
  { kicker: "06 — DATA ROOMS", title: "Data rooms that run diligence.", body: "Group permissions, request tracking, Q&A and a full audit log in one Space." },
  { kicker: "07 — PRICING", title: "Simple pricing that scales with you.", stats: [["$5", "Personal / user / month"], ["$25", "Standard / user / month"], ["$140", "Data Rooms / month"]] },
  { kicker: "08 — SECURITY", title: "Enterprise-grade by default.", bullets: ["AES-256 at rest, TLS 1.3 in transit", "SSO, SAML & SCIM", "Region-locked storage", "Exportable audit trail"] },
  { kicker: "09 — MARKET", title: "Every deal runs on documents.", stats: [["$9B", "sales enablement spend"], ["40M", "knowledge workers who share decks"], ["3×", "faster follow-up with alerts"]] },
  { kicker: "10 — TEAM", title: "Built by people who’ve sent a lot of decks.", body: "Founders, sellers and dealmakers who were tired of guessing." },
  { kicker: "11 — NEXT", title: "Stop guessing. Start knowing.", body: "Send your first tracked link in under two minutes." },
];

export function SampleSlide({ index }: { index: number }) {
  const s = SAMPLE_SLIDES[index] || SAMPLE_SLIDES[0];
  if (s.cover) {
    return (
      <div style={{ width: "100%", height: "100%", background: "#4D94F7", color: "#fff", display: "flex", flexDirection: "column", justifyContent: "center", padding: "7%", gap: 16 }}>
        <LogoMark size={56} color="#fff" />
        <div style={{ fontSize: "clamp(28px,5vw,56px)", fontWeight: 600, letterSpacing: "-0.025em", lineHeight: 1.05 }}>{s.title}</div>
        <div style={{ fontSize: "clamp(14px,2vw,22px)", opacity: 0.9, lineHeight: 1.4 }}>{s.body}</div>
      </div>
    );
  }
  return (
    <div style={{ width: "100%", height: "100%", padding: "6% 7%", display: "flex", flexDirection: "column", gap: "4%" }}>
      <div className="overline">{s.kicker}</div>
      <div style={{ fontSize: "clamp(18px,2.6vw,32px)", fontWeight: 600, letterSpacing: "-0.015em", lineHeight: 1.2 }}>{s.title}</div>
      {s.body && <div style={{ fontSize: "clamp(13px,1.5vw,18px)", color: "#4b5563", maxWidth: "70%", lineHeight: 1.5 }}>{s.body}</div>}
      {s.stats && (
        <div style={{ display: "flex", gap: "6%", marginTop: "2%" }}>
          {s.stats.map(([v, l]) => (
            <div key={l}>
              <div style={{ fontSize: "clamp(24px,3.6vw,46px)", fontWeight: 600, color: "#4D94F7", letterSpacing: "-0.02em", lineHeight: 1.1, marginBottom: 6 }}>{v}</div>
              <div style={{ fontSize: "clamp(11px,1.2vw,15px)", color: "#4b5563", lineHeight: 1.4 }}>{l}</div>
            </div>
          ))}
        </div>
      )}
      {s.bullets && (
        <ul style={{ margin: 0, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 8, fontSize: "clamp(13px,1.5vw,18px)", color: "#111827", lineHeight: 1.5 }}>
          {s.bullets.map((b) => <li key={b}>{b}</li>)}
        </ul>
      )}
    </div>
  );
}
