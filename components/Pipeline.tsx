"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, Clock, Users, Plus, Flame } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Avatar, Modal, toast, useLoad } from "@/components/ui";
import { duration, intentLevel, intentScore, timeAgo } from "@/lib/format";

export const STAGES = [
  { id: "sent", label: "Sent" }, { id: "engaged", label: "Engaged" }, { id: "deep_dive", label: "Deep dive" },
  { id: "data_room", label: "In data room" }, { id: "term_sheet", label: "Term sheet" }, { id: "closed", label: "Closed" },
] as const;
type Stage = (typeof STAGES)[number]["id"];
type A = { id: string; name: string; domain: string | null; stage: Stage | null; deal: string | null; pipeline: string; archived: boolean; created_at: string };
type V = { account_id: string; visitor_email: string | null; started_at: string; last_seen_at: string; duration_seconds: number; downloaded: boolean; link_id: string | null; parent_visit_id: string | null };
type C = { account_id: string; email: string; name: string | null };

export function Pipeline({ onList }: { onList?: () => void }) {
  const router = useRouter();
  const [pipeline, setPipeline] = useState<string>("");
  const [drag, setDrag] = useState<string | null>(null);
  const [over, setOver] = useState<Stage | null>(null);
  const [add, setAdd] = useState<{ name: string; domain: string; deal: string; stage: Stage; pipeline: string } | null>(null);
  const { data, reload, setData } = useLoad(async () => {
    const [a, v, c, l] = await Promise.all([
      supabase.from("accounts").select("id,name,domain,stage,deal,pipeline,archived,created_at").eq("archived", false).order("created_at", { ascending: false }),
      supabase.from("visits").select("account_id,visitor_email,started_at,last_seen_at,duration_seconds,downloaded,link_id,parent_visit_id").not("account_id", "is", null).order("started_at", { ascending: false }).limit(3000),
      supabase.from("contacts").select("account_id,email,name").not("account_id", "is", null),
      supabase.from("links").select("id,space_id").not("space_id", "is", null),
    ]);
    return { accounts: (a.data || []) as A[], visits: (v.data || []) as V[], contacts: (c.data || []) as C[], spaceLinks: new Set((l.data || []).map((x) => x.id as string)) };
  }, []);
  const pipelines = useMemo(() => [...new Set((data?.accounts || []).map((a) => a.pipeline || "Default"))], [data]);
  const current = pipeline || pipelines.find((p) => p !== "Default") || pipelines[0] || "Default";

  const cards = useMemo(() => (data?.accounts || []).filter((a) => (a.pipeline || "Default") === current).map((a) => {
    const vs = data!.visits.filter((v) => v.account_id === a.id);
    const people = [...new Set([...data!.contacts.filter((c) => c.account_id === a.id).map((c) => c.email), ...vs.map((v) => v.visitor_email).filter(Boolean) as string[]])];
    const secs = vs.reduce((n, v) => n + v.duration_seconds, 0);
    const score = intentScore({ seconds: secs, visits: vs.length, downloads: vs.filter((v) => v.downloaded).length });
    const inRoom = vs.some((v) => v.link_id && data!.spaceLinks.has(v.link_id));
    const inferred: Stage = inRoom ? "data_room" : score >= 70 ? "deep_dive" : vs.length ? "engaged" : "sent";
    const last = vs[0]?.last_seen_at;
    return { a, vs, people, secs, score, stage: (a.stage || inferred) as Stage, auto: !a.stage, last,
      foot: !vs.length ? `Added ${timeAgo(a.created_at).toLowerCase()} · no opens yet` : inRoom && !a.stage ? "Opened the data room" : `Last active ${timeAgo(last!).toLowerCase()}` };
  }), [data, current]);

  async function move(id: string, stage: Stage) {
    setData((d) => d && { ...d, accounts: d.accounts.map((a) => (a.id === id ? { ...a, stage } : a)) });
    const { error } = await supabase.from("accounts").update({ stage, stage_updated_at: new Date().toISOString() }).eq("id", id);
    if (error) { toast(error.message); reload(); }
  }
  async function create() {
    if (!add?.name.trim()) return toast("Give the account a name");
    const domain = add.domain.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "") || null;
    const { error } = await supabase.from("accounts").insert({ name: add.name.trim(), domain, deal: add.deal.trim() || null, stage: add.stage, pipeline: add.pipeline.trim() || "Default", stage_updated_at: new Date().toISOString() });
    if (error) return toast(error.message.includes("duplicate") ? "An account with that domain already exists" : error.message);
    setAdd(null); setPipeline(add.pipeline.trim() || "Default"); reload();
  }

  return (
    <>
      <div className="page-head">
        <h1 className="page-title grow">Pipeline</h1>
        <select className="filter-pill" value={current} onChange={(e) => { if (e.target.value === "__new") { const n = prompt("Name this pipeline (e.g. Series A raise)"); if (n?.trim()) { setPipeline(n.trim()); setAdd({ name: "", domain: "", deal: "", stage: "sent", pipeline: n.trim() }); } } else setPipeline(e.target.value); }}>
          {[...new Set([current, ...pipelines])].map((p) => <option key={p} value={p}>{p === "Default" ? "All deals" : p}</option>)}<option value="__new">+ New pipeline…</option></select>
        {onList && <button className="btn btn-secondary" onClick={onList}>List view</button>}
        <button className="btn btn-dark" onClick={() => setAdd({ name: "", domain: "", deal: "", stage: "sent", pipeline: current })}><Plus size={16} />Add account</button>
      </div>
      {!data ? <div className="skeleton mt-24"><span /><span /><span /></div> : (
        <div className="pipe">
          {STAGES.map((st) => { const col = cards.filter((c) => c.stage === st.id); return (
            <section key={st.id} className={`pipe-col ${over === st.id ? "over" : ""}`} onDragOver={(e) => { e.preventDefault(); setOver(st.id); }} onDragLeave={() => setOver((o) => (o === st.id ? null : o))}
              onDrop={(e) => { e.preventDefault(); setOver(null); const id = e.dataTransfer.getData("text/dz-account") || drag; if (id) move(id, st.id); setDrag(null); }}>
              <div className="pipe-head"><span className="medium">{st.label}</span><span className="pipe-n">{col.length}</span></div>
              {col.map((c, i) => { const lvl = intentLevel(c.score); return (
                <article key={c.a.id} className={`pipe-card ${drag === c.a.id ? "dragging" : ""}`} draggable style={{ animationDelay: `${i * 40}ms` }}
                  onDragStart={(e) => { e.dataTransfer.setData("text/dz-account", c.a.id); e.dataTransfer.effectAllowed = "move"; setDrag(c.a.id); }} onDragEnd={() => { setDrag(null); setOver(null); }}
                  onClick={() => router.push(`/app/accounts/${c.a.id}`)}>
                  <div className="row gap-8"><span className="medium grow ellipsis">{c.a.name}</span><span className={`intent ${lvl.tone}`}><span className="flame"><Flame size={11} /></span>{lvl.label} · {c.score}</span></div>
                  <span className="caption muted">{c.a.deal || c.a.domain || "Add deal details"}</span>
                  <div className="row gap-12 caption muted pipe-stats"><span className="row gap-4"><Eye size={13} />{c.vs.length}</span><span className="row gap-4"><Clock size={13} />{c.secs ? duration(c.secs) : "0m"}</span><span className="row gap-4"><Users size={13} />{c.people.length}</span></div>
                  <div className="row gap-8" style={{ alignItems: "flex-end" }}>
                    <span className="caption muted grow">{c.foot}{c.auto && c.vs.length ? <span className="pipe-auto" title="Stage inferred from activity — drag to set it"> · auto</span> : null}</span>
                    <div className="avatar-stack">{c.people.slice(0, 3).map((e) => <Avatar key={e} email={e} size={26} />)}<button className="avatar pipe-plus" aria-label={`Open ${c.a.name}`} onClick={(e) => { e.stopPropagation(); router.push(`/app/accounts/${c.a.id}`); }}><Plus size={13} /></button></div>
                  </div>
                </article>
              ); })}
              <button className="pipe-add" onClick={() => setAdd({ name: "", domain: "", deal: "", stage: st.id, pipeline: current })}><Plus size={14} />Add</button>
            </section>
          ); })}
        </div>
      )}
      {add && (
        <Modal title="Add account" width={480} onClose={() => setAdd(null)} footer={<><span className="grow" /><button className="btn btn-ghost" onClick={() => setAdd(null)}>Cancel</button><button className="btn btn-dark" onClick={create}>Add account</button></>}>
          <div className="col gap-12">
            <label className="field"><span className="label">Company</span><input className="input" autoFocus value={add.name} onChange={(e) => setAdd({ ...add, name: e.target.value })} placeholder="Northwind Capital" /></label>
            <label className="field"><span className="label">Domain</span><input className="input" value={add.domain} onChange={(e) => setAdd({ ...add, domain: e.target.value })} placeholder="northwind.vc" /><span className="caption faint">Visitors from this domain are matched to the account automatically.</span></label>
            <label className="field"><span className="label">Deal</span><input className="input" value={add.deal} onChange={(e) => setAdd({ ...add, deal: e.target.value })} placeholder="Series A · $2M" /></label>
            <div className="row gap-12">
              <label className="field grow"><span className="label">Stage</span><select className="input" value={add.stage} onChange={(e) => setAdd({ ...add, stage: e.target.value as Stage })}>{STAGES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select></label>
              <label className="field grow"><span className="label">Pipeline</span><input className="input" value={add.pipeline === "Default" ? "" : add.pipeline} onChange={(e) => setAdd({ ...add, pipeline: e.target.value || "Default" })} placeholder="All deals" /></label>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
