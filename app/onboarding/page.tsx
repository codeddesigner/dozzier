"use client";
import { sendInviteEmails } from "@/lib/invites";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Plus, Copy, X, BarChart3, Target, HousePlus, Signature, Palette, User, ShieldCheck, Upload } from "lucide-react";
import { supabase, BUCKET } from "@/lib/supabase";
import { Logo, LogoMark } from "@/components/Logo";
import { Toggle, ToastHost, toast, copy } from "@/components/ui";

const STEPS = ["Account", "Workspace", "Use case", "Team", "Brand"] as const;
const SIZES = ["Just me", "2–10", "11–50", "51–200", "200+"];
const ROLES = ["Founder / CEO", "Sales", "Investment banking", "Legal", "Marketing", "Other"];
const USES = [
  { id: "fundraising", title: "Fundraising", body: "Share your deck, track investor interest and run a data room.", icon: BarChart3 },
  { id: "sales", title: "Sales enablement", body: "Send proposals, see buyer engagement, sync to CRM.", icon: Target },
  { id: "mna", title: "M&A & diligence", body: "Secure data rooms with permissions, Q&A and audit log.", icon: HousePlus },
  { id: "legal", title: "Legal & contracts", body: "NDAs, eSignatures and controlled document sharing.", icon: Signature },
  { id: "portals", title: "Client portals", body: "Branded hubs for proposals, reports and deliverables.", icon: Palette },
  { id: "other", title: "Something else", body: "Tell us what you’re working on.", icon: User },
];
const COLORS = ["#4d94f7", "#111827", "#1e9e5a", "#6b5bd6", "#e8508f", "#f08a24"];
type Invite = { email: string; role: "Admin" | "Editor" | "Viewer" };

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 30) || "workspace";

