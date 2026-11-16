"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Menu, X, ChevronDown, ChevronRight, Check, Minus } from "lucide-react";
import { Logo } from "@/components/Logo";
import { PricingCards } from "@/components/Pricing";

/** Figma "Mobile / 02 · Menu": hamburger that opens a full-screen sheet. */
export function MobileMenu() {
  const [open, setOpen] = useState(false);
  const [sub, setSub] = useState<string | null>(null);
  useEffect(() => {
    document.documentElement.style.overflow = open ? "hidden" : "";
    const k = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", k);
    return () => { window.removeEventListener("keydown", k); document.documentElement.style.overflow = ""; };
  }, [open]);
  const close = () => setOpen(false);
  const groups: { label: string; href?: string; items?: [string, string][] }[] = [
    { label: "Product", items: [["Overview", "/product"], ["Analytics", "/product#analytics"], ["Live alerts", "/product#alerts"], ["Secure links", "/product#links"], ["eSign & file requests", "/esign"], ["MCP for AI tools", "/docs/mcp"]] },
    { label: "Data rooms", href: "/data-rooms" },
    { label: "Security", href: "/security" },
    { label: "Integrations", href: "/integrations" },
    { label: "Pricing", href: "/pricing" },
    { label: "Docs", href: "/docs" },
    { label: "Company", items: [["Talk to sales", "/talk-to-sales"], ["Changelog", "/docs/changelog"], ["Contact support", "/docs/contact"]] },
  ];
  return (
    <>
      <button className="lm-burger m-only" aria-label="Open menu" aria-expanded={open} onClick={() => setOpen(true)}><Menu size={22} /></button>
      {open && createPortal(
        <div className="lm-sheet" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="lm-head"><Link href="/" onClick={close} aria-label="Dozzier home"><Logo height={24} /></Link><span className="grow" /><button className="lm-x" aria-label="Close menu" onClick={close}><X size={22} /></button></div>
          <nav className="lm-list">
            {groups.map((g) => g.items ? (
              <div key={g.label} className={`lm-group ${sub === g.label ? "open" : ""}`}>
                <button className="lm-item" aria-expanded={sub === g.label} onClick={() => setSub(sub === g.label ? null : g.label)}>{g.label}<ChevronDown size={18} /></button>
                {sub === g.label && <div className="lm-sub">{g.items.map(([t, h]) => <Link key={t} href={h} onClick={close}>{t}</Link>)}</div>}
              </div>
            ) : (
              <Link key={g.label} className="lm-item" href={g.href!} onClick={close}>{g.label}<ChevronRight size={18} /></Link>
            ))}
          </nav>
          <span className="grow" />
          <div className="lm-foot">
            <Link href="/signup" className="btn btn-dark btn-l btn-block" onClick={close}>Try for free</Link>
            <Link href="/login" className="btn btn-secondary btn-l btn-block" onClick={close}>Sign in</Link>
          </div>
        </div>, document.body
      )}
    </>
  );
}

const TIERS = [
  { name: "Personal", feats: ["1 user included", "Basic sharing controls", "Document-level analytics", "4 eSignatures per month", "Unlimited visitors"] },
  { name: "Standard", feats: ["Multi-file sharing", "Video & rich media analytics", "File requests", "Custom branding", "Unlimited eSignatures", "AI tools integration (MCP)"] },
  { name: "Data Rooms", feats: ["3 users included", "Enhanced data rooms", "Group visitor permissions", "Data room audit log", "Data room analytics", "Due diligence tracking"] },
];

/** Landing pricing: plan cards, plus (on phones) Figma's Monthly / Annual / Compare switch. */
export function LandingPricing() {
  const [mode, setMode] = useState<"monthly" | "annual" | "compare">("annual");
  return (
    <>
      <div className="segmented lp-seg m-only">
        <button className={mode === "monthly" ? "active" : ""} onClick={() => setMode("monthly")}>Monthly</button>
        <button className={mode === "annual" ? "active" : ""} onClick={() => setMode("annual")}>Annual · save 20%</button>
        <button className={mode === "compare" ? "active" : ""} onClick={() => setMode("compare")}>Compare</button>
      </div>
      {mode === "compare" ? (
        <div className="lp-compare m-only">
          <div className="lp-compare-row head"><span /> {TIERS.map((t) => <span key={t.name}>{t.name}</span>)}</div>
          {TIERS.flatMap((t, ti) => t.feats.map((f) => (
            <div className="lp-compare-row" key={f}><span>{f}</span>{TIERS.map((_, i) => <span key={i}>{i >= ti ? <Check size={14} /> : <Minus size={14} className="faint" />}</span>)}</div>
          )))}
        </div>
      ) : null}
      <div className={mode === "compare" ? "d-only" : ""}>
        <PricingCards cta={(id) => <Link href={`/signup?plan=${id}`} className="btn btn-block btn-primary">{id === "datarooms" ? "Start free trial" : "Select plan"}</Link>} />
      </div>
      <p className="caption faint center m-only lp-bill">{mode === "monthly" ? "Prices in USD, billed monthly." : mode === "annual" ? "Monthly prices in USD. Pay yearly and save 20%." : ""}</p>
    </>
  );
}
