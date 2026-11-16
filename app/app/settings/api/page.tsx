"use client";
import { useState } from "react";
import Link from "next/link";
import { KeyRound, Plus, Copy, Lock, Plug } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useApp } from "@/components/AppContext";
import { Modal, Toggle, copy, toast, useLoad, Loading } from "@/components/ui";
import { Card, SettingsHead } from "@/components/settings/kit";
import { timeAgo } from "@/lib/format";

type Key = { id: string; name: string; prefix: string; can_write: boolean; last_used_at: string | null; created_at: string; revoked_at: string | null };
const MCP_URL = "https://dozzier.co/api/mcp";
const TOOLS: [string, string][] = [
  ["get_workspace_summary", "Totals and most-viewed documents"], ["list_documents", "Documents with link and visit counts"],
  ["search_documents", "Search names and file contents"], ["get_document_analytics", "Time per page, completion, top visitors"],
  ["list_links", "Links, settings and visits"], ["list_recent_visits", "Who opened what, and for how long"],
  ["get_contact", "One person’s full activity"], ["list_data_rooms", "Data rooms with visitors"], ["create_link", "Create a tracked link (write keys only)"],
];

/** Setup snippets for each client, with the key filled in when we have it. */
function clients(key: string) {
  return [
    { id: "claude", label: "Claude", steps: ["In Claude, open Settings → Connectors → Add custom connector.", "Name it Dozzier and paste this URL:"], code: `${MCP_URL}?key=${key}` },
    { id: "code", label: "Claude Code", steps: ["Run this in your terminal:"], code: `claude mcp add --transport http dozzier ${MCP_URL} --header "Authorization: Bearer ${key}"` },
    { id: "cursor", label: "Cursor", steps: ["Add this to ~/.cursor/mcp.json (or Settings → MCP → Add server):"], code: JSON.stringify({ mcpServers: { dozzier: { url: MCP_URL, headers: { Authorization: `Bearer ${key}` } } } }, null, 2) },
    { id: "chatgpt", label: "ChatGPT", steps: ["In ChatGPT, turn on developer mode (Settings → Apps & Connectors → Advanced), then Create a connector.", "Use this server URL with authentication set to “No authentication”:"], code: `${MCP_URL}?key=${key}` },
    { id: "other", label: "Other", steps: ["Any MCP client that supports Streamable HTTP. Server URL:", "Send the key as a header (Authorization: Bearer …), or add ?key=… to the URL if the client only accepts a URL."], code: MCP_URL },
  ];
}

function Setup({ keyValue }: { keyValue: string }) {
  const [tab, setTab] = useState("claude");
  const c = clients(keyValue).find((x) => x.id === tab)!;
  return (
    <div className="col gap-10">
      <div className="row gap-6 wrap">{clients(keyValue).map((x) => <button key={x.id} className={`pill-opt ${tab === x.id ? "on" : ""}`} onClick={() => setTab(x.id)}>{x.label}</button>)}</div>
      {c.steps.map((s) => <p key={s} className="caption muted" style={{ margin: 0 }}>{s}</p>)}
      <div className="code-box"><pre>{c.code}</pre><button className="icon-btn s" aria-label="Copy" onClick={() => copy(c.code, "Copied")}><Copy size={14} /></button></div>
    </div>
  );
}

