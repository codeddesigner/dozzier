"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Check, ChevronRight, Sparkles } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useApp } from "@/components/AppContext";
import { toast } from "@/components/ui";

export type Item = { id: string; label: string; done: boolean };

const REFRESH = "dz-checklist";
export const refreshChecklist = () => window.dispatchEvent(new Event(REFRESH));

/** Getting-started checklist that completes itself from real workspace data. */
export function useChecklist(userId: string | null, profile: { notify_visits?: boolean; crm_connected?: boolean } | null) {
  const [items, setItems] = useState<Item[] | null>(null);
  const load = useCallback(async () => {
    if (!userId) return;
    const [docs, links, invites, prof] = await Promise.all([
      supabase.from("documents").select("id", { count: "exact", head: true }).eq("is_sample", false).is("deleted_at", null),
      supabase.from("links").select("id,documents(is_sample)").limit(50),
      supabase.from("invites").select("id", { count: "exact", head: true }),
      supabase.from("profiles").select("notify_visits,crm_connected").eq("id", userId).maybeSingle(),
    ]);
    const ownLinks = ((links.data || []) as unknown as { documents: { is_sample: boolean } | null }[]).filter((l) => !l.documents?.is_sample).length;
    const p = prof.data || profile || {};
    setItems([
      { id: "account", label: "Create your account", done: true },
      { id: "upload", label: "Upload your first document", done: (docs.count || 0) > 0 },
      { id: "link", label: "Create a secure link", done: ownLinks > 0 },
      { id: "notify", label: "Turn on visit notifications", done: !!p.notify_visits },
      { id: "invite", label: "Invite a teammate", done: (invites.count || 0) > 0 },
      { id: "crm", label: "Connect your CRM", done: !!p.crm_connected },
    ]);
  }, [userId, profile]);
  useEffect(() => { load(); const h = () => load(); window.addEventListener(REFRESH, h); return () => window.removeEventListener(REFRESH, h); }, [load]);
  return items;
}

const DETAIL: Record<string, string> = {
  upload: "Drop in a deck, PDF or proposal. We count pages and get it ready to share.",
  link: "Every link has its own access rules and analytics. Try requiring an email.",
  notify: "Get a live alert in Dozzier the moment someone opens one of your links.",
  invite: "Teammates can share content, see shared analytics and co-manage data rooms.",
  crm: "Two-way sync with HubSpot, Salesforce and Pipedrive is in early access.",
};

export function GettingStarted({ onUpload }: { onUpload: () => void }) {
  const { userId, profile, refreshProfile } = useApp();
  const items = useChecklist(userId, profile);
  const [open, setOpen] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  if (!items) return null;
  const done = items.filter((i) => i.done).length;
  if (done === items.length) return null;
  const firstOpen = items.find((i) => !i.done)?.id || null;
  const expanded = open ?? firstOpen;

  async function patch(p: Record<string, unknown>, msg: string) {
    await supabase.from("profiles").update(p).eq("id", userId);
    await refreshProfile(); refreshChecklist(); toast(msg);
  }
  async function invite() {
    const e = inviteEmail.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(e)) return toast("Enter a valid email");
    const { error } = await supabase.from("invites").upsert({ email: e, role: "Editor" }, { onConflict: "owner_id,email" });
    if (error) return toast(error.message);
    setInviteEmail(""); refreshChecklist(); toast("Invite saved — email delivery isn’t connected yet");
  }

  const action = (id: string) => {
    switch (id) {
      case "upload": return <button className="btn btn-dark btn-s" onClick={onUpload}>Upload</button>;
      case "link": return <Link className="btn btn-dark btn-s" href="/app/content">Create link</Link>;
      case "notify": return <button className="btn btn-dark btn-s" onClick={() => patch({ notify_visits: true }, "Visit notifications on")}>Turn on</button>;
      case "invite": return (
        <div className="row gap-8" style={{ width: "100%", maxWidth: 420 }}>
          <input className="input grow" style={{ height: 32 }} type="email" placeholder="name@company.com" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && invite()} />
          <button className="btn btn-dark btn-s" onClick={invite}>Invite</button>
        </div>
      );
      case "crm": return <button className="btn btn-dark btn-s" onClick={() => patch({ crm_connected: true }, "Early-access request noted")}>Request early access</button>;
    }
    return null;
  };

  return (
    <div className="row gap-16 mt-24" style={{ alignItems: "flex-start", flexWrap: "wrap" }}>
      <section className="gs grow" style={{ minWidth: 340 }} aria-label="Getting started">
        <div className="gs-head"><span className="h2 grow">Getting started</span><span className="caption muted">{done} of {items.length} complete</span></div>
        <div className="gs-bar"><span style={{ width: `${(done / items.length) * 100}%` }} /></div>
        {items.map((it) => {
          const isOpen = expanded === it.id && !it.done;
          return (
            <div className="gs-item" key={it.id}>
              <button className={`gs-row ${it.done ? "done" : ""}`} onClick={() => setOpen(isOpen ? "" : it.id)} aria-expanded={isOpen}>
                <span className={`gs-circle ${it.done ? "done" : isOpen ? "next" : ""}`}>{it.done && <Check size={12} strokeWidth={3} />}</span>
                <span className={`grow ${isOpen ? "medium" : ""}`} style={{ color: it.done ? undefined : "var(--dz-text-primary)" }}>{it.label}</span>
                <ChevronRight size={16} className="faint" style={{ transform: isOpen ? "rotate(90deg)" : undefined, transition: "transform .15s" }} />
              </button>
              {isOpen && DETAIL[it.id] && <div className="gs-detail"><span className="muted">{DETAIL[it.id]}</span>{action(it.id)}</div>}
            </div>
          );
        })}
      </section>
      <div className="col gap-16" style={{ width: 336, maxWidth: "100%" }}>
        <div className="copilot-card">
          <span className="row gap-6 caption medium brand"><Sparkles size={14} />Dozzier Copilot</span>
          <span className="h3">Tip: send a link to yourself first</span>
          <span className="muted">Upload any deck or PDF, create a link and open it in another browser to see live, page-by-page analytics in action.</span>
          <div className="row gap-8 mt-8"><Link href="/app/content?upload=1" className="btn btn-dark btn-s">Upload a document</Link>
            <button className="btn btn-ghost btn-s" onClick={() => patch({ checklist_dismissed: true }, "Checklist hidden — find it under Setup guide")}>Hide checklist</button></div>
        </div>
      </div>
    </div>
  );
}
