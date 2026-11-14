"use client";
import Link from "next/link";
import { ReactNode, useEffect, useState } from "react";
import { CountUp, Cycle } from "@/components/Motion";
import { Flame, Lock, Check, Plus } from "lucide-react";
import { Logo, LogoMark } from "@/components/Logo";

/** Right-hand "Auth bento" panel from the Figma auth screens. */
const VIEWERS = [
  { n: "Daniel", i: "Da", c: "#a66bff", d: "Series A Deck · page 11", s: 92, t: "Hot" },
  { n: "Priya", i: "Pr", c: "#3b8bff", d: "Data room · Financials · p.4", s: 81, t: "Hot" },
  { n: "Marcus", i: "Ma", c: "#14c7b0", d: "Proposal v3 · page 6", s: 64, t: "Warm" },
];
const BARS = [34, 52, 22, 96, 44, 30, 18, 66, 26, 14];

/** Right-hand "Auth bento" panel from the Figma auth screens — alive. */
export function AuthBento({ title }: { title: ReactNode }) {
  const [peak, setPeak] = useState(3);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const order = [3, 7, 1, 3, 4, 7];
    let k = 0;
    const t = setInterval(() => { k = (k + 1) % order.length; setPeak(order[k]); }, 2400);
    return () => clearInterval(t);
  }, []);
  const heights = BARS.map((h, i) => (i === peak ? 96 : i === 3 ? 58 : h));
  return (
    <aside className="bento" aria-hidden="true">
      <div className="bento-hero">
        <LogoMark size={38} />
        <p className="bento-title">{title}</p>
      </div>
      <div className="bento-row" style={{ height: 170 }}>
        <div className="bento-card grow">
          <span className="row gap-6 caption medium" style={{ color: "var(--dz-text-success)" }}><span className="live-dot" />Viewing now</span>
          <Cycle items={VIEWERS} every={3000} render={(v) => (
            <div className="col gap-10">
              <div className="row gap-10">
                <span className="avatar" style={{ width: 40, height: 40, fontSize: 16, background: v.c }}>{v.i}</span>
                <div className="col"><span className="body-m medium">{v.n}</span><span className="caption muted">{v.d}</span></div>
              </div>
              <span className={`intent ${v.t === "Hot" ? "danger" : "warn"}`} style={{ alignSelf: "flex-start" }}><span className="flame"><Flame size={12} /></span>{v.t} · {v.s}</span>
            </div>
          )} />
        </div>
        <div className="bento-card brand-tint" style={{ width: 200, justifyContent: "space-between" }}>
          <svg width="36" height="36" viewBox="0 0 36 36"><circle cx="18" cy="18" r="14" fill="none" stroke="#d6e6fd" strokeWidth="4" /><circle className="ring-anim" cx="18" cy="18" r="14" fill="none" stroke="#4d94f7" strokeWidth="4" strokeLinecap="round" strokeDasharray={`${0.82 * 88} 88`} transform="rotate(-90 18 18)" /></svg>
          <div className="col"><span style={{ fontSize: 36, lineHeight: "40px", fontWeight: 600, letterSpacing: "-0.015em", color: "var(--dz-text-brand)" }}><CountUp to={82} duration={1600} />%</span><span className="caption muted">avg. completion</span></div>
        </div>
      </div>
      <div className="bento-row" style={{ height: 210 }}>
        <div className="bento-card grow" style={{ justifyContent: "space-between" }}>
          <div className="row"><span className="medium grow">Time per page</span><span key={peak} className="caption faint cycle-item">p.{peak + 1} peak</span></div>
          <div className="row gap-6" style={{ alignItems: "flex-end", height: 96 }}>
            {heights.map((h, i) => <span key={i} className="bar bar-peak" style={{ ["--i" as string]: i, flex: 1, height: h, borderRadius: "5px 5px 0 0", background: i === peak ? "var(--dz-bg-brand)" : "var(--dz-bg-brand-subtle)" }} />)}
          </div>
        </div>
        <div className="bento-card ink" style={{ width: 200, justifyContent: "space-between" }}>
          <Lock size={24} />
          <div className="col gap-6">
            <span className="h3">Locked down</span>
            {["Email gate", "NDA", "Watermark"].map((t, i) => <span key={t} className="row gap-6 caption bento-check" style={{ opacity: 0.8, animationDelay: `${700 + i * 180}ms` }}><Check size={12} />{t}</span>)}
          </div>
        </div>
      </div>
      <div className="bento-trust">
        <div className="avatar-stack">
          {[["Ab", "#ff5a5a"], ["Pa", "#3b8bff"], ["Cy", "#ff4f8b"]].map(([t, c]) => <span key={t} className="avatar" style={{ width: 40, height: 40, fontSize: 16, background: c }}>{t}</span>)}
          <span className="avatar" style={{ width: 32, height: 32, background: "#fff", border: "1px solid var(--dz-border-default)", color: "var(--dz-text-primary)", alignSelf: "center" }}><Plus size={16} /></span>
        </div>
        <span className="medium muted">Trusted by <CountUp to={2400} duration={1800} />+ teams for fundraising, sales and M&amp;A</span>
      </div>
    </aside>
  );
}

export function AuthLayout({ children, topRight, bentoTitle }: { children: ReactNode; topRight?: ReactNode; bentoTitle: ReactNode }) {
  return (
    <div className="auth2">
      <div className="auth2-form">
        <div className="row">
          <Link href="/" aria-label="Dozzier home"><Logo height={30} /></Link>
          <span className="spacer" />
          {topRight && <div className="auth2-top">{topRight}</div>}
        </div>
        <div className="auth2-center"><div className="auth2-inner">{children}</div></div>
        <div className="auth2-foot"><span>© 2026 Dozzier</span><Link href="/#faq">Privacy</Link><Link href="/#faq">Terms</Link><Link href="/#faq">Security</Link></div>
      </div>
      <AuthBento title={bentoTitle} />
    </div>
  );
}

export const SIGNUP_BENTO = <>Know exactly who reads your deck —<br />and what they care about.</>;
export const LOGIN_BENTO = <>Welcome back.<br />3 visitors opened your links while you were away.</>;

export function SocialButton({ provider, label, onClick }: { provider: "google" | "microsoft" | "sso"; label: string; onClick: () => void }) {
  return (
    <button type="button" className="social-btn" onClick={onClick}>
      {provider === "sso" ? <KeyIcon /> : <img src={`/logos/${provider}.svg`} alt="" width={provider === "google" ? 18 : 16} height={provider === "google" ? 18 : 16} />}
      {label}
    </button>
  );
}

function KeyIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="7.5" cy="15.5" r="4.5" /><path d="m10.7 12.3 9.3-9.3M16 7l3 3M19 4l2 2" /></svg>;
}

export function OrDivider() {
  return <div className="or-divider"><span />or<span /></div>;
}
