"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Globe, Plus, RefreshCw, Trash2, Copy, Lock } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useApp } from "@/components/AppContext";
import { Modal, copy, toast, useLoad, Loading, Menu } from "@/components/ui";
import { SettingsHead } from "@/components/settings/kit";
import { domainRule, isApex, normalizeDomain } from "@/lib/domains";

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
  const [busy, setBusy] = useState<string | null>(null);

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
  // Load the DNS records for every domain that isn't live yet.
  useEffect(() => { (data || []).filter((d) => d.status !== "active" && !info[d.domain]).forEach((d) => check(d.domain, true)); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  async function add() {
    const d = normalizeDomain(domain);
    if (rule === "subdomain" && isApex(d)) return toast(`Standard includes subdomains like docs.${d}. Full domains are on the Data Rooms plan.`);
    setBusy("new");
    try {
      const i = await api("POST", d);
      setInfo((x) => ({ ...x, [d]: i }));
      setOpen(false); setDomain(""); reload(); toast(`${d} added — now add the DNS record below`);
    } catch (e) { toast((e as Error).message); }
    setBusy(null);
  }
  async function remove(d: D) {
    if (!confirm(`Remove ${d.domain}? Links shared on it will stop opening there (they still work on dozzier.co).`)) return;
    try { await api("DELETE", d.domain); reload(); toast("Domain removed"); } catch (e) { toast((e as Error).message); }
  }
  async function makePrimary(d: D) {
    await supabase.from("custom_domains").update({ is_primary: false }).neq("id", d.id);
    await supabase.from("custom_domains").update({ is_primary: true }).eq("id", d.id);
    reload(); toast(`New links will use ${d.domain} after a refresh`);
  }

  const sub = rule === "any" ? "Share links from your own subdomain or full domain." : "Share links from your own subdomain, like docs.yourcompany.com.";
  if (rule === "none") return (
    <>
      <SettingsHead title="Custom domains" sub="Share links from your own domain." />
      <section className="set-card" style={{ alignItems: "center", textAlign: "center", padding: 40 }}>
        <span className="docs-cat-ico" style={{ margin: 0 }}><Lock size={18} /></span>
        <div className="h3">Custom domains are on Standard and Data Rooms</div>
        <p className="muted" style={{ maxWidth: 420 }}><b>Standard</b> lets you share from a subdomain like docs.yourcompany.com. <b>Data Rooms</b> also lets you use a full domain like yourdeals.com.</p>
        <Link href="/app/upgrade" className="btn btn-brand">See plans</Link>
      </section>
    </>
  );

  return (
    <>
      <SettingsHead title="Custom domains" sub={sub} action={admin ? <button className="btn btn-primary" onClick={() => setOpen(true)}><Plus size={16} />Add domain</button> : undefined} />
      {loading && !data ? <Loading /> : !data?.length ? (
        <section className="set-card" style={{ alignItems: "center", textAlign: "center", padding: 40 }}>
          <span className="docs-cat-ico" style={{ margin: 0 }}><Globe size={18} /></span>
          <div className="h3">No custom domains yet</div>
          <p className="muted" style={{ maxWidth: 400 }}>Add {rule === "any" ? "a subdomain such as docs.yourcompany.com, or a full domain you own," : "a subdomain such as docs.yourcompany.com"} so visitors see your brand in the address bar.</p>
          {admin && <button className="btn btn-secondary" onClick={() => setOpen(true)}><Plus size={16} />Add domain</button>}
        </section>
      ) : data.map((d) => { const i = info[d.domain]; const live = d.status === "active"; return (
        <section className="set-card" key={d.id}>
          <div className="row gap-10">
            <Globe size={18} className="brand" />
            <div className="col grow"><span className="h3">{d.domain}</span><span className="caption muted">{d.is_primary ? "Primary · " : ""}added {new Date(d.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span></div>
            <span className={`badge ${live ? "badge-success" : "badge-warn"}`}><span className="dot" />{live ? "Live" : "Waiting for DNS"}</span>
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
      {open && (
        <Modal title="Add a domain" onClose={() => setOpen(false)} width={460} footer={<><button className="btn btn-ghost" onClick={() => setOpen(false)}>Cancel</button><button className="btn btn-primary" disabled={busy === "new" || !domain.trim()} onClick={add}>{busy === "new" ? "Adding…" : "Add domain"}</button></>}>
          <label className="field"><span className="label">Domain</span><input className="input" autoFocus value={domain} onChange={(e) => setDomain(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} placeholder={rule === "any" ? "docs.yourcompany.com or yourdeals.com" : "docs.yourcompany.com"} />
            <span className="caption faint">{rule === "any" ? "A subdomain is easiest. A full domain must not already host a website." : "Use a subdomain you don’t already use for a website. Full domains are on the Data Rooms plan."}</span></label>
        </Modal>
      )}
    </>
  );
}
