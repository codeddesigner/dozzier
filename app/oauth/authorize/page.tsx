"use client";
import { useEffect, useMemo, useState } from "react";
import { BarChart3, Check, FileText, Link2, ShieldCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Logo } from "@/components/Logo";

type P = { client_id: string; redirect_uri: string; state: string | null; code_challenge: string; method: string; response_type: string };

function back(p: P, q: Record<string, string>) {
  const u = new URL(p.redirect_uri);
  Object.entries(q).forEach(([k, v]) => u.searchParams.set(k, v));
  if (p.state) u.searchParams.set("state", p.state);
  u.searchParams.set("iss", "https://dozzier.co");
  window.location.href = u.toString();
}

/** OAuth consent: an AI tool (Claude, ChatGPT…) asks to read this workspace through Dozzier's MCP server. */
export default function Authorize() {
  const p = useMemo<P | null>(() => {
    if (typeof window === "undefined") return null;
    const s = new URLSearchParams(window.location.search);
    return { client_id: s.get("client_id") || "", redirect_uri: s.get("redirect_uri") || "", state: s.get("state"), code_challenge: s.get("code_challenge") || "", method: s.get("code_challenge_method") || "", response_type: s.get("response_type") || "" };
  }, []);
  const [app, setApp] = useState<string | null>(null);
  const [ws, setWs] = useState<string>("");
  const [email, setEmail] = useState("");
  const [canWrite, setCanWrite] = useState(false);
  const [write, setWrite] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!p) return;
    (async () => {
      if (!p.client_id || !p.redirect_uri) return setErr("This connection link is missing details. Start again from your AI tool.");
      if (p.response_type !== "code" || p.method !== "S256" || !p.code_challenge) return setErr("This app is using an unsupported sign-in method.");
      const { data: info } = await supabase.rpc("oauth_client_info", { p_client_id: p.client_id, p_redirect_uri: p.redirect_uri });
      const i = info as { client_name: string; redirect_ok: boolean } | null;
      if (!i) return setErr("We don’t recognise this app. Remove Dozzier from your AI tool and add it again.");
      if (!i.redirect_ok) return setErr("This app’s return address doesn’t match. Remove Dozzier from your AI tool and add it again.");
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { window.location.replace(`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`); return; }
      setEmail(session.user.email || "");
      const [{ data: w }, { data: role }] = await Promise.all([supabase.rpc("ws"), supabase.rpc("ws_role")]);
      const { data: prof } = await supabase.from("profiles").select("workspace_name, full_name").eq("id", w as string).maybeSingle();
      setWs((prof as { workspace_name?: string; full_name?: string } | null)?.workspace_name || "your workspace");
      setCanWrite(["Owner", "Admin", "Editor"].includes(String(role)));
      setApp(i.client_name);
    })();
  }, [p]);

  async function allow() {
    if (!p) return;
    setBusy(true); setErr(null);
    const { data, error } = await supabase.rpc("oauth_approve", { p_client_id: p.client_id, p_redirect_uri: p.redirect_uri, p_code_challenge: p.code_challenge, p_write: write });
    if (error) { setBusy(false); return setErr(error.message); }
    back(p, { code: String(data) });
  }
  const deny = () => p && back(p, { error: "access_denied", error_description: "The user declined" });
  const host = (() => { try { return p ? new URL(p.redirect_uri).host : ""; } catch { return ""; } })();

  return (
    <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 24, padding: 24 }}>
      <Logo height={24} />
      <div className="auth-card" style={{ boxShadow: "none" }}>
        {err ? (
          <><h1 className="title" style={{ fontSize: 22 }}>Couldn’t connect</h1><p className="muted">{err}</p></>
        ) : !app ? (
          <div className="loading" style={{ minHeight: 160 }}><span className="spinner" /></div>
        ) : (
          <>
            <span className="auth-icon"><ShieldCheck size={20} /></span>
            <h1 className="title" style={{ fontSize: 22 }}>Connect {app} to Dozzier</h1>
            <p className="muted" style={{ margin: 0 }}><b>{app}</b> wants to access <b>{ws}</b>. You’re signed in as {email}.</p>
            <ul className="col" style={{ gap: 10, listStyle: "none", padding: 0, margin: "4px 0" }}>
              {[[FileText, "Read your documents and search inside them"], [BarChart3, "See visits, companies and time spent"], [Link2, "See your links, data rooms, eSign and file requests"]].map(([I, t]) => {
                const Icon = I as typeof FileText;
                return <li key={t as string} className="row gap-8" style={{ fontSize: 14 }}><Icon size={16} className="muted" />{t as string}</li>;
              })}
            </ul>
            {canWrite && (
              <label className="checkbox" style={{ alignItems: "flex-start" }}>
                <input type="checkbox" checked={write} onChange={(e) => setWrite(e.target.checked)} />
                <span><span className="medium">Also allow creating and changing links</span><br /><span className="caption muted">Lets {app} share documents and turn links off for you.</span></span>
              </label>
            )}
            <div className="col" style={{ gap: 8, marginTop: 4 }}>
              <button className="btn btn-brand btn-block" disabled={busy} onClick={allow}>{busy ? "Connecting…" : <><Check size={16} />Allow</>}</button>
              <button className="btn btn-secondary btn-block" disabled={busy} onClick={deny}>Cancel</button>
            </div>
            <p className="caption faint center" style={{ margin: 0 }}>You’ll go back to {host}. Disconnect any time in Settings → API &amp; MCP.</p>
          </>
        )}
      </div>
    </main>
  );
}
