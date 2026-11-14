import Link from "next/link";
import { ReactNode } from "react";
import { Flame, Lock, Check, Plus } from "lucide-react";
import { Logo, LogoMark } from "@/components/Logo";

/** Right-hand "Auth bento" panel from the Figma auth screens. */
export function AuthBento({ title }: { title: ReactNode }) {
  const bars = [34, 52, 22, 96, 44, 30, 18, 66, 26, 14];
  return (
    <aside className="bento" aria-hidden="true">
      <div className="bento-hero">
        <LogoMark size={38} />
        <p className="bento-title">{title}</p>
      </div>
      <div className="bento-row" style={{ height: 170 }}>
        <div className="bento-card grow">
          <span className="row gap-6 caption medium" style={{ color: "var(--dz-text-success)" }}><span className="live-dot" />Viewing now</span>
          <div className="row gap-10">
            <span className="avatar" style={{ width: 40, height: 40, fontSize: 16, background: "#a66bff" }}>Da</span>
            <div className="col"><span className="body-m medium">Daniel</span><span className="caption muted">Series A Deck · page 11</span></div>
          </div>
          <span className="intent danger" style={{ alignSelf: "flex-start" }}><Flame size={12} />Hot · 92</span>
        </div>
        <div className="bento-card brand-tint" style={{ width: 200, justifyContent: "space-between" }}>
          <svg width="36" height="36" viewBox="0 0 36 36"><circle cx="18" cy="18" r="14" fill="none" stroke="#d6e6fd" strokeWidth="4" /><circle cx="18" cy="18" r="14" fill="none" stroke="#4d94f7" strokeWidth="4" strokeLinecap="round" strokeDasharray={`${0.75 * 88} 88`} transform="rotate(-90 18 18)" /></svg>
          <div className="col"><span style={{ fontSize: 36, lineHeight: "40px", fontWeight: 600, letterSpacing: "-0.015em", color: "var(--dz-text-brand)" }}>82%</span><span className="caption muted">avg. completion</span></div>
        </div>
      </div>
      <div className="bento-row" style={{ height: 210 }}>
        <div className="bento-card grow" style={{ justifyContent: "space-between" }}>
          <div className="row"><span className="medium grow">Time per page</span><span className="caption faint">p.4 peak</span></div>
          <div className="row gap-6" style={{ alignItems: "flex-end" }}>
            {bars.map((h, i) => <span key={i} style={{ flex: 1, height: h, borderRadius: "5px 5px 0 0", background: i === 3 ? "var(--dz-bg-brand)" : "var(--dz-bg-brand-subtle)" }} />)}
          </div>
        </div>
        <div className="bento-card ink" style={{ width: 200, justifyContent: "space-between" }}>
          <Lock size={24} />
          <div className="col gap-6">
            <span className="h3">Locked down</span>
            {["Email gate", "NDA", "Watermark"].map((t) => <span key={t} className="row gap-6 caption" style={{ opacity: 0.8 }}><Check size={12} />{t}</span>)}
          </div>
        </div>
      </div>
      <div className="bento-trust">
        <div className="avatar-stack">
          {[["Ab", "#ff5a5a"], ["Pa", "#3b8bff"], ["Cy", "#ff4f8b"]].map(([t, c]) => <span key={t} className="avatar" style={{ width: 40, height: 40, fontSize: 16, background: c }}>{t}</span>)}
          <span className="avatar" style={{ width: 32, height: 32, background: "#fff", border: "1px solid var(--dz-border-default)", color: "var(--dz-text-primary)", alignSelf: "center" }}><Plus size={16} /></span>
        </div>
        <span className="medium muted">Trusted by 2,400+ teams for fundraising, sales and M&amp;A</span>
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
