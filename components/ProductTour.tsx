"use client";
import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter } from "next/navigation";
import { Share2, HousePlus, Signature, LayoutGrid, Check, CheckCircle2, ChevronRight, Flag, Play, X, ArrowRight } from "lucide-react";
import { LogoMark } from "@/components/Logo";

/** Figma Flow 8 · "First-run product tour": welcome → 7 spotlight steps → all set (or a "Resume tour" pill if skipped). */
type Goal = "share" | "room" | "sign" | "explore";
type State = { status: "welcome" | "active" | "skipped" | "done" | "off"; step: number; goal: Goal };
type Step = { route?: string; target: string; title: string; body: string; place: "right" | "bottom" | "left" };

const STEPS: Step[] = [
  { target: '.sidebar a[href="/app/content"]', place: "right", title: "Start with your content", body: "Upload decks, PDFs or videos here. We scan each file for sensitive info and suggest the right link settings." },
  { route: "/app/content", target: '[data-tour="add-content"]', place: "bottom", title: "Add content, then share a link", body: "Create a tracked link per recipient — require email, add a passcode or NDA, set expiry and watermark — then see every page they read." },
  { route: "/app", target: ".dash-table", place: "left", title: "See exactly who’s reading", body: "Every visit, page by page — time spent, downloads and forwards. Click a person for their full timeline and intent score." },
  { target: '.sidebar a[href="/app/inbox"]', place: "right", title: "Know the moment they open it", body: "Activity shows who’s viewing right now, questions on pages and forwards. Turn on push to get alerts on your phone." },
  { target: '[data-tour="spaces"]', place: "right", title: "Run deals in a data room", body: "Group files into a Space, set permissions per group, track diligence requests and answer questions — all in one link." },
  { target: '.sidebar a[href="/app/ask"]', place: "right", title: "Ask Dozzier anything", body: "“Which investors read the financials twice?” Get cited answers and draft follow-ups in one click. Shortcut: ⌘J." },
  { target: ".ws-switch", place: "right", title: "Make it yours", body: "Open your workspace menu for profile, preferences, dark mode, team members and billing. You can restart this tour from Help anytime." },
];
const GOALS: { id: Goal; title: string; sub: string; I: typeof Share2; label: string }[] = [
  { id: "share", title: "Share a document", sub: "Track who reads what", I: Share2, label: "sharing documents" },
  { id: "room", title: "Set up a data room", sub: "Diligence & fundraising", I: HousePlus, label: "data rooms" },
  { id: "sign", title: "Get something signed", sub: "NDAs and agreements", I: Signature, label: "getting agreements signed" },
  { id: "explore", title: "Just explore", sub: "Show me everything", I: LayoutGrid, label: "getting started" },
];

const key = (uid: string) => `dz-tour-${uid}`;
function load(uid: string): State | null { try { const s = localStorage.getItem(key(uid)); return s ? JSON.parse(s) : null; } catch { return null; } }
function save(uid: string, s: State) { try { localStorage.setItem(key(uid), JSON.stringify(s)); } catch {} }
/** Restart the tour from anywhere (Help panel, account menu). */
export function startTour() { window.dispatchEvent(new Event("dz-tour-start")); }

