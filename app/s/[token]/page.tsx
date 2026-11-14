"use client";
import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { CheckCircle2, Download, PenLine, ShieldCheck, Upload, X } from "lucide-react";
import { supabase, BUCKET } from "@/lib/supabase";
import { Logo } from "@/components/Logo";
import { Pages } from "@/components/esign/Pages";
import { FIELD_META, Field, SCRIPT_CSS, SCRIPT_FONT, Sig, Signer, buildSignedPdf, colorOf, initialsOf, saveBytes, typedToPng } from "@/lib/esign";

type F = Field & { signature?: Sig | null };
type Sess = { agreement_id: string; name: string; file_path: string | null; page_count: number; status: string; sender: string;
  me: { id: string; name: string; email: string; signed_at: string | null }; signers: { id: string; name: string; position: number; signed: boolean }[]; fields: F[] };

export default function SignPage() {
  const { token } = useParams<{ token: string }>();
  const [s, setS] = useState<Sess | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [sig, setSig] = useState<Sig | null>(null);
  const [vals, setVals] = useState<Record<string, string>>({});
  const [adopt, setAdopt] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ completed: boolean } | null>(null);
  const [fail, setFail] = useState<string | null>(null);

  const load = () => supabase.rpc("get_sign_session", { p_token: token }).then(async ({ data, error }) => {
    if (error) return setErr(error.message);
    const d = data as Sess; setS(d);
    if (d.file_path) { const r = await supabase.storage.from(BUCKET).createSignedUrl(d.file_path, 3600); setUrl(r.data?.signedUrl || null); }
    const name = d.fields.find((f) => f.signer_id === d.me.id && f.kind === "name");
    if (name) setVals((v) => ({ [name.id]: d.me.name, ...v }));
  });
  useEffect(() => { load(); }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  if (err) return <Shell><div className="sg-msg"><div className="h2">{err}</div><p className="muted">Ask the sender for a new link.</p></div></Shell>;
  if (!s) return <Shell><div className="loading" style={{ margin: "80px auto" }}><span className="spinner" /></div></Shell>;
  const mine = s.fields.filter((f) => f.signer_id === s.me.id);
  const filled = (f: F) => (f.kind === "signature" || f.kind === "initials" ? !!sig : f.kind === "date" ? true : f.kind === "text" ? true : !!vals[f.id]?.trim());
  const left = mine.filter((f) => !filled(f)).length;
  const signerIdx = (id: string) => Math.max(0, s.signers.findIndex((x) => x.id === id));
  const today = new Date().toLocaleDateString("en-GB", { month: "short", day: "2-digit", year: "numeric" });

  async function finish() {
    if (left) { setFail(`${left} field${left === 1 ? "" : "s"} left — fill in the highlighted boxes`); document.querySelector(".sg-field.todo")?.scrollIntoView({ behavior: "smooth", block: "center" }); return; }
    setBusy(true); setFail(null);
    let geo: { location?: string | null; ip?: string | null } = {};
    try { geo = await (await fetch("/api/geo")).json(); } catch {}
    const { data, error } = await supabase.rpc("sign_agreement", { p_token: token, p_values: vals, p_signature: sig, p_location: geo.location || "", p_ip: geo.ip || "", p_user_agent: navigator.userAgent });
    setBusy(false);
    if (error) return setFail(error.message);
    setDone(data as { completed: boolean });
  }
  async function downloadSigned() {
    const { data } = await supabase.rpc("get_sign_session", { p_token: token });
    const d = data as Sess & { doc_hash: string | null; sent_at: string | null; sender_email: string | null; signers: (Signer & { signed: boolean })[] };
    if (!url) return;
    const orig = await (await fetch(url)).arrayBuffer();
    saveBytes(`${d.name} — signed`, await buildSignedPdf({ original: orig, name: d.name, id: d.agreement_id, hash: d.doc_hash, sentAt: d.sent_at, sender: d.sender_email || d.sender, signers: d.signers, fields: d.fields }));
  }

  if (s.me.signed_at || done) {
    const complete = done?.completed || s.status === "completed";
    return (
      <Shell>
        <div className="sg-msg">
          <span className="lr-check" style={{ width: 52, height: 52 }}><CheckCircle2 size={28} /></span>
          <div className="h2">{done ? "You’ve signed" : "You’ve already signed"} “{s.name}”</div>
          <p className="muted">{complete ? "Everyone has signed. You can download the completed copy below." : `${s.sender} will be notified. You’ll get the completed copy once everyone has signed.`}</p>
          {complete && <button className="btn btn-dark" onClick={downloadSigned}><Download size={16} />Download signed PDF</button>}
        </div>
      </Shell>
    );
  }

  return (
    <div className="sg">
      <link rel="stylesheet" href={SCRIPT_CSS} />
      <header className="sg-bar">
        <Logo height={24} />
        <span className="caption muted ellipsis sg-sub">{s.name} · {left ? `${left} of ${mine.length} field${mine.length === 1 ? "" : "s"} left` : "Ready to finish"}</span>
        <span className="grow" />
        {fail && <span className="caption hide-sm" style={{ color: "var(--dz-text-danger)" }}>{fail}</span>}
        <button className={`btn ${left ? "btn-secondary" : "btn-dark"}`} disabled={busy} onClick={finish}>{busy ? "Signing…" : "Finish"}</button>
      </header>
      <div className="sg-intro"><PenLine size={15} />{s.sender} asked you to sign. Click each highlighted field.{fail && <span className="show-sm" style={{ color: "var(--dz-text-danger)" }}> {fail}</span>}</div>
      <main className="sg-canvas">
        {url ? <Pages url={url} count={s.page_count} overlay={(pg) => s.fields.filter((f) => f.page === pg).map((f) => {
          const isMine = f.signer_id === s.me.id; const c = colorOf(signerIdx(f.signer_id));
          const style = { left: `${f.x * 100}%`, top: `${f.y * 100}%`, width: `${f.w * 100}%`, height: `${f.h * 100}%`, "--c": c } as React.CSSProperties;
          if (!isMine) {
            const who = s.signers.find((x) => x.id === f.signer_id);
            if (f.signature?.data && (f.kind === "signature")) return <div key={f.id} className="sg-field other done" style={style}><img src={f.signature.data} alt="" /></div>;
            if (f.value && f.kind !== "signature" && f.kind !== "initials") return <div key={f.id} className="sg-field other done" style={style}><span className="sg-val">{f.value}</span></div>;
            return <div key={f.id} className="sg-field other" style={style}><span className="ellipsis">{FIELD_META[f.kind].label} · {who?.name.split(" ")[0]}</span></div>;
          }
          const ok = filled(f);
          if (f.kind === "signature" || f.kind === "initials") return (
            <button key={f.id} className={`sg-field mine ${ok ? "done" : "todo"}`} style={style} onClick={() => setAdopt(true)}>
              {sig ? <SigImg sig={sig} initials={f.kind === "initials"} /> : <><PenLine size={13} />{f.kind === "signature" ? "Sign here" : "Initial"}</>}
            </button>
          );
          if (f.kind === "date") return <div key={f.id} className="sg-field mine done" style={style}><span className="sg-val">{today}</span></div>;
          return <input key={f.id} className={`sg-field mine sg-input ${ok ? "done" : "todo"}`} style={style} placeholder={FIELD_META[f.kind].label} value={vals[f.id] || ""} onChange={(e) => setVals({ ...vals, [f.id]: e.target.value })} aria-label={FIELD_META[f.kind].label} />;
        })} /> : <div className="sg-msg">Loading document…</div>}
      </main>
      <p className="caption faint row gap-6" style={{ justifyContent: "center", padding: "16px 0 32px" }}><ShieldCheck size={14} />Secured by Dozzier · Your signature, time and location are recorded on the certificate.</p>
      {adopt && <AdoptModal name={s.me.name} onClose={() => setAdopt(false)} onAdopt={(x) => { setSig(x); setAdopt(false); setFail(null); }} />}
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="sg"><header className="sg-bar"><Logo height={24} /></header>{children}</div>;
}

function SigImg({ sig, initials }: { sig: Sig; initials?: boolean }) {
  const [src, setSrc] = useState(initials ? "" : sig.data);
  useEffect(() => { if (initials) typedToPng(initialsOf(sig.text || "")).then(setSrc); else setSrc(sig.data); }, [sig, initials]);
  // eslint-disable-next-line @next/next/no-img-element
  return src ? <img src={src} alt="Your signature" /> : null;
}

function AdoptModal({ name: initial, onClose, onAdopt }: { name: string; onClose: () => void; onAdopt: (s: Sig) => void }) {
  const [tab, setTab] = useState<"type" | "draw" | "upload">("type");
  const [name, setName] = useState(initial);
  const [agree, setAgree] = useState(true);
  const [drawn, setDrawn] = useState(false);
  const [upload, setUpload] = useState<string | null>(null);
  const cv = useRef<HTMLCanvasElement>(null);
  const last = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (tab !== "draw" || !cv.current) return;
    const c = cv.current; const dpr = window.devicePixelRatio || 1;
    c.width = c.clientWidth * dpr; c.height = c.clientHeight * dpr;
    const ctx = c.getContext("2d")!; ctx.scale(dpr, dpr); ctx.lineWidth = 2.4; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.strokeStyle = "#111827";
  }, [tab]);
  const pt = (e: React.PointerEvent) => { const r = cv.current!.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  const down = (e: React.PointerEvent) => { (e.target as HTMLElement).setPointerCapture(e.pointerId); last.current = pt(e); };
  const move = (e: React.PointerEvent) => { if (!last.current) return; const p = pt(e); const ctx = cv.current!.getContext("2d")!; ctx.beginPath(); ctx.moveTo(last.current.x, last.current.y); ctx.lineTo(p.x, p.y); ctx.stroke(); last.current = p; setDrawn(true); };
  const clear = () => { const c = cv.current; if (!c) return; c.getContext("2d")!.clearRect(0, 0, c.width, c.height); setDrawn(false); };

  async function go() {
    if (!agree) return;
    if (tab === "type") { if (!name.trim()) return; onAdopt({ type: "typed", data: await typedToPng(name.trim()), text: name.trim() }); }
    if (tab === "draw" && drawn) onAdopt({ type: "drawn", data: cv.current!.toDataURL("image/png"), text: name.trim() });
    if (tab === "upload" && upload) onAdopt({ type: "upload", data: upload, text: name.trim() });
  }
  const can = agree && (tab === "type" ? !!name.trim() : tab === "draw" ? drawn : !!upload);

  return (
    <div className="sv-modal-back" onClick={onClose}>
      <div className="sv-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Adopt your signature">
        <div className="row"><span className="h3 grow">Adopt your signature</span><button className="icon-btn s" aria-label="Close" onClick={onClose}><X size={16} /></button></div>
        <div className="sg-tabs">{(["type", "draw", "upload"] as const).map((t) => <button key={t} className={tab === t ? "on" : ""} onClick={() => setTab(t)}>{t[0].toUpperCase() + t.slice(1)}</button>)}</div>
        <label className="field"><span className="label">Full name</span><input className="input" value={name} onChange={(e) => setName(e.target.value)} /></label>
        {tab === "type" && <div className="sg-preview" style={{ fontFamily: `"${SCRIPT_FONT}", "Segoe Script", cursive` }}>{name || " "}</div>}
        {tab === "draw" && <div className="sg-pad"><canvas ref={cv} onPointerDown={down} onPointerMove={move} onPointerUp={() => (last.current = null)} onPointerLeave={() => (last.current = null)} />{!drawn && <span className="sg-hint">Draw with your mouse or finger</span>}<button className="link caption sg-clear" onClick={clear}>Clear</button></div>}
        {tab === "upload" && (
          <label className="sg-pad sg-up">{upload ? <img src={upload} alt="Uploaded signature" /> : <><Upload size={18} /><span className="caption muted">PNG or JPG of your signature</span></>}
            <input type="file" accept="image/png,image/jpeg" hidden onChange={(e) => { const f = e.target.files?.[0]; if (!f) return; const img = new Image(); img.onload = () => { const c = document.createElement("canvas"); const r = Math.min(1, 600 / img.width); c.width = img.width * r; c.height = img.height * r; c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height); setUpload(c.toDataURL("image/png")); }; img.src = URL.createObjectURL(f); }} /></label>
        )}
        <label className="checkbox caption"><input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />I agree to use electronic signatures and that this is my legal signature</label>
        <div className="row gap-8"><span className="grow" /><button className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-dark" disabled={!can} onClick={go}>Adopt &amp; sign</button></div>
      </div>
    </div>
  );
}
