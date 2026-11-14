"use client";
import { ReactNode, useEffect, useLayoutEffect, useRef, useState, useCallback } from "react";
import { CountUp } from "@/components/Motion";
import { X, MoreHorizontal, CheckCircle2 } from "lucide-react";
import { initials, pct, colorFor } from "@/lib/format";

/** Avatar from the Figma "Avatar" component: colored circle with Medium white initials. */
export function Avatar({ name, email, size = 32, color }: { name?: string | null; email?: string | null; size?: number; color?: string; initials?: boolean }) {
  return (
    <span className="avatar" title={name || email || undefined} style={{ width: size, height: size, fontSize: Math.max(9, Math.round(size * 0.4)), background: color || colorFor(email || name || "?") }}>
      {initials(name, email)}
    </span>
  );
}

export function Toggle({ on, onChange, disabled }: { on: boolean; onChange?: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button type="button" role="switch" aria-checked={on} disabled={disabled} className={`toggle ${on ? "on" : ""}`} onClick={() => onChange?.(!on)} />
  );
}

export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { id: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  const wrap = useRef<HTMLDivElement>(null);
  const [ind, setInd] = useState<{ x: number; w: number } | null>(null);
  useLayoutEffect(() => {
    const el = wrap.current?.querySelector<HTMLElement>('[aria-selected="true"]');
    if (el) setInd({ x: el.offsetLeft, w: el.offsetWidth });
  }, [value, tabs.length]);
  return (
    <div className={`tabs ${ind ? "has-indicator" : ""}`} role="tablist" ref={wrap}>
      {tabs.map((t) => (
        <button key={t.id} role="tab" aria-selected={value === t.id} className={`tab ${value === t.id ? "active" : ""}`} onClick={() => onChange(t.id)}>
          {t.label}
        </button>
      ))}
      {ind && <span className="tab-indicator" style={{ width: ind.w, transform: `translateX(${ind.x}px)` }} />}
    </div>
  );
}

export function Kpi({ label, value, cur, prev, invert, format }: { label: string; value: ReactNode; cur?: number; prev?: number; invert?: boolean; format?: (n: number) => string }) {
  const d = cur !== undefined && prev !== undefined ? pct(cur, prev) : null;
  const tone = d ? (invert && d.tone !== "flat" ? (d.tone === "up" ? "down" : "up") : d.tone) : "flat";
  return (
    <div className="kpi">
      <div className="kpi-label">{label}</div>
      <div className="kpi-card">
        <div className="value">{typeof value === "number" ? <CountUp to={value} /> : format && cur !== undefined ? <CountUp to={cur} format={format} /> : value}</div>
        {d && (
          <div className="row gap-6">
            <span className={`delta ${tone}`}>{d.label}</span>
            <span className="caption faint">vs last 30 days</span>
          </div>
        )}
      </div>
    </div>
  );
}

export function DocThumb({ kind }: { kind: string }) {
  const label = kind === "deck" ? "DECK" : kind === "pdf" ? "PDF" : kind === "sheet" ? "SHEET" : kind === "doc" ? "DOC" : kind === "image" ? "IMG" : kind === "video" ? "VID" : "FILE";
  return <span className={`doc-thumb ${kind}`}>{label}</span>;
}

export function Modal({ title, onClose, children, footer, width = 600 }: { title: ReactNode; onClose: () => void; children: ReactNode; footer?: ReactNode; width?: number }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  return (
    <div className="scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: width }} role="dialog" aria-modal="true">
        <div className="modal-head">
          <div className="h2 grow">{title}</div>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

export function Menu({ items }: { items: { label: string; onClick: () => void; danger?: boolean; icon?: ReactNode }[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);
  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block" }} onClick={(e) => e.stopPropagation()}>
      <button className="icon-btn s" aria-label="More actions" onClick={() => setOpen((o) => !o)}><MoreHorizontal size={16} /></button>
      {open && (
        <div className="menu">
          {items.map((it) => (
            <button key={it.label} className={it.danger ? "danger" : ""} onClick={() => { setOpen(false); it.onClick(); }}>
              {it.icon}{it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

let toastSetter: ((m: string | null) => void) | null = null;
export function toast(msg: string) { toastSetter?.(msg); }
export function ToastHost() {
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => { toastSetter = setMsg; return () => { toastSetter = null; }; }, []);
  useEffect(() => { if (!msg) return; const t = setTimeout(() => setMsg(null), 3500); return () => clearTimeout(t); }, [msg]);
  if (!msg) return null;
  return (
    <div className="toast" role="status">
      <CheckCircle2 size={16} /> {msg}
      <button className="caption" style={{ color: "#bbb", marginLeft: 8 }} onClick={() => setMsg(null)}>Close</button>
    </div>
  );
}

export function Empty({ art, title, body, children }: { art?: ReactNode; title: string; body: string; children?: ReactNode }) {
  return (
    <div className="empty">
      {art}
      <div className="h2">{title}</div>
      <p className="muted body-m">{body}</p>
      {children}
    </div>
  );
}

export function Loading() {
  return <div className="skeleton" aria-label="Loading"><span /><span /><span /><span /><span /></div>;
}

/** Simple async loader with reload. */
export function useLoad<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const run = useCallback(async () => {
    setLoading(true);
    try { setData(await fn()); setError(null); } catch (e: unknown) { setError(e instanceof Error ? e.message : String(e)); }
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(() => { run(); }, [run]);
  return { data, error, loading, reload: run, setData };
}

export function copy(text: string, msg = "Link copied to clipboard") {
  navigator.clipboard?.writeText(text).then(() => toast(msg), () => toast(text));
}
