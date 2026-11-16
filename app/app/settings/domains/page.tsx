"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Globe, Plus, RefreshCw, Trash2, Copy, Lock, AtSign } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useApp } from "@/components/AppContext";
import { Modal, copy, toast, useLoad, Loading, Menu } from "@/components/ui";
import { SettingsHead } from "@/components/settings/kit";
import { domainRule, normalizeDomain, isVanity, vanityProblem, suggestVanity, VANITY_ROOT } from "@/lib/domains";

type D = { id: string; domain: string; status: string; is_primary: boolean; created_at: string };
type Rec = { type: string; name: string; value: string };
type Info = { status: "active" | "pending"; records: Rec[]; message?: string };

async function api(method: "GET" | "POST" | "DELETE", domain: string) {
  const { data } = await supabase.auth.getSession();
  const q = method === "POST" ? "" : `?domain=${encodeURIComponent(domain)}`;
  const r = await fetch(`/api/domains${q}`, { method, headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session?.access_token}` }, body: method === "POST" ? JSON.stringify({ domain }) : undefined });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error((j as { error?: string }).error || "Something went wrong"), { upgrade: !!(j as { upgrade?: boolean }).upgrade });
  return j as Info;
}

export default function Domains() {
  const { profile, role } = useApp();
  const admin = role === "Owner" || role === "Admin";
  const rule = domainRule(profile.plan);
  const { data, loading, reload } = useLoad(async () => ((await supabase.from("custom_domains").select("id,domain,status,is_primary,created_at").order("created_at")).data as D[]) || [], []);
  const [info, setInfo] = useState<Record<string, Info>>({});
  const [open, setOpen] = useState(false);
  const [domain, setDomain] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const vanity = (data || []).find((d) => isVanity(d.domain));
  const own = (data || []).filter((d) => !isVanity(d.domain));
  useEffect(() => { if (!name && profile.workspace_name) setName(suggestVanity(profile.workspace_name)); }, [profile.workspace_name, name]);

  async function check(d: string, quiet = false) {
    setBusy(d);
    try {
      const i = await api("GET", d);
      setInfo((x) => ({ ...x, [d]: i }));
      if (!quiet) toast(i.status === "active" ? `${d} is live` : i.message || "Not ready yet — DNS changes can take up to an hour");
      if (i.status === "active") reload();
    } catch (e) { if (!quiet) toast((e as Error).message); }
    setBusy(null);
  }
  // Refresh anything that isn't live yet; a new Dozzier address usually goes live within a minute.
  useEffect(() => {
    const pending = (data || []).filter((d) => d.status !== "active");
    pending.filter((d) => !info[d.domain]).forEach((d) => check(d.domain, true));
    if (!pending.some((d) => isVanity(d.domain))) return;
    const t = setInterval(() => pending.filter((d) => isVanity(d.domain)).forEach((d) => check(d.domain, true)), 8000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const label = name.trim().toLowerCase();
  const nameProblem = label ? vanityProblem(label) : null;
  async function claim() {
    if (!label || nameProblem) return;
    const d = `${label}.${VANITY_ROOT}`;
    setBusy("vanity");
    try { const i = await api("POST", d); setInfo((x) => ({ ...x, [d]: i })); reload(); toast(`${d} is yours`); }
    catch (e) { toast((e as Error).message); }
    setBusy(null);
  }
  async function add() {
    const d = normalizeDomain(domain);
    setBusy("new");
    try {
      const i = await api("POST", d);
      setInfo((x) => ({ ...x, [d]: i }));
      setOpen(false); setDomain(""); reload(); toast(`${d} added — now add the DNS record below`);
    } catch (e) { toast((e as Error).message); }
    setBusy(null);
  }
  async function remove(d: D) {
    const msg = isVanity(d.domain) ? `Release ${d.domain}? Links shared on it will stop opening there (they still work on dozzier.co), and someone else could claim the name.` : `Remove ${d.domain}? Links shared on it will stop opening there (they still work on dozzier.co).`;
    if (!confirm(msg)) return;
    try { await api("DELETE", d.domain); reload(); toast(isVanity(d.domain) ? "Address released" : "Domain removed"); } catch (e) { toast((e as Error).message); }
  }
  async function makePrimary(d: D) {
    await supabase.from("custom_domains").update({ is_primary: false }).neq("id", d.id);
    await supabase.from("custom_domains").update({ is_primary: true }).eq("id", d.id);
    reload(); toast(`New links will use ${d.domain} after a refresh`);
  }

  if (rule === "none") return (
    <>
      <SettingsHead title="Custom domains" sub="Share links from your own address." />
      <section className="set-card" style={{ alignItems: "center", textAlign: "center", padding: 40 }}>
        <span className="docs-cat-ico" style={{ margin: 0 }}><Lock size={18} /></span>
        <div className="h3">Branded links are on Standard and Data Rooms</div>
        <p className="muted" style={{ maxWidth: 440 }}><b>Standard</b> gives your workspace its own address, like yourcompany.{VANITY_ROOT}. <b>Data Rooms</b> also lets you use your own domain, like docs.yourcompany.com or yourdeals.com.</p>
        <Link href="/app/upgrade" className="btn btn-brand">See plans</Link>
      </section>
    </>
  );

  const status = (d: D) => <span className={`badge ${d.status === "active" ? "badge-success" : "badge-warn"}`}><span className="dot" />{d.status === "active" ? "Live" : isVanity(d.domain) ? "Setting up" : "Waiting for DNS"}</span>;

  return (
    <>
      <SettingsHead title="Custom domains" sub={rule === "any" ? "Share links from your Dozzier address or your own domain." : `Share links from your workspace’s own address on ${VANITY_ROOT}.`} />
      {loading && !data ? <Loading /> : (
        <>
          <section className="set-card">
            <div className="row gap-10"><AtSign size={18} className="brand" /><div className="col grow"><span className="h3">Your Dozzier address</span><span className="caption muted">Included on Standard and Data Rooms. No DNS setup needed.</span></div></div>
            {vanity ? (
              <>
                <div className="row gap-10 wrap">
                  <code className="medium" style={{ fontSize: 15 }}>{vanity.domain}</code>
                  {status(vanity)}
                  <span className="grow" />
                  {vanity.status !== "active" && <button className="btn btn-secondary btn-s" disabled={busy === vanity.domain} onClick={() => check(vanity.domain)}><RefreshCw size={14} className={busy === vanity.domain ? "spin" : ""} />Check</button>}
                  {admin && <Menu items={[...(!vanity.is_primary ? [{ label: "Use for new links", icon: <Globe size={14} />, onClick: () => makePrimary(vanity) }] : []), { label: "Release address", danger: true, icon: <Trash2 size={14} />, onClick: () => remove(vanity) }]} />}
                </div>
                <p className="caption muted">{vanity.status === "active" ? <>Links open at <b>{vanity.domain}/your-link</b>{vanity.is_primary ? " and new links use this address" : ""}. Links on dozzier.co keep working too.</> : info[vanity.domain]?.message || "Setting up your address — this usually takes under a minute."}</p>
              </>
            ) : admin ? (
              <>
                <div className="row gap-8 wrap" style={{ alignItems: "flex-start" }}>
                  <div className="vanity-field grow"><input className="input" value={name} onChange={(e) => setName(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} onKeyDown={(e) => e.key === "Enter" && claim()} placeholder="yourcompany" aria-label="Address name" maxLength={32} /><span>.{VANITY_ROOT}</span></div>
                  <button className="btn btn-primary" disabled={!label || !!nameProblem || busy === "vanity"} onClick={claim}>{busy === "vanity" ? "Claiming…" : "Claim address"}</button>
                </div>
                <p className="caption muted" style={{ color: nameProblem ? "var(--dz-text-danger)" : undefined }}>{nameProblem || (label ? <>Links will look like <b>{label}.{VANITY_ROOT}/series-a</b>.</> : "Pick a short name, usually your company name.")}</p>
              </>
            ) : <p className="caption muted">Ask a workspace admin to claim an address for your workspace.</p>}
          </section>

          {rule === "any" ? (
            <>
              <div className="row" style={{ marginTop: 8 }}><span className="h3 grow">Your own domain</span>{admin && <button className="btn btn-secondary btn-s" onClick={() => setOpen(true)}><Plus size={14} />Add domain</button>}</div>
              {!own.length ? (
                <section className="set-card" style={{ alignItems: "center", textAlign: "center", padding: 32 }}>
                  <span className="docs-cat-ico" style={{ margin: 0 }}><Globe size={18} /></span>
                  <p className="muted" style={{ maxWidth: 420, margin: 0 }}>Use a subdomain like docs.yourcompany.com, or a full domain you own, so visitors see your brand in the address bar.</p>
                </section>
              ) : own.map((d) => { const i = info[d.domain]; const live = d.status === "active"; return (
                <section className="set-card" key={d.id}>
                  <div className="row gap-10">
                    <Globe size={18} className="brand" />
                    <div className="col grow"><span className="h3">{d.domain}</span><span className="caption muted">{d.is_primary ? "Primary · " : ""}added {new Date(d.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span></div>
                    {status(d)}
                    <button className="btn btn-secondary btn-s" disabled={busy === d.domain} onClick={() => check(d.domain)}><RefreshCw size={14} className={busy === d.domain ? "spin" : ""} />{live ? "Recheck" : "Check DNS"}</button>
                    {admin && <Menu items={[...(!d.is_primary ? [{ label: "Use for new links", icon: <Globe size={14} />, onClick: () => makePrimary(d) }] : []), { label: "Remove domain", danger: true, icon: <Trash2 size={14} />, onClick: () => remove(d) }]} />}
                  </div>
                  {!live && (
                    <>
                      <div className="dns-table">
                        <div className="dns-head"><span>Type</span><span>Name</span><span>Value</span></div>
                        {(i?.records || []).map((r) => (
                          <div className="dns-row" key={r.type + r.name}><span className="medium">{r.type}</span><code>{r.name}</code><span className="row gap-6" style={{ minWidth: 0 }}><code className="ellipsis">{r.value}</code><button className="icon-btn s" aria-label="Copy value" onClick={() => copy(r.value, "Copied")}><Copy size={12} /></button></span></div>
                        ))}
                        {!i && <div className="dns-row"><span className="caption muted">Loading records…</span></div>}
                      </div>
                      <p className="caption muted">{i?.message || "Add the record above at your DNS provider (GoDaddy, Namecheap, Cloudflare…), then click Check DNS. Changes usually show up within minutes and can take up to an hour. The secure certificate is set up for you."}</p>
                    </>
                  )}
                  {live && <p className="caption muted">Links open at <b>{d.domain}/your-link</b>{d.is_primary ? " and new links use this domain" : ""}. Links on dozzier.co keep working too.</p>}
                </section>
              ); })}
            </>
          ) : (
            <section className="set-card">
              <div className="row gap-10"><Lock size={18} className="faint" /><div className="col grow"><span className="h3">Your own domain</span><span className="caption muted">Use docs.yourcompany.com or a full domain like yourdeals.com. Available on Data Rooms.</span></div>
                {admin && <Link href="/app/upgrade" className="btn btn-secondary btn-s">See Data Rooms</Link>}</div>
            </section>
          )}
        </>
      )}
      {open && (
        <Modal title="Add your own domain" onClose={() => setOpen(false)} width={460} footer={<><button className="btn btn-ghost" onClick={() => setOpen(false)}>Cancel</button><button className="btn btn-primary" disabled={busy === "new" || !domain.trim()} onClick={add}>{busy === "new" ? "Adding…" : "Add domain"}</button></>}>
          <label className="field"><span className="label">Domain</span><input className="input" autoFocus value={domain} onChange={(e) => setDomain(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} placeholder="docs.yourcompany.com or yourdeals.com" />
            <span className="caption faint">A subdomain is easiest. A full domain must not already host a website.</span></label>
        </Modal>
      )}
    </>
  );
}
