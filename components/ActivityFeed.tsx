"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { RefreshCw, Settings } from "lucide-react";
import { Avatar, Modal } from "@/components/ui";
import { loadNotes, type Note } from "@/components/NotificationsMenu";
import { timeAgo } from "@/lib/format";

/** Opens the Activity popup from anywhere (sidebar, tab bar, notifications menu). */
export const openActivity = () => window.dispatchEvent(new Event("dz:activity"));

export function ActivityModal({ onClose }: { onClose: () => void }) {
  return <Modal title="Activity" onClose={onClose} width={640}><ActivityFeed onNavigate={onClose} /></Modal>;
}

const FILTERS = ["All", "Live", "Questions", "Uploads", "Hot"] as const;

/** The activity feed (who viewed, questions, uploads…). Used in the Activity popup. */
export function ActivityFeed({ onNavigate }: { onNavigate?: () => void }) {
  const [notes, setNotes] = useState<Note[] | null>(null);
  const [f, setF] = useState<(typeof FILTERS)[number]>("All");
  const [readAt, setReadAt] = useState(0);
  const [spin, setSpin] = useState(false);
  const load = useCallback(async () => { setSpin(true); setNotes(await loadNotes()); setSpin(false); }, []);
  useEffect(() => {
    try { setReadAt(Number(localStorage.getItem("dz-notif-read") || 0)); } catch {}
    load(); const t = setInterval(load, 30000);
    return () => { clearInterval(t); try { localStorage.setItem("dz-notif-read", String(Date.now())); } catch {} };
  }, [load]);
  const live = (notes || []).filter((n) => n.kind === "live").length;
  const list = (notes || []).filter((n) => f === "All" || (f === "Live" && n.kind === "live") || (f === "Questions" && (n.kind === "question" || n.kind === "request")) || (f === "Uploads" && (n.kind === "upload" || n.kind === "reminder")) || (f === "Hot" && n.hot));

  return (
    <div className="inbox">
      <div className="row gap-8"><div className="segmented inbox-filter grow">{FILTERS.map((x) => <button key={x} className={f === x ? "active" : ""} onClick={() => setF(x)}>{x}{x === "Live" && live > 0 && <span className="live-dot" style={{ marginLeft: 6 }} />}</button>)}</div>
        <button className="icon-btn" aria-label="Refresh" onClick={load}><RefreshCw size={16} className={spin ? "spin" : ""} /></button>
        <Link className="icon-btn" aria-label="Notification settings" href="/app/settings/notifications" onClick={onNavigate}><Settings size={16} /></Link></div>
      <div className="inbox-list mt-16">
        {notes === null && <div className="skeleton"><span /><span /><span /></div>}
        {notes && list.length === 0 && <p className="muted" style={{ padding: "24px 4px" }}>{f === "All" ? "Nothing yet. Share a link and activity shows up here in real time." : `No ${f.toLowerCase()} activity right now.`}</p>}
        {list.map((n, i) => {
          const fresh = +new Date(n.at) > readAt;
          return (
            <Link key={n.id} href={n.href} onClick={onNavigate} className={`inbox-item ${fresh ? "unread" : ""}`} style={{ animationDelay: `${Math.min(i, 10) * 30}ms` }}>
              <Avatar email={n.email} name={n.who} size={36} />
              <span className="col grow" style={{ minWidth: 0 }}>
                <span style={{ fontSize: 15 }}>{n.text}</span>
                <span className="caption muted row gap-6">{n.kind === "live" && <span className="row gap-4" style={{ color: "var(--dz-text-success)" }}><span className="live-dot" />Live</span>}{n.kind === "live" ? "Just now" : timeAgo(n.at)}{n.sub ? ` · ${n.sub}` : ""}</span>
              </span>
              {fresh && <span className="notif-unread" />}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