export function ProductTour({ userId, firstName, createdAt, checklist }: { userId: string; firstName: string; createdAt?: string; checklist: { id: string; label: string; done: boolean }[] | null }) {
  const router = useRouter();
  const path = usePathname();
  const [s, setS] = useState<State | null>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const update = useCallback((n: State) => { setS(n); save(userId, n); }, [userId]);

  // First visit after sign-up (account < 3 days old) shows the welcome; everyone else can start it from Help.
  useEffect(() => {
    const saved = load(userId);
    if (saved) { setS(saved.status === "active" ? { ...saved, status: "skipped" } : saved); return; }
    const fresh = createdAt && Date.now() - new Date(createdAt).getTime() < 3 * 86400000;
    setS({ status: fresh ? "welcome" : "off", step: 0, goal: "share" });
  }, [userId, createdAt]);
  useEffect(() => {
    const h = () => update({ status: "welcome", step: 0, goal: s?.goal || "share" });
    window.addEventListener("dz-tour-start", h);
    return () => window.removeEventListener("dz-tour-start", h);
  }, [s?.goal, update]);

  const step = s?.status === "active" ? STEPS[s.step] : null;

  // Move to the step's page, then find and track its target.
  useEffect(() => {
    if (!step) return;
    if (step.route && path !== step.route) { router.push(step.route); return; }
    let raf = 0, tries = 0;
    const find = () => {
      const el = document.querySelector<HTMLElement>(step.target);
      if (el) { el.scrollIntoView({ block: "nearest", behavior: "smooth" }); setRect(el.getBoundingClientRect()); return; }
      if (tries++ < 120) raf = requestAnimationFrame(find);
    };
    setRect(null); find();
    return () => cancelAnimationFrame(raf);
  }, [step, path, router]);
  useLayoutEffect(() => {
    if (!step) return;
    const re = () => { const el = document.querySelector<HTMLElement>(step.target); if (el) setRect(el.getBoundingClientRect()); };
    window.addEventListener("resize", re); window.addEventListener("scroll", re, true);
    const t = setInterval(re, 400);
    return () => { window.removeEventListener("resize", re); window.removeEventListener("scroll", re, true); clearInterval(t); };
  }, [step]);
  useEffect(() => {
    if (s?.status !== "active") return;
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") update({ ...s, status: "skipped" }); if (e.key === "ArrowRight") go(1); if (e.key === "ArrowLeft") go(-1); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  });

  if (!mounted || !s || s.status === "off") return null;
  const go = (d: number) => { if (!s) return; const n = s.step + d; if (n < 0) return; if (n >= STEPS.length) return update({ ...s, status: "done" }); update({ ...s, step: n }); };
  const goal = GOALS.find((g) => g.id === s.goal) || GOALS[0];

  if (s.status === "welcome") return createPortal(
    <div className="scrim tour-scrim">
      <div className="modal tour-welcome" role="dialog" aria-modal="true" aria-label="Welcome to Dozzier">
        <div className="tour-hero"><span className="tour-hero-mark"><LogoMark size={30} color="#fff" /></span></div>
        <div className="tour-title">Welcome to Dozzier{firstName ? `, ${firstName}` : ""}</div>
        <p className="tour-sub">What would you like to do first? We’ll tailor a quick tour (about 2 minutes) around it.</p>
        <div className="tour-goals">
          {GOALS.map((g) => (
            <button key={g.id} className={`tour-goal ${s.goal === g.id ? "on" : ""}`} onClick={() => update({ ...s, goal: g.id })} aria-pressed={s.goal === g.id}>
              <span className="row"><g.I size={18} />{s.goal === g.id && <CheckCircle2 size={16} className="tour-goal-check" />}</span>
              <span className="tour-goal-t">{g.title}</span><span className="tour-goal-s">{g.sub}</span>
            </button>
          ))}
        </div>
        <div className="row" style={{ marginTop: 24 }}>
          <button className="btn btn-ghost" onClick={() => update({ ...s, status: "skipped", step: 0 })}>Skip for now</button>
          <span className="grow" />
          <button className="btn btn-brand" onClick={() => update({ ...s, status: "active", step: 0 })}>Start the tour <ArrowRight size={16} /></button>
        </div>
      </div>
    </div>, document.body);

  if (s.status === "done") {
    const items = [
      { label: "Take the product tour", done: true, href: "" },
      { label: "Upload your first document", done: !!checklist?.find((c) => c.id === "upload")?.done, href: "/app/content?upload=1" },
      { label: "Share a tracked link", done: !!checklist?.find((c) => c.id === "link")?.done, href: "/app/content" },
      { label: "Get your first visit", done: false, href: "/app" },
      { label: "Invite a teammate", done: !!checklist?.find((c) => c.id === "invite")?.done, href: "/app/settings/members" },
    ];
    const close = () => update({ ...s, status: "off" });
    return createPortal(
      <div className="scrim tour-scrim" onMouseDown={(e) => e.target === e.currentTarget && close()}>
        <div className="modal tour-done" role="dialog" aria-modal="true" aria-label="You’re all set">
          <span className="tour-done-ico"><Check size={22} /></span>
          <div className="tour-title center">You’re all set{firstName ? `, ${firstName}` : ""}</div>
          <p className="tour-sub center">Here’s your Getting started checklist for {goal.label}. Work through it to get the most from your trial.</p>
          <div className="tour-list">
            {items.map((it) => (
              <button key={it.label} className={`tour-item ${it.done ? "done" : ""}`} disabled={!it.href} onClick={() => { close(); router.push(it.href); }}>
                {it.done ? <CheckCircle2 size={16} className="ok" /> : <Flag size={16} />}<span className="grow">{it.label}</span>{!it.done && <ChevronRight size={16} />}
              </button>
            ))}
          </div>
          <div className="row gap-8" style={{ marginTop: 20 }}>
            <button className="btn btn-secondary grow" onClick={close}>Explore on my own</button>
            <button className="btn btn-brand grow" onClick={() => { close(); router.push("/app/content?upload=1"); }}>Upload a document</button>
          </div>
        </div>
      </div>, document.body);
  }

  if (s.status === "skipped") return createPortal(
    <div className="tour-resume" role="status">
      <button className="tour-resume-go" onClick={() => update({ ...s, status: "active" })}><Play size={12} fill="currentColor" />Resume tour · {Math.min(s.step + 1, STEPS.length)} of {STEPS.length}</button>
      <button className="tour-resume-x" aria-label="Dismiss tour" onClick={() => update({ ...s, status: "off" })}><X size={14} /></button>
    </div>, document.body);

  // Active spotlight step
  if (!step) return null;
  const pad = 6;
  const r = rect;
  const card = (() => {
    if (!r) return { top: window.innerHeight / 2 - 120, left: window.innerWidth / 2 - 120 };
    const W = 236, H = 240;
    if (step.place === "right") return { top: Math.max(12, Math.min(r.top - 18, window.innerHeight - H - 12)), left: r.right + 18 };
    if (step.place === "bottom") return { top: r.bottom + 16, left: Math.max(12, Math.min(r.left + r.width / 2 - W / 2, window.innerWidth - W - 12)) };
    return { top: Math.max(12, r.top - 140), left: Math.max(12, r.right - W - 24) };
  })();
  return createPortal(
    <div className="tour-layer" role="dialog" aria-modal="true" aria-label={step.title}>
      {r && <div className="tour-spot" style={{ top: r.top - pad, left: r.left - pad, width: r.width + pad * 2, height: r.height + pad * 2 }} />}
      {!r && <div className="tour-dim" />}
      <div className={`tour-card place-${step.place}`} style={card} key={s.step}>
        <div className="row"><span className="tour-pill">Step {s.step + 1} of {STEPS.length}</span><span className="grow" /><button className="icon-btn s" aria-label="Skip tour" onClick={() => update({ ...s, status: "skipped" })}><X size={16} /></button></div>
        <div className="tour-card-t">{step.title}</div>
        <p className="tour-card-b">{step.body}</p>
        <div className="tour-progress">{STEPS.map((_, i) => <i key={i} className={i <= s.step ? "on" : ""} />)}</div>
        <div className="row gap-6" style={{ marginTop: 18 }}>
          <button className="tour-skip" onClick={() => update({ ...s, status: "skipped" })}>Skip tour</button>
          <span className="grow" />
          {s.step > 0 && <button className="btn btn-secondary btn-s" onClick={() => go(-1)}>Back</button>}
          <button className="btn btn-brand btn-s" onClick={() => go(1)}>{s.step === STEPS.length - 1 ? "Finish" : "Next"}</button>
        </div>
      </div>
    </div>, document.body);
}
