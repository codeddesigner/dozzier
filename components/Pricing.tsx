import { KeyRound, FileSignature, Globe, Headset, Gauge, User, Settings2, BarChart3, Users, Files, TrendingUp, FileCheck2, Palette, Puzzle, HousePlus, List, CircleCheck, Signature, Mail as MailIcon } from "lucide-react";

const ANNUAL: Record<string, string> = { personal: "$4", standard: "$20", datarooms: "$112" };

export function PricingCards({ cta, trial = false, annual = false, enterprise }: { cta: (plan: string) => React.ReactNode; trial?: boolean; annual?: boolean; enterprise?: React.ReactNode }) {
  const plans = [
    { id: "personal", name: "Personal", sub: "For secure sharing", price: "$5", per: "/ user / month", lead: "Key features:", btn: "btn-dark",
      feats: [[User, "1 user included"], [Settings2, "Basic sharing controls"], [BarChart3, "Document-level analytics"], [Signature, "4 eSignatures per month"], [Users, "Unlimited visitors"]] },
    { id: "standard", name: "Standard", sub: "For multi-file secure sharing", price: "$25", per: "/ user / month", lead: "All Personal features, plus:", ribbon: ["Most popular", "#2577ea"], btn: "btn-primary",
      feats: [[Files, "Multi-file sharing"], [TrendingUp, "Video & rich media analytics"], [FileCheck2, "File requests"], [Palette, "Custom branding"], [Signature, "Unlimited eSignatures"], [Puzzle, "AI tools integration (MCP)"]] },
    { id: "datarooms", name: "Data Rooms", sub: "For complete deal control", price: "$140", per: "/ month", lead: "All Standard features, plus:", ribbon: ["For dealmakers", "#111827"], btn: "btn-dark",
      feats: [[Users, "3 users included"], [HousePlus, "Enhanced data rooms"], [MailIcon, "Group visitor permissions"], [List, "Data room audit log"], [BarChart3, "Data room analytics"], [CircleCheck, "Due diligence tracking"]] },
  ] as const;
  return (
    <div className={enterprise ? "grid-4 price-grid-4" : "grid-3"} style={{ display: "grid", gridTemplateColumns: `repeat(${enterprise ? 4 : 3},1fr)`, gap: enterprise ? 16 : 24, alignItems: "start" }}>
      {plans.map((p) => (
        <div className={`price-card ${p.id}`} key={p.id} style={"ribbon" in p ? { borderColor: p.id === "datarooms" ? "#9ca3af" : p.ribbon[1], borderWidth: 1.5 } : undefined}>
          {"ribbon" in p && <div className="ribbon" style={{ background: p.ribbon[1] }}>{trial && p.id === "datarooms" ? "Your trial" : p.ribbon[0]}</div>}
          <div className="inner">
            <span className="muted">{p.sub}</span>
            <span className="h1" style={{ fontSize: 20 }}>{p.name}</span>
            <span><span className="h2">{annual ? ANNUAL[p.id] : p.price}</span> <span className="muted">{p.per}{annual ? ", billed yearly" : ""}</span></span>
            {cta(p.id)}
            <span className="semibold mt-16">{p.lead}</span>
            <ul>{p.feats.map(([I, t]) => <li key={t}><I size={16} />{t}</li>)}</ul>
          </div>
        </div>
      ))}
      {enterprise && (
        <div className="price-card enterprise">
          <div className="inner">
            <span className="muted">For large &amp; regulated teams</span>
            <span className="h1" style={{ fontSize: 20 }}>Enterprise</span>
            <span><span className="h2">Custom</span> <span className="muted">annual contract</span></span>
            {enterprise}
            <span className="semibold mt-16">All Data Rooms features, plus:</span>
            <ul>{([[KeyRound, "SSO, SAML & SCIM"], [FileSignature, "Custom contracts & DPA"], [Globe, "Data residency (EU / US)"], [Headset, "Dedicated success manager"], [Gauge, "Uptime SLA & priority support"]] as const).map(([I, t]) => <li key={t}><I size={16} />{t}</li>)}</ul>
          </div>
        </div>
      )}
    </div>
  );
}