export default function Onboarding() {
  const router = useRouter();
  const [uid, setUid] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [step, setStep] = useState(1); // index into STEPS; Account (0) is done at sign-up
  const [busy, setBusy] = useState(false);
  const [dir, setDir] = useState<"fwd" | "back">("fwd");
  // workspace
  const [ws, setWs] = useState("");
  const [size, setSize] = useState("2–10");
  const [role, setRole] = useState("Founder / CEO");
  // use case
  const [uses, setUses] = useState<string[]>([]);
  const [other, setOther] = useState("");
  // team
  const [invites, setInvites] = useState<Invite[]>([{ email: "", role: "Editor" }, { email: "", role: "Viewer" }, { email: "", role: "Editor" }]);
  const [linkOn, setLinkOn] = useState(true);
  // brand
  const [color, setColor] = useState(COLORS[0]);
  const [domain, setDomain] = useState("");
  const [hide, setHide] = useState(false);
  const [logoPath, setLogoPath] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoName, setLogoName] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return router.replace("/signup");
      setUid(session.user.id); setEmail(session.user.email || "");
      const { data: p } = await supabase.from("profiles").select("*").eq("id", session.user.id).maybeSingle();
      if (p) {
        setWs(p.workspace_name && p.workspace_name !== "My workspace" ? p.workspace_name : "");
        if (p.team_size) setSize(p.team_size);
        if (p.job_role) setRole(p.job_role);
        if (p.use_cases?.length) setUses(p.use_cases);
        if (p.brand_color) setColor(p.brand_color);
        if (p.custom_domain) setDomain(p.custom_domain);
        setHide(!!p.hide_branding);
        if (p.brand_logo_path) { setLogoPath(p.brand_logo_path); setLogoName(p.brand_logo_path.split("/").pop()?.replace(/^\d+-/, "") || "logo"); }
      }
    })();
  }, [router]);

  useEffect(() => {
    if (!logoPath) { setLogoUrl(null); return; }
    supabase.storage.from(BUCKET).createSignedUrl(logoPath, 3600).then(({ data }) => setLogoUrl(data?.signedUrl || null));
  }, [logoPath]);

  const domainPart = email.split("@")[1] || "company.com";
  const wsName = ws.trim() || "Your workspace";

  const save = useCallback(async (patch: Record<string, unknown>) => {
    if (!uid) return;
    const { error } = await supabase.from("profiles").update(patch).eq("id", uid);
    if (error) throw error;
  }, [uid]);

  async function next() {
    setBusy(true);
    try {
      if (step === 1) {
        if (!ws.trim()) { toast("Give your workspace a name"); setBusy(false); return; }
        await save({ workspace_name: ws.trim(), team_size: size, job_role: role });
      } else if (step === 2) {
        await save({ use_cases: other.trim() && uses.includes("other") ? [...uses.filter((u) => u !== "other"), `other:${other.trim()}`] : uses });
      } else if (step === 3) {
        const rows = invites.map((i) => ({ email: i.email.trim().toLowerCase(), role: i.role })).filter((i) => /^\S+@\S+\.\S+$/.test(i.email));
        if (rows.length) {
          const { error } = await supabase.from("invites").upsert(rows, { onConflict: "owner_id,email" });
          if (error) throw error;
          const byRole = new Map<string, string[]>(); rows.forEach((r) => byRole.set(r.role, [...(byRole.get(r.role) || []), r.email]));
          let failed = 0; for (const [r, list] of byRole) failed += (await sendInviteEmails(list, r, email || "A teammate", ws.trim() || "their workspace")).failed;
          toast(failed ? `${rows.length - failed} of ${rows.length} invites sent` : `${rows.length} invite${rows.length > 1 ? "s" : ""} sent`);
        }
        await save({ invite_link_enabled: linkOn });
      } else if (step === 4) {
        await save({ brand_color: color, custom_domain: domain.trim() || null, hide_branding: hide, brand_logo_path: logoPath, onboarded_at: new Date().toISOString() });
        router.replace("/app");
        return;
      }
      setDir("fwd"); setStep((s) => s + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : "Couldn’t save — try again");
    }
    setBusy(false);
  }

  async function exit() {
    try { await save({ onboarded_at: new Date().toISOString(), ...(ws.trim() ? { workspace_name: ws.trim() } : {}) }); } catch {}
    router.replace("/app");
  }

  async function uploadLogo(f: File) {
    if (!uid) return;
    if (f.size > 2 * 1024 * 1024) return toast("Logo must be under 2 MB");
    const path = `${uid}/brand/${Date.now()}-${f.name.replace(/[^\w.\-]+/g, "_")}`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, f, { contentType: f.type || "image/png" });
    if (error) return toast(error.message);
    setLogoPath(path); setLogoName(f.name);
  }

  const pct = [0, 25, 50, 75, 100][step];
  const inviteUrl = typeof window !== "undefined" && uid ? `${window.location.origin}/signup?join=${uid.slice(0, 8)}` : "";

  return (
    <div className="ob">
      <header className="ob-head">
        <div className="ob-side"><Logo height={24} /></div>
        <nav className="ob-steps" aria-label="Setup progress">
          {STEPS.map((s, i) => (
            <span key={s} className="row" style={{ gap: 12 }}>
              {i > 0 && <span className={`line ${i <= step ? "filled" : ""}`} />}
              <span className={`ob-step ${i < step ? "done" : i === step ? "current" : "upcoming"}`}>
                <span className="dot">{i < step ? <Check size={14} strokeWidth={2.5} /> : i + 1}</span><span className="lbl">{s}</span>
              </span>
            </span>
          ))}
        </nav>
        <div className="ob-side" style={{ justifyContent: "flex-end" }}><button className="medium muted" onClick={exit}>Save &amp; exit</button></div>
      </header>

      <main className="ob-body">
        {step === 1 && (
          <div className={`ob-inner ${dir}`} key="ws">
            <h1 className="display-l">Set up your workspace</h1>
            <p className="body-l muted" style={{ marginTop: -8 }}>This is where your team’s content, links and data rooms live.</p>
            <label className="field"><span className="label">Workspace name</span>
              <input className="input" style={{ height: 44, fontSize: 15 }} autoFocus value={ws} onChange={(e) => setWs(e.target.value)} placeholder="Randombase" />
              <span className="caption faint">Your workspace URL: {slug(ws || "yourcompany")}.dozzier.io</span>
            </label>
            <div className="col gap-12"><span className="label">How big is your team?</span>
              <div className="row gap-8 wrap">{SIZES.map((s) => <button key={s} type="button" className={`pill-opt ${size === s ? "on" : ""}`} onClick={() => setSize(s)}>{s}</button>)}</div>
            </div>
            <div className="col gap-12"><span className="label">What’s your role?</span>
              <div className="row gap-8 wrap">{ROLES.map((s) => <button key={s} type="button" className={`pill-opt ${role === s ? "on" : ""}`} onClick={() => setRole(s)}>{s}</button>)}</div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className={`ob-inner wide ${dir}`} key="use">
            <h1 className="display-l">What will you use Dozzier for?</h1>
            <p className="body-l muted" style={{ marginTop: -8 }}>Pick all that apply — we’ll set up the right templates.</p>
            <div className="row wrap" style={{ gap: 16, alignItems: "stretch" }}>
              {USES.map((u) => {
                const on = uses.includes(u.id);
                return (
                  <button key={u.id} type="button" className={`sel-card ${on ? "on" : ""}`} aria-pressed={on} onClick={() => setUses((x) => on ? x.filter((y) => y !== u.id) : [...x, u.id])}>
                    <span className="row" style={{ width: "100%" }}><span className="ico"><u.icon size={20} /></span><span className="spacer" /><span className="check">{on && <Check size={12} strokeWidth={3} />}</span></span>
                    <span className="h3" style={{ marginTop: 22 }}>{u.title}</span>
                    <span className="muted">{u.body}</span>
                  </button>
                );
              })}
            </div>
            {uses.includes("other") && <input className="input" style={{ maxWidth: 528 }} autoFocus value={other} onChange={(e) => setOther(e.target.value)} placeholder="What are you working on?" />}
          </div>
        )}

        {step === 3 && (
          <div className={`ob-inner ${dir}`} key="team">
            <h1 className="display-l">Invite your team</h1>
            <p className="body-l muted" style={{ marginTop: -8 }}>Teammates can share content, see shared analytics and co-manage data rooms.</p>
            {invites.map((inv, i) => (
              <label className="field" key={i}><span className="label">Email</span>
                <span className="row gap-8">
                  <input className="input grow" style={{ height: 44, fontSize: 15 }} type="email" value={inv.email} placeholder={`name@${domainPart}`}
                    onChange={(e) => setInvites((x) => x.map((y, j) => j === i ? { ...y, email: e.target.value } : y))} />
                  <select className="role-select" value={inv.role} aria-label="Role" onChange={(e) => setInvites((x) => x.map((y, j) => j === i ? { ...y, role: e.target.value as Invite["role"] } : y))}>
                    <option>Admin</option><option>Editor</option><option>Viewer</option>
                  </select>
                  {invites.length > 1 && <button type="button" className="icon-btn s" aria-label="Remove" onClick={() => setInvites((x) => x.filter((_, j) => j !== i))}><X size={14} /></button>}
                </span>
              </label>
            ))}
            <button type="button" className="row gap-8 medium" style={{ alignSelf: "flex-start", padding: "4px 8px" }} onClick={() => setInvites((x) => [...x, { email: "", role: "Editor" }])}><Plus size={16} />Add another</button>
            <div className="invite-link">
              <div className="col grow"><span className="medium">Invite link</span><span className="caption muted">Anyone with an @{domainPart} email can join as Viewer</span></div>
              <Toggle on={linkOn} onChange={setLinkOn} />
              <button type="button" className="btn btn-outline btn-s" disabled={!linkOn} onClick={() => copy(inviteUrl, "Invite link copied")}><Copy size={14} />Copy link</button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className={`ob-inner ob-brand ${dir}`} key="brand">
            <div className="row gap-32" style={{ alignItems: "flex-start", flexWrap: "wrap" }}>
              <div className="col gap-24" style={{ width: 400, maxWidth: "100%" }}>
                <div className="col gap-16"><h1 className="display-l">Make it yours</h1><p className="body-l muted">Visitors see your brand, not ours.</p></div>
                <div className="field"><span className="label">Logo</span>
                  <div className="dropzone" onClick={() => fileRef.current?.click()} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) uploadLogo(f); }}>
                    <span style={{ width: 44, height: 44, borderRadius: 8, background: logoUrl ? "#fff" : "#111827", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 600, overflow: "hidden", border: logoUrl ? "1px solid var(--dz-border-default)" : 0 }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {logoUrl ? <img src={logoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} /> : (ws || "Dz").slice(0, 2).toUpperCase()}
                    </span>
                    {logoName ? (
                      <div className="col"><span className="medium">{logoName}</span>
                        <span className="caption"><button type="button" className="link caption">Replace</button> · <button type="button" className="link caption" onClick={(e) => { e.stopPropagation(); setLogoPath(null); setLogoName(null); }}>Remove</button></span></div>
                    ) : (
                      <div className="col"><span className="medium row gap-6"><Upload size={14} />Upload your logo</span><span className="caption faint">SVG or PNG, up to 2 MB</span></div>
                    )}
                  </div>
                  <input ref={fileRef} type="file" accept="image/svg+xml,image/png,image/jpeg,image/webp" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadLogo(f); e.target.value = ""; }} />
                </div>
                <div className="col gap-12"><span className="label">Accent colour</span>
                  <div className="row gap-8">{COLORS.map((c) => <button key={c} type="button" aria-label={`Accent ${c}`} className={`swatch ${color === c ? "on" : ""}`} style={{ background: c }} onClick={() => setColor(c)} />)}</div>
                </div>
                <label className="field"><span className="label">Custom domain</span>
                  <input className="input" style={{ height: 44, fontSize: 15 }} value={domain} onChange={(e) => setDomain(e.target.value)} placeholder={`docs.${domainPart}`} />
                  <span className="caption faint">Add a CNAME to links.dozzier.io — we handle SSL.</span>
                </label>
                <div className="row gap-12">
                  <div className="col grow"><span className="medium">Remove “Secured by Dozzier”</span><span className="caption faint">Available on Standard and above</span></div>
                  <Toggle on={hide} onChange={setHide} />
                </div>
              </div>
              <div className="grow" style={{ minWidth: 320 }}>
                <div className="preview-browser">
                  <div className="bar"><span className="dot" style={{ background: "#ff5f57" }} /><span className="dot" style={{ background: "#febc2e" }} /><span className="dot" style={{ background: "#28c840" }} /><span className="url">{domain.trim() || `docs.${domainPart}`}/series-a</span></div>
                  <div style={{ padding: "40px 32px 0", display: "flex", justifyContent: "center", minHeight: 400 }}>
                    <div className="col gap-12 preview-gate" style={{ width: 360, background: "#fff", borderRadius: "16px 16px 0 0", padding: "32px 24px 24px", boxShadow: "var(--shadow-lg)", textAlign: "center", alignItems: "center" }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {logoUrl ? <img src={logoUrl} alt="" style={{ height: 32, maxWidth: 140, objectFit: "contain" }} /> : <LogoMark size={32} color={color} />}
                      <div className="h3">{wsName} shared “Dozzier Intro”</div>
                      <p className="caption muted">Enter your email to view. The sender will see that you opened it.</p>
                      <label className="field" style={{ width: "100%", textAlign: "left" }}><span className="label">Email</span><input className="input" placeholder="you@company.com" readOnly tabIndex={-1} /></label>
                      <span className="btn btn-block" style={{ background: color, color: "#fff", transition: "background-color .4s ease" }}>Continue</span>
                      {!hide && <span className="caption faint row gap-6"><ShieldCheck size={13} />Secured by Dozzier</span>}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="ob-foot">
        <div className="ob-side">{step > 1 && <button className="btn btn-ghost" onClick={() => { setDir("back"); setStep((s) => s - 1); }}>Back</button>}</div>
        <div className={`ob-progress ${step === 4 ? "complete" : ""}`} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${pct}%` }} /></div>
        <div className="ob-side" style={{ justifyContent: "flex-end" }}>
          <button className="btn btn-brand" disabled={busy || !uid} onClick={next}>
            {busy ? "Saving…" : step === 3 ? (invites.some((i) => i.email.trim()) ? "Send invites" : "Skip for now") : step === 4 ? "Finish setup" : "Continue"}
          </button>
        </div>
      </footer>
      <ToastHost />
    </div>
  );
}
