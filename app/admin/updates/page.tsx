"use client";
import { useEffect, useRef, useState } from "react";
import { Eye, Send, FlaskConical } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Loading, toast, useLoad } from "@/components/ui";
import { adminRpc, day } from "@/lib/admin";

type U = { id: string; title: string; recipients: number; sent: number; failed: number; created_by: string | null; created_at: string; finished_at: string | null };
const EMPTY = { title: "", sub: "", body: "", cta_label: "", cta_url: "" };

async function api(body: unknown) {
  const { data: { session } } = await supabase.auth.getSession();
  const r = await fetch("/api/admin/updates", { method: "POST", headers: { authorization: `Bearer ${session?.access_token || ""}`, "content-type": "application/json" }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || "Something went wrong");
  return j;
}

/** Write a product update, preview it in the real email design, test it, then send it to everyone who hasn't opted out. */
export default function AdminUpdates() {
  const hist = useLoad(() => adminRpc<U[]>("admin_product_updates"), []);
  const count = useLoad(() => adminRpc<number>("admin_product_audience_count"), []);
  const [f, setF] = useState(EMPTY);
  const [testTo, setTestTo] = useState("");
  const [html, setHtml] = useState<string | null>(null);
  const [busy, setBusy] = useState<"preview" | "test" | "send" | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => { setF({ ...f, [k]: e.target.value }); setHtml(null); };

  useEffect(() => { supabase.auth.getSession().then(({ data }) => setTestTo(data.session?.user.email || "")); }, []);
  useEffect(() => { if (html && frame.current) frame.current.srcdoc = html; }, [html]);

  async function run(mode: "preview" | "test" | "send") {
    setErr(null);
    if (mode === "send" && !window.confirm(`Send “${f.title}” to ${count.data ?? "all"} people now? This can’t be undone.`)) return;
    setBusy(mode);
    try {
      const r = await api({ mode, ...f, test_to: testTo });
      if (mode === "preview") setHtml(r.html);
      else if (mode === "test") toast(`Test sent to ${r.to}`);
      else { toast(`Sent to ${r.sent} people${r.failed ? ` · ${r.failed} failed` : ""}`); setF(EMPTY); setHtml(null); hist.reload(); }
    } catch (e) { setErr(e instanceof Error ? e.message : "Failed"); }
    setBusy(null);
  }

  if (hist.loading && !hist.data) return <Loading />;
  return (
    <>
      <div className="adm-head"><h1>Product updates</h1><span className="caption muted">{count.data ?? "…"} people will receive it · anyone can opt out in Settings → Notifications</span></div>
      <div className="row gap-16" style={{ alignItems: "flex-start", flexWrap: "wrap" }}>
        <div className="adm-card" style={{ flex: "1 1 360px" }}>
          <label className="field"><span className="label">Title</span><input className="input" value={f.title} onChange={set("title")} placeholder="Ask Claude about your deals" maxLength={80} /></label>
          <label className="field"><span className="label">Subtitle</span><input className="input" value={f.sub} onChange={set("sub")} placeholder="Connect Dozzier to Claude in one click." maxLength={140} /></label>
          <label className="field"><span className="label">Message</span><textarea className="input" rows={8} value={f.body} onChange={set("body")} placeholder={"What’s new, in a few short paragraphs.\n\nLeave a blank line between paragraphs. Links are clickable."} /></label>
          <div className="row gap-8">
            <label className="field grow"><span className="label">Button text (optional)</span><input className="input" value={f.cta_label} onChange={set("cta_label")} placeholder="Try it now" /></label>
            <label className="field grow"><span className="label">Button link</span><input className="input" value={f.cta_url} onChange={set("cta_url")} placeholder="https://dozzier.co/app" /></label>
          </div>
          {err && <p className="error-text">{err}</p>}
          <div className="row gap-8 wrap">
            <button className="btn btn-secondary btn-s" disabled={!!busy} onClick={() => run("preview")}><Eye size={14} />{busy === "preview" ? "Loading…" : "Preview"}</button>
            <span className="row gap-6"><input className="input" style={{ height: 32, width: 200 }} value={testTo} onChange={(e) => setTestTo(e.target.value)} aria-label="Test address" />
              <button className="btn btn-secondary btn-s" disabled={!!busy} onClick={() => run("test")}><FlaskConical size={14} />{busy === "test" ? "Sending…" : "Send test"}</button></span>
            <span className="grow" />
            <button className="btn btn-brand btn-s" disabled={!!busy || !f.title.trim() || !f.body.trim()} onClick={() => run("send")}><Send size={14} />{busy === "send" ? "Sending…" : `Send to ${count.data ?? "everyone"}`}</button>
          </div>
        </div>
        <div className="adm-card" style={{ flex: "1 1 420px", padding: 0, overflow: "hidden", minHeight: 420 }}>
          {html ? <iframe ref={frame} title="Email preview" style={{ border: 0, width: "100%", height: 640, background: "#f6f5f8" }} sandbox="" />
            : <div className="col center muted" style={{ padding: 40, gap: 6, justifyContent: "center", minHeight: 420, alignItems: "center" }}><Eye size={20} /><span>Click Preview to see the email</span></div>}
        </div>
      </div>
      <div className="adm-card" style={{ padding: "0 18px" }}>
        <table className="table">
          <thead><tr><th>Update</th><th>Sent</th><th>Failed</th><th>By</th><th>Date</th></tr></thead>
          <tbody>
            {!(hist.data || []).length && <tr><td colSpan={5} className="table-empty">No updates sent yet.</td></tr>}
            {(hist.data || []).map((u) => (
              <tr key={u.id}><td className="medium">{u.title}</td><td>{u.finished_at ? `${u.sent} of ${u.recipients}` : "Sending…"}</td><td>{u.failed || "—"}</td><td className="muted">{u.created_by}</td><td className="muted">{day(u.created_at)}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
