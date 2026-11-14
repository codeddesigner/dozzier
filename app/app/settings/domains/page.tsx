"use client";
import { useState } from "react";
import { Globe, Plus, RefreshCw, Trash2, Copy } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Modal, copy, toast, useLoad, Loading, Menu } from "@/components/ui";
import { SettingsHead } from "@/components/settings/kit";

type D = { id: string; domain: string; verify_token: string; status: string; is_primary: boolean; created_at: string };

/** Looks up a DNS record over HTTPS (Google Public DNS) so verification is real. */
async function lookup(name: string, type: "CNAME" | "TXT") {
  const r = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(name)}&type=${type}`);
  const j = await r.json();
  return ((j.Answer || []) as { data: string }[]).map((a) => a.data.replace(/^"|"$/g, "").replace(/\.$/, "").toLowerCase());
}

export default function Domains() {
  const { data, loading, reload } = useLoad(async () => (await supabase.from("custom_domains").select("*").order("created_at")).data as D[] || [], []);
  const [open, setOpen] = useState(false);
  const [domain, setDomain] = useState("");
  const [checking, setChecking] = useState<string | null>(null);

  async function add() {
    const d = domain.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(d)) return toast("Enter a domain like docs.yourcompany.com");
    const { error } = await supabase.from("custom_domains").insert({ domain: d, is_primary: !(data || []).length });
    if (error) return toast(error.message.includes("duplicate") ? "You’ve already added that domain" : error.message);
    setOpen(false); setDomain(""); reload();
  }
  async function verify(d: D) {
    setChecking(d.id);
    try {
      const [cname, txt] = await Promise.all([lookup(d.domain, "CNAME"), lookup(`_dozzier.${d.domain}`, "TXT")]);
      const ok = cname.includes("links.dozzier.io") && txt.includes(`dz-verify=${d.verify_token}`);
      await supabase.from("custom_domains").update({ status: ok ? "verified" : "pending" }).eq("id", d.id);
      toast(ok ? "DNS verified" : cname.length || txt.length ? "Records found but they don’t match yet — DNS can take up to an hour" : "No records found yet — DNS can take up to an hour");
      reload();
    } catch { toast("Couldn’t reach DNS — try again"); }
    setChecking(null);
  }
  async function remove(d: D) { await supabase.from("custom_domains").delete().eq("id", d.id); reload(); toast("Domain removed"); }

  return (
    <>
      <SettingsHead title="Custom domains" sub="Share links from your own domain." action={<button className="btn btn-primary" onClick={() => setOpen(true)}><Plus size={16} />Add domain</button>} />
      {loading && !data ? <Loading /> : !data?.length ? (
        <section className="set-card" style={{ alignItems: "center", textAlign: "center", padding: 40 }}>
          <span className="docs-cat-ico" style={{ margin: 0 }}><Globe size={18} /></span>
          <div className="h3">No custom domains yet</div>
          <p className="muted" style={{ maxWidth: 380 }}>Add a subdomain such as docs.yourcompany.com so visitors see your brand in the address bar.</p>
          <button className="btn btn-secondary" onClick={() => setOpen(true)}><Plus size={16} />Add domain</button>
        </section>
      ) : data.map((d) => (
        <section className="set-card" key={d.id}>
          <div className="row gap-10">
            <Globe size={18} className="brand" />
            <div className="col grow"><span className="h3">{d.domain}</span><span className="caption muted">{d.is_primary ? "Primary · " : ""}added {new Date(d.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span></div>
            <span className={`badge ${d.status === "verified" ? "badge-success" : "badge-warn"}`}><span className="dot" />{d.status === "verified" ? "Verified" : "Pending DNS"}</span>
            <button className="btn btn-secondary btn-s" disabled={checking === d.id} onClick={() => verify(d)}><RefreshCw size={14} className={checking === d.id ? "spin" : ""} />Check DNS</button>
            <Menu items={[{ label: "Remove domain", danger: true, icon: <Trash2 size={14} />, onClick: () => remove(d) }]} />
          </div>
          <div className="dns-table">
            <div className="dns-head"><span>Type</span><span>Name</span><span>Value</span></div>
            {([["CNAME", d.domain.split(".")[0], "links.dozzier.io"], ["TXT", `_dozzier.${d.domain.split(".")[0]}`, `dz-verify=${d.verify_token}`]] as const).map(([t, n, val]) => (
              <div className="dns-row" key={t}><span className="medium">{t}</span><code>{n}</code><span className="row gap-6" style={{ minWidth: 0 }}><code className="ellipsis">{val}</code><button className="icon-btn s" aria-label="Copy value" onClick={() => copy(val, "Copied")}><Copy size={12} /></button></span></div>
            ))}
          </div>
          {d.status === "verified" ? <p className="caption muted">DNS is verified. Serving links from custom domains is rolling out — we’ll switch yours on and email you.</p> : <p className="caption muted">Add both records at your DNS provider, then click Check DNS. Changes can take up to an hour.</p>}
        </section>
      ))}
      {open && (
        <Modal title="Add a domain" onClose={() => setOpen(false)} width={460} footer={<><button className="btn btn-ghost" onClick={() => setOpen(false)}>Cancel</button><button className="btn btn-primary" onClick={add}>Add domain</button></>}>
          <label className="field"><span className="label">Domain</span><input className="input" autoFocus value={domain} onChange={(e) => setDomain(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} placeholder="docs.yourcompany.com" /><span className="caption faint">Use a subdomain you don’t already use for a website.</span></label>
        </Modal>
      )}
    </>
  );
}
