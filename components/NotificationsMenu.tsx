"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Avatar } from "@/components/ui";
import { displayName, intentScore, timeAgo } from "@/lib/format";

type Visit = { id: string; visitor_email: string | null; started_at: string; last_seen_at: string; duration_seconds: number; pages_viewed: number; link_id: string | null; contact_id: string | null; document_id: string | null;
  documents: { name: string; page_count: number } | null; accounts: { name: string } | null };
type Q = { id: string; body: string; page_number: number; created_at: string; asker_email: string | null; contact_id: string | null; documents: { name: string } | null };
type LinkRow = { id: string; name: string; expires_at: string | null };
export type Note = { id: string; kind: "live" | "visit" | "question" | "forward" | "finished" | "expiring" | "upload" | "reminder" | "request"; at: string; who: string; email: string | null; text: string; sub: string; href: string; hot: boolean };

/** Builds the notification feed from visits, questions and links. */
export async function loadNotes(): Promise<Note[]> {
  const since = new Date(Date.now() - 14 * 86400000).toISOString();
  const me = (await supabase.auth.getSession()).data.session?.user.email?.toLowerCase();
  const [v, q, l, fr, fu, sr] = await Promise.all([
    supabase.from("visits").select("id,visitor_email,started_at,last_seen_at,duration_seconds,pages_viewed,link_id,contact_id,document_id,documents(name,page_count),accounts(name)").gte("started_at", since).order("started_at", { ascending: false }).limit(60),
    supabase.from("doc_questions").select("id,body,page_number,created_at,asker_email,contact_id,documents(name)").order("created_at", { ascending: false }).limit(15),
    supabase.from("links").select("id,name,expires_at").not("expires_at", "is", null).gt("expires_at", new Date().toISOString()).lt("expires_at", new Date(Date.now() + 3 * 86400000).toISOString()),
    supabase.from("file_requests").select("id,title,recipients,due_date,remind,notify,status").eq("status", "open"),
    supabase.from("file_request_uploads").select("id,request_id,uploader_email,file_name,created_at").gte("created_at", since).order("created_at", { ascending: false }).limit(20),
    supabase.from("space_requests").select("id,space_id,title,requested_by,created_at").gte("created_at", since).neq("requested_by", "").order("created_at", { ascending: false }).limit(10),
  ]);
  const visits = (v.data || []) as unknown as Visit[];
  const notes: Note[] = [];
  const firstEmailByLink: Record<string, string> = {};
  [...visits].reverse().forEach((x) => { if (x.link_id && x.visitor_email && !firstEmailByLink[x.link_id]) firstEmailByLink[x.link_id] = x.visitor_email; });
  const visitsByEmail: Record<string, number> = {};
  visits.forEach((x) => { const k = x.visitor_email || x.id; visitsByEmail[k] = (visitsByEmail[k] || 0) + 1; });
  for (const x of visits) {
    const who = displayName(x.visitor_email);
    const doc = x.documents?.name || "your document";
    const company = x.accounts?.name || "";
    const href = x.contact_id ? `/app/contacts/${x.contact_id}` : x.document_id ? `/app/content/${x.document_id}` : "/app";
    const live = Date.now() - new Date(x.last_seen_at).getTime() < 120000;
    const hot = intentScore({ seconds: x.duration_seconds, visits: visitsByEmail[x.visitor_email || x.id], downloads: 0 }) >= 70;
    const pages = x.documents?.page_count || 1;
    if (x.link_id && x.visitor_email && firstEmailByLink[x.link_id] && firstEmailByLink[x.link_id] !== x.visitor_email) {
      notes.push({ id: `f-${x.id}`, kind: "forward", at: x.started_at, who, email: x.visitor_email, text: `Your ${doc} was forwarded to ${x.visitor_email}`, sub: company, href, hot });
    } else if (x.pages_viewed >= pages && pages > 1) {
      notes.push({ id: `c-${x.id}`, kind: "finished", at: x.last_seen_at, who, email: x.visitor_email, text: `${who} finished ${doc} (100%)`, sub: company, href, hot });
    } else {
      notes.push({ id: `v-${x.id}`, kind: live ? "live" : "visit", at: live ? x.last_seen_at : x.started_at, who, email: x.visitor_email, text: live ? `${who} is viewing ${doc}` : `${who} opened ${doc}`, sub: company, href, hot });
    }
  }
  for (const x of (q.data || []) as unknown as Q[]) {
    const who = displayName(x.asker_email) || "Anonymous visitor";
    notes.push({ id: `q-${x.id}`, kind: "question", at: x.created_at, who, email: x.asker_email, text: `${who} asked a question on page ${x.page_number}: “${x.body.length > 60 ? x.body.slice(0, 60) + "…" : x.body}”`, sub: x.documents?.name || "", href: x.contact_id ? `/app/contacts/${x.contact_id}?tab=questions` : "/app/contacts", hot: false });
  }
  for (const x of (l.data || []) as LinkRow[]) {
    notes.push({ id: `e-${x.id}`, kind: "expiring", at: new Date().toISOString(), who: x.name, email: null, text: `Link “${x.name}” expires in ${Math.max(1, Math.ceil((new Date(x.expires_at!).getTime() - Date.now()) / 86400000))} day(s)`, sub: "", href: "/app/content", hot: false });
  }
  type FR = { id: string; title: string; recipients: string[]; due_date: string | null; remind: boolean; notify: boolean };
  const reqs = (fr.data || []) as FR[];
  const ups = (fu.data || []) as { id: string; request_id: string; uploader_email: string | null; file_name: string; created_at: string }[];
  for (const u of ups) {
    const r = reqs.find((x) => x.id === u.request_id);
    if (r && !r.notify) continue;
    const who = displayName(u.uploader_email) || "Someone";
    notes.push({ id: `u-${u.id}`, kind: "upload", at: u.created_at, who, email: u.uploader_email, text: `${who} uploaded ${u.file_name}`, sub: r?.title || "File request", href: "/app/file-requests", hot: false });
  }
  for (const r of reqs) {
    if (!r.remind || !r.due_date || !r.recipients.length) continue;
    const days = Math.ceil((new Date(r.due_date + "T23:59:59").getTime() - Date.now()) / 86400000);
    if (days < 0 || days > 2) continue;
    const done = new Set(ups.filter((u) => u.request_id === r.id).map((u) => u.uploader_email));
    const left = r.recipients.filter((e) => !done.has(e)).length;
    if (left) notes.push({ id: `r-${r.id}`, kind: "reminder", at: new Date().toISOString(), who: r.title, email: null, text: `“${r.title}” is due ${days === 0 ? "today" : `in ${days} day${days === 1 ? "" : "s"}`} — ${left} still to upload`, sub: "Send a reminder", href: "/app/file-requests", hot: false });
  }
  for (const x of (sr.data || []) as { id: string; space_id: string; title: string; requested_by: string | null; created_at: string }[]) {
    if (!x.requested_by?.includes("@") || x.requested_by === me) continue;
    const who = displayName(x.requested_by);
    notes.push({ id: `s-${x.id}`, kind: "request", at: x.created_at, who, email: x.requested_by, text: `${who} requested “${x.title}”`, sub: "Data room", href: `/app/spaces/${x.space_id}?tab=requests`, hot: false });
  }
  return notes.sort((a, b) => +new Date(b.at) - +new Date(a.at)).slice(0, 30);
}

