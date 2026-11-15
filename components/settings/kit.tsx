"use client";
import { ReactNode, useCallback, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useApp } from "@/components/AppContext";
import { toast } from "@/components/ui";

export function SettingsHead({ title, sub, action }: { title: string; sub: string; action?: ReactNode }) {
  return (
    <div className="set-head">
      <div className="grow"><h1 className="h1" style={{ fontSize: 28, lineHeight: "34px" }}>{title}</h1><p className="muted" style={{ marginTop: 4 }}>{sub}</p></div>
      {action}
    </div>
  );
}

export function Card({ title, sub, children, danger, style }: { title?: string; sub?: string; children: ReactNode; danger?: boolean; style?: React.CSSProperties }) {
  return (
    <section className={`set-card ${danger ? "danger" : ""}`} style={style}>
      {title && <div className="set-card-head"><div className="h3">{title}</div>{sub && <div className="caption muted">{sub}</div>}</div>}
      {children}
    </section>
  );
}

export function Row({ title, sub, children, icon }: { title: ReactNode; sub?: ReactNode; children?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="set-row">
      {icon && <span className="set-row-ico">{icon}</span>}
      <div className="grow" style={{ minWidth: 0 }}><div className="medium">{title}</div>{sub && <div className="caption muted">{sub}</div>}</div>
      {children}
    </div>
  );
}

export function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  return <select className="role-select" value={value} onChange={(e) => onChange(e.target.value)}>{options.map((o) => <option key={o}>{o}</option>)}</select>;
}

/** Reads and writes a key inside profiles.settings (jsonb), with a dirty flag and Save. */
export function useSetting<T>(key: string, fallback: T) {
  const { profile, userId, refreshProfile } = useApp();
  const initial = ((profile.settings || {})[key] as T) ?? fallback;
  const [value, setValue] = useState<T>(initial);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const update = useCallback((v: T | ((p: T) => T)) => { setValue(v); setDirty(true); }, []);
  const save = useCallback(async (extra?: Record<string, unknown>, msg = "Changes saved", override?: T) => {
    setSaving(true);
    const { data } = await supabase.from("profiles").select("settings").eq("id", userId).maybeSingle();
    const next = { ...((data?.settings as Record<string, unknown>) || {}), [key]: override !== undefined ? override : value };
    const { error } = await supabase.from("profiles").update({ settings: next, ...(extra || {}) }).eq("id", userId);
    setSaving(false);
    if (error) return toast(error.message);
    setDirty(false); await refreshProfile(); toast(msg);
  }, [key, value, userId, refreshProfile]);
  return { value, update, dirty, saving, save, setDirty };
}

export function SaveButton({ onClick, saving, dirty = true, label = "Save changes" }: { onClick: () => void; saving?: boolean; dirty?: boolean; label?: string }) {
  return <button className={`btn btn-brand ${dirty ? "" : "is-clean"}`} disabled={saving} onClick={onClick}>{saving ? "Saving…" : label}</button>;
}

export function ComingSoon({ children }: { children: ReactNode }) {
  return <div className="notice info" style={{ fontSize: 13 }}>{children}</div>;
}