export default function ApiMcp() {
  const { profile, role } = useApp();
  const admin = role === "Owner" || role === "Admin";
  const allowed = ["trial", "standard", "datarooms"].includes(profile.plan);
  const { data, loading, reload } = useLoad(async () => ((await supabase.from("api_keys").select("id,name,prefix,can_write,last_used_at,created_at,revoked_at").is("revoked_at", null).order("created_at", { ascending: false })).data as Key[]) || [], []);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("Claude");
  const [write, setWrite] = useState(false);
  const [busy, setBusy] = useState(false);
  const [fresh, setFresh] = useState<string | null>(null);

  async function create() {
    setBusy(true);
    const { data: r, error } = await supabase.rpc("create_api_key", { p_name: name.trim() || "API key", p_can_write: write });
    setBusy(false);
    if (error) return toast(error.message);
    setOpen(false); setFresh((r as { key: string }).key); reload();
  }
  async function revoke(k: Key) {
    if (!confirm(`Revoke “${k.name}”? Anything using it stops working straight away.`)) return;
    const { error } = await supabase.rpc("revoke_api_key", { p_id: k.id });
    if (error) return toast(error.message);
    reload(); toast("Key revoked");
  }

  if (!allowed) return (
    <>
      <SettingsHead title="API & MCP" sub="Connect Dozzier to Claude, ChatGPT, Cursor and your own tools." />
      <section className="set-card" style={{ alignItems: "center", textAlign: "center", padding: 40 }}>
        <span className="docs-cat-ico" style={{ margin: 0 }}><Lock size={18} /></span>
        <div className="h3">API keys and MCP are on Standard and Data Rooms</div>
        <p className="muted" style={{ maxWidth: 420 }}>Upgrade to connect AI tools like Claude and Cursor to your documents, links and visitor analytics.</p>
        <Link href="/app/upgrade" className="btn btn-brand">See plans</Link>
      </section>
    </>
  );

  return (
    <>
      <SettingsHead title="API & MCP" sub="Connect Dozzier to Claude, ChatGPT, Cursor and your own tools." action={admin ? <button className="btn btn-primary" onClick={() => { setName("Claude"); setWrite(false); setOpen(true); }}><Plus size={16} />Create key</button> : undefined} />
      <Card title="Connect an AI tool (MCP)">
        <div className="row gap-12"><span className="set-row-ico"><Plug size={16} /></span>
          <span className="muted grow" style={{ fontSize: 14 }}>Dozzier’s MCP server lets AI assistants read your documents, links and visitor analytics, and create links. Each key only sees this workspace.</span></div>
        <Setup keyValue="YOUR_API_KEY" />
        <details className="caption"><summary className="medium" style={{ cursor: "pointer" }}>What the assistant can do ({TOOLS.length} tools)</summary>
          <div className="col gap-4 mt-8">{TOOLS.map(([t, d]) => <div key={t} className="row gap-8"><code style={{ fontSize: 12 }}>{t}</code><span className="muted">{d}</span></div>)}</div></details>
      </Card>
      <Card title="API keys">
        {loading && !data ? <Loading /> : !data?.length ? (
          <div className="row gap-12"><span className="set-row-ico"><KeyRound size={16} /></span><span className="muted grow" style={{ fontSize: 14 }}>{admin ? "No keys yet. Create one to connect an AI tool." : "No keys yet. Ask a workspace admin to create one."}</span></div>
        ) : data.map((k) => (
          <div key={k.id} className="set-row">
            <span className="set-row-ico"><KeyRound size={16} /></span>
            <div className="col grow" style={{ minWidth: 0 }}><span className="medium">{k.name} <span className={`badge ${k.can_write ? "badge-warn" : "badge-muted"}`}>{k.can_write ? "Read & write" : "Read only"}</span></span>
              <span className="caption muted"><code>{k.prefix}…</code> · created {timeAgo(k.created_at)} · {k.last_used_at ? `last used ${timeAgo(k.last_used_at)}` : "never used"}</span></div>
            {admin && <button className="btn btn-ghost btn-s" onClick={() => revoke(k)}>Revoke</button>}
          </div>
        ))}
        <p className="caption faint">Keys act for the whole workspace. Only admins can see and manage them. A key stops working if the person who made it leaves the workspace.</p>
      </Card>
      <p className="caption muted">Want alerts in other apps instead? Use <Link className="link" href="/app/settings/integrations">Zapier, Slack or Teams</Link>.</p>

      {open && (
        <Modal title="Create API key" onClose={() => setOpen(false)} width={460} footer={<><span className="grow" /><button className="btn btn-ghost" onClick={() => setOpen(false)}>Cancel</button><button className="btn btn-primary" disabled={busy} onClick={create}>{busy ? "Creating…" : "Create key"}</button></>}>
          <div className="col gap-12">
            <label className="field"><span className="label">Name</span><input className="input" autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Claude, Cursor, Zap" /></label>
            <div className="set-row" style={{ padding: 0 }}><div className="col grow"><span>Allow creating links</span><span className="caption muted">Off = read-only. Turn on if you want the assistant to create tracked links.</span></div><Toggle on={write} onChange={setWrite} /></div>
          </div>
        </Modal>
      )}
      {fresh && (
        <Modal title="Your new API key" onClose={() => setFresh(null)} width={560} footer={<><span className="grow" /><button className="btn btn-primary" onClick={() => setFresh(null)}>Done</button></>}>
          <div className="col gap-14">
            <p className="muted" style={{ margin: 0 }}>Copy it now — you won’t see it again. Treat it like a password.</p>
            <div className="code-box"><pre>{fresh}</pre><button className="icon-btn s" aria-label="Copy key" onClick={() => copy(fresh, "Key copied")}><Copy size={14} /></button></div>
            <span className="medium">Connect it</span>
            <Setup keyValue={fresh} />
          </div>
        </Modal>
      )}
    </>
  );
}
