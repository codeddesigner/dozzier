"use client";
import { useState } from "react";
import Link from "next/link";
import { Check, Minus } from "lucide-react";
import { PricingCards } from "@/components/Pricing";
import { Faq } from "@/components/Faq";
import { DEMO } from "@/components/marketing/Chrome";

type Cell = string | boolean;
const COLS = [["Personal", "$5 / user / mo"], ["Standard", "$25 / user / mo"], ["Data Rooms", "$140 / mo"], ["Enterprise", "Custom"]];
const GROUPS: [string, [string, Cell, Cell, Cell, Cell][]][] = [
  ["Sharing", [
    ["Users included", "1", "Up to 10", "3 included", "Unlimited"],
    ["Tracked links", "Unlimited", "Unlimited", "Unlimited", "Unlimited"],
    ["Email verification & passcodes", true, true, true, true],
    ["Dynamic watermarks", false, true, true, true],
    ["Custom branding", false, true, true, true],
    ["Branded address (you.dozzier.co)", false, true, true, true],
    ["Your own domain", false, false, true, true],
    ["Bulk personalised links", false, true, true, true],
  ]],
  ["Analytics & engagement", [
    ["Page-by-page analytics", "Document-level", true, true, true],
    ["Live alerts (Slack, Teams, email)", false, true, true, true],
    ["Visitor Q&A on pages", false, true, true, true],
    ["MCP for Claude, ChatGPT & Cursor", false, true, true, true],
  ]],
  ["Deals & data rooms", [
    ["eSignatures", "4 / month", "Unlimited", "Unlimited", "Unlimited"],
    ["File requests", false, true, true, true],
    ["Data rooms (Spaces)", false, false, true, true],
    ["Group permissions & NDAs", false, false, true, true],
    ["Diligence request tracker", false, false, true, true],
  ]],
  ["Admin & security", [
    ["Zapier & webhooks", false, true, true, true],
    ["Audit log export", false, false, true, true],
    ["SSO, SAML & SCIM", false, false, false, true],
    ["Data residency", false, false, false, true],
    ["Support", "Email", "Email & chat", "Priority", "Dedicated manager"],
  ]],
];
const QA = [
  ["Can I try Dozzier before paying?", "Yes. Every plan starts with a 14-day free trial with all features unlocked. No card required."],
  ["What counts as a user?", "Anyone on your team who uploads documents or creates links. People who view your links are visitors, and visitors are always unlimited and free."],
  ["Can I switch plans later?", "Yes. Upgrade or downgrade anytime from Settings → Billing. Upgrades apply straight away; downgrades take effect at the end of your billing period."],
  ["Do you offer discounts?", "Paying yearly saves 20% on every plan. Startups, non-profits and education teams can talk to sales about further discounts."],
  ["How does billing work for data rooms?", "The Data Rooms plan is a flat $140 a month for the workspace with 3 users included — not per room — so you can run as many deals as you need."],
];

const val = (c: Cell) => c === true ? <Check size={16} className="brand" /> : c === false ? <Minus size={14} className="faint" /> : <span>{c}</span>;

export function PricingPage() {
  const [annual, setAnnual] = useState(true);
  return (
    <>
      <section className="mk-hero" style={{ paddingBottom: 72 }}>
        <span className="overline h-in">Pricing</span>
        <h1 className="mk-h1 h-in" style={{ fontSize: 48, letterSpacing: "-1px" }}>Pricing that scales with every deal</h1>
        <p className="mk-sub h-in">Start free for 14 days on any plan. No credit card required. Cancel anytime.</p>
        <div className="segmented mk-seg h-in">
          <button className={!annual ? "active" : ""} onClick={() => setAnnual(false)}>Monthly</button>
          <button className={annual ? "active" : ""} onClick={() => setAnnual(true)}>Annual <span className="mk-save">Save 20%</span></button>
        </div>
        <div className="mk-price-wrap" data-reveal>
          <PricingCards annual={annual}
            cta={(id) => <Link href={`/signup?plan=${id}`} className={`btn btn-block ${id === "standard" ? "btn-primary" : "btn-dark"}`}>{id === "datarooms" ? "Start free trial" : "Select plan"}</Link>}
            enterprise={<Link href={DEMO} className="btn btn-block btn-dark">Talk to sales</Link>} />
        </div>
      </section>
      <section className="mk-grid-sec">
        <div className="mk-sec-head"><h2 className="mk-h2l">Compare plans</h2></div>
        <div className="mk-compare-scroll" data-reveal>
          <table className="mk-compare">
            <thead><tr><th>Plans</th>{COLS.map(([n, p]) => <th key={n}><span className="medium">{n}</span><span className="caption muted">{p}</span></th>)}</tr></thead>
            {GROUPS.map(([g, rows]) => (
              <tbody key={g}>
                <tr className="grp"><td colSpan={5}>{g}</td></tr>
                {rows.map(([label, ...cells]) => <tr key={label}><td>{label}</td>{cells.map((c, i) => <td key={i}>{val(c)}</td>)}</tr>)}
              </tbody>
            ))}
          </table>
        </div>
      </section>
      <section className="lp-section" id="faq">
        <div className="mk-sec-head" style={{ marginBottom: 32 }}><span className="overline">FAQ</span><h2 className="mk-h2l">Pricing questions</h2></div>
        <div data-reveal><Faq items={QA} /></div>
      </section>
    </>
  );
}