const FILTERS = ["All", "Live", "Questions", "Hot"] as const;

export function NotificationsMenu() {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState<Note[] | null>(null);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const [readAt, setReadAt] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const load = useCallback(() => loadNotes().then(setNotes), []);
  useEffect(() => { try { setReadAt(Number(localStorage.getItem("dz-notif-read") || 0)); } catch {} load(); const t = setInterval(load, 60000); return () => clearInterval(t); }, [load]);
  useEffect(() => { if (open) load(); }, [open, load]);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);
  const unread = (notes || []).filter((n) => +new Date(n.at) > readAt).length;
  const markRead = () => { const now = Date.now(); setReadAt(now); try { localStorage.setItem("dz-notif-read", String(now)); } catch {} };
  const list = (notes || []).filter((n) => filter === "All" || (filter === "Live" && n.kind === "live") || (filter === "Questions" && n.kind === "question") || (filter === "Hot" && n.hot));

  return (
    <div style={{ position: "relative" }} ref={ref}>
      <button className="icon-btn hdr-icon" aria-label={`Notifications${unread ? ` (${unread} unread)` : ""}`} onClick={() => setOpen((o) => !o)}>
        <Bell size={18} />{unread > 0 && <span className="notif-dot" />}
      </button>
      {open && (
        <div className="menu notif-menu">
          <div className="row" style={{ padding: "12px 14px 8px" }}><span className="h3 grow">Notifications</span><button className="link caption" onClick={markRead}>Mark all read</button></div>
          <div className="row gap-6" style={{ padding: "0 14px 10px" }}>{FILTERS.map((f) => <button key={f} className={`pill-opt ${filter === f ? "on" : ""}`} style={{ height: 28, fontSize: 13 }} onClick={() => setFilter(f)}>{f}</button>)}</div>
          <div className="notif-list">
            {notes === null && <div className="skeleton" style={{ padding: 14 }}><span /><span /><span /></div>}
            {notes && list.length === 0 && <div className="caption faint" style={{ padding: 16 }}>{filter === "All" ? "Nothing yet. Share a link and activity shows up here." : `No ${filter.toLowerCase()} notifications.`}</div>}
            {list.map((n, i) => {
              const fresh = +new Date(n.at) > readAt;
              return (
                <Link key={n.id} href={n.href} className={`notif-item ${fresh ? "unread" : ""}`} onClick={() => setOpen(false)} style={{ animationDelay: `${Math.min(i, 8) * 30}ms` }}>
                  <Avatar email={n.email} name={n.who} size={28} />
                  <span className="col grow" style={{ minWidth: 0 }}>
                    <span style={{ fontSize: 14 }}>{n.text}</span>
                    <span className="caption muted row gap-6">{n.kind === "live" && <span className="row gap-4" style={{ color: "var(--dz-text-success)" }}><span className="live-dot" />Live</span>}{n.kind === "live" ? "Just now" : timeAgo(n.at)}{n.sub ? ` · ${n.sub}` : ""}</span>
                  </span>
                  {fresh && <span className="notif-unread" />}
                </Link>
              );
            })}
          </div>
          <div className="row notif-foot-row"><Link href="/app/inbox" className="notif-foot grow" onClick={() => setOpen(false)}>Open inbox</Link><Link href="/app/settings/notifications" className="notif-foot grow" onClick={() => setOpen(false)}>Settings</Link></div>
        </div>
      )}
    </div>
  );
}
