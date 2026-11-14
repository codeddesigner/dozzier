"use client";
import { Send, FileText, Download, Eye, MessageSquare } from "lucide-react";

const EV_ICON = { forward: Send, page: FileText, download: Download, open: Eye, question: MessageSquare };

export function Timeline({ events }: { events: { kind: keyof typeof EV_ICON; text: string; sub: string }[] }) {
  if (!events.length) return <p className="caption muted">No activity yet.</p>;
  return (
    <ol className="timeline">
      {events.map((e, i) => { const I = EV_ICON[e.kind]; return (
        <li key={i} style={{ animationDelay: `${i * 60}ms` }}><span className={`tl-dot ${e.kind}`}><I size={13} /></span><div className="col" style={{ minWidth: 0 }}><span style={{ fontSize: 14 }}>{e.text}</span><span className="caption muted">{e.sub}</span></div></li>
      ); })}
    </ol>
  );
}
