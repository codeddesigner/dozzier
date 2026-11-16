"use client";
import { useCallback, useEffect, useState } from "react";
import { Copy, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { copy, toast } from "@/components/ui";
import { day } from "@/lib/admin";

type Link = { provider_id: string; name: string; domains: string[]; workspace_id: string | null; workspace: string | null; owner_email: string | null; users: number; created_at: string };
type Prov = { id: string; entity_id?: string; metadata_url?: string; domains: string[]; created_at?: string };
type Data = { configured: boolean; error: string | null; providers: Prov[]; links: Link[] };

export const SP = {
  entity: "https://auth.dozzier.co/auth/v1/sso/saml/metadata",
  acs: "https://auth.dozzier.co/auth/v1/sso/saml/acs",
  login: "https://dozzier.co/login?sso=1",
};

async function api(method: string, body?: unknown, q = "") {
  const { data: { session } } = await supabase.auth.getSession();
  const r = await fetch(`/api/admin/sso${q}`, { method, headers: { authorization: `Bearer ${session?.access_token || ""}`, "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || "Something went wrong");
  return j;
}

const EMPTY = { id: "", name: "", domains: "", metadata: "", owner_email: "" };

export function SsoConnections() {
  const [d, setD] = useState<Data | null>(null);
  const [form, setForm] = useState<typeof EMPTY | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const load = useCallback(() => api("GET").then(setD, (e) => setD({ configured: true, error: e.message, providers: [], links: [] })), []);
  useEffect(() => { load(); }, [load]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setBusy(true); setErr(null);
    try { await api("POST", form); toast(form.id ? "Connection updated" : `${form.name} can now sign in with SSO`); setForm(null); await load(); }
    catch (e) { setErr(e instanceof Error ? e.message : "Couldn’t save"); }
    setBusy(false);
  }
  async function remove(id: string, name: string) {
    if (!window.confirm(`Remove ${name}’s SSO connection? Their people will need to log in with email instead.`)) return;
    try { await api("DELETE", undefined, `?id=${id}`); toast("Connection removed"); await load(); } catch (e) { toast(e instanceof Error ? e.message : "Couldn’t remove"); }
  }

  const rows = (d?.providers || []).map((p) => ({ p, l: d!.links.find((l) => l.provider_id === p.id) }));
  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((f) => f && { ...f, [k]: e.target.value });

  return (
    <>
      <div className="adm-head" style={{ marginTop: 12 }}><h2 className="h3">SSO connections</h2><span className="caption muted">One per Enterprise customer</span><span className="grow" />
        {!form && d?.configured && <button className="btn btn-secondary btn-s" onClick={() => { setErr(null); setForm({ ...EMPTY }); }}><Plus size={14} />Add company</button>}
      </div>

      {d && !d.configured && <div className="notice info">Add a Supabase access token to Vercel as <code>SUPABASE_ACCESS_TOKEN</code> and redeploy to manage SSO here.</div>}
      {d?.configured && d.error && <div className="notice info">{d.error}</div>}

      {form && (
        <form className="adm-card" onSubmit={save}>
          <span className="medium">{form.id ? `Edit ${form.name}` : "Connect a company"}</span>
          <label className="field"><span className="label">Company name</span><input className="input" required value={form.name} onChange={set("name")} placeholder="Acme Inc" /></label>
          <label className="field"><span className="label">Email domains</span><input className="input" required value={form.domains} onChange={set("domains")} placeholder="acme.com, acme.co.uk" /><span className="caption faint">People with these email addresses are sent to the company’s login.</span></label>
          <label className="field"><span className="label">Metadata link or XML{form.id && " (leave blank to keep)"}</span><textarea className="input" rows={3} value={form.metadata} onChange={set("metadata")} placeholder="https://login.microsoftonline.com/…/federationmetadata.xml" /><span className="caption faint">Their IT team gets this from Okta, Microsoft Entra, Google Workspace or similar.</span></label>
          <label className="field"><span className="label">Add people to the workspace of</span><input className="input" type="email" value={form.owner_email} onChange={set("owner_email")} placeholder="owner@acme.com" /><span className="caption faint">Any member’s email. Leave blank to give each person their own workspace.</span></label>
          {err && <p className="error-text">{err}</p>}
          <div className="row gap-8"><button className="btn btn-brand btn-s" disabled={busy}>{busy ? "Saving…" : form.id ? "Save" : "Connect"}</button><button type="button" className="btn btn-secondary btn-s" onClick={() => setForm(null)}>Cancel</button></div>
        </form>
      )}

      {d?.configured && (
        <div className="adm-card" style={{ padding: "0 18px" }}>
          <table className="table">
            <thead><tr><th>Company</th><th>Domains</th><th>Workspace</th><th>People</th><th>Added</th><th /></tr></thead>
            <tbody>
              {!rows.length && <tr><td colSpan={6} className="table-empty">{d ? "No SSO connections yet." : "Loading…"}</td></tr>}
              {rows.map(({ p, l }) => (
                <tr key={p.id}>
                  <td className="medium">{l?.name || p.entity_id || "Unnamed"}</td>
                  <td>{p.domains.join(", ")}</td>
                  <td>{l?.workspace ? <>{l.workspace}<div className="caption muted">{l.owner_email}</div></> : <span className="muted">Own workspace each</span>}</td>
                  <td>{l?.users ?? 0}</td>
                  <td className="muted">{day(l?.created_at || p.created_at)}</td>
                  <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                    <button className="btn btn-ghost btn-s" onClick={() => { setErr(null); setForm({ id: p.id, name: l?.name || "", domains: p.domains.join(", "), metadata: "", owner_email: l?.owner_email || "" }); }}>Edit</button>
                    <button className="btn btn-ghost btn-s" aria-label="Remove" onClick={() => remove(p.id, l?.name || p.domains[0])}><Trash2 size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="adm-card">
        <span className="medium">Send this to the customer’s IT team</span>
        <span className="caption muted">They create a SAML app called “Dozzier” with these values, then send you their metadata link.</span>
        <dl className="adm-dl">
          {[["Entity ID / Identifier", SP.entity], ["Reply URL / ACS URL", SP.acs], ["Sign-on URL", SP.login], ["Name ID", "Email address"], ["Attributes", "email, name"]].map(([k, v]) => (
            <div key={k} style={{ display: "contents" }}><dt className="muted">{k}</dt><dd className="row gap-6" style={{ margin: 0 }}><code style={{ wordBreak: "break-all" }}>{v}</code>{v.startsWith("http") && <button className="btn btn-ghost btn-s" aria-label="Copy" onClick={() => copy(v, "Copied")}><Copy size={13} /></button>}</dd></div>
          ))}
        </dl>
      </div>
    </>
  );
}
