import { X, Link2, Copy, Mail, Download, Lock, Calendar, FileCheck2, FileText, Users, ScanEye, Bell, Folder, Eye } from "lucide-react";

/** "Create link" panel figure used in articles (Figma: Article page). */
export function LinkSettingsFigure() {
  const rows: [typeof Mail, string, string, boolean][] = [
    [Mail, "Require email to view", "Visitors verify their email before the document opens.", true],
    [Download, "Allow downloads", "Let visitors download a PDF copy.", false],
    [Lock, "Require passcode", "Share a passcode separately for extra protection.", false],
    [Calendar, "Link expiration", "Disable this link on Dec 31, 2026 at 11:59 PM.", true],
    [FileCheck2, "Dynamic watermark", "Stamp each page with the viewer’s email, time and IP.", true],
    [FileText, "Require NDA", "Visitors e-sign your agreement before viewing.", false],
    [Users, "Allow or block visitors", "Only people @randombase.com can open this link.", true],
    [ScanEye, "Screenshot protection", "Blur content when the window loses focus.", false],
    [Bell, "Notify me on every visit", "Real-time email + Slack alert with page analytics.", true],
  ];
  return (
    <figure className="doc-figure">
      <div className="fig-panel" data-reveal="scale">
        <div className="row"><span className="semibold">Create link</span><span className="spacer" /><X size={14} /></div>
        <div className="fig-label">Link name</div>
        <div className="fig-input">Randombase — Series A</div>
        <div className="fig-url"><Link2 size={11} /><span className="grow">dozzier.io/v/randombase-series-a</span><Copy size={11} /></div>
        <div className="fig-tabs">{["Access", "Security", "Branding", "Notifications"].map((t, i) => <span key={t} className={i === 0 ? "on" : ""}>{t}</span>)}</div>
        {rows.map(([I, t, d, on], i) => (
          <div className="fig-row" key={t} style={{ ["--i" as string]: i }}>
            <span className="fig-ico"><I size={12} /></span>
            <div className="grow"><div className="fig-t">{t}</div><div className="fig-d">{d}</div></div>
            <span className={`toggle ${on ? "on" : ""}`} style={{ transform: "scale(.72)" }} />
          </div>
        ))}
        <div className="fig-foot"><span className="grow">Changes apply to this link only</span><span className="medium">Cancel</span><span className="btn btn-primary btn-s" style={{ height: 24, fontSize: 11 }}>Create link</span></div>
      </div>
    </figure>
  );
}

export function SpacePermissionsFigure() {
  const groups = [["Lead investors", "All folders", true], ["Legal", "Contracts, Cap table", true], ["Co-investors", "Pitch deck only", false]] as const;
  return (
    <figure className="doc-figure">
      <div className="fig-panel" data-reveal="scale" style={{ width: 420 }}>
        <div className="semibold">Groups & permissions</div>
        {groups.map(([g, f, dl], i) => (
          <div className="fig-row" key={g} style={{ ["--i" as string]: i }}>
            <span className="fig-ico"><Folder size={12} /></span>
            <div className="grow"><div className="fig-t">{g}</div><div className="fig-d">{f}</div></div>
            <span className="caption faint">{dl ? "Download" : "View only"}</span>
          </div>
        ))}
      </div>
    </figure>
  );
}

export function VisitorTimelineFigure() {
  const rows = [["Paul", "#3b8bff", "Pitch deck · 7 of 18 pages", "4m 12s"], ["Cynthia", "#ff4f8b", "Forwarded to 2 partners", "1m 06s"], ["Stella", "#14c7b0", "Term sheet.pdf · downloaded", "4m 13s"]];
  return (
    <figure className="doc-figure">
      <div className="fig-panel" data-reveal="scale" style={{ width: 440 }}>
        <div className="semibold">Visitor activity</div>
        {rows.map(([n, c, d, t], i) => (
          <div className="fig-row" key={n} style={{ ["--i" as string]: i }}>
            <span className="avatar" style={{ width: 24, height: 24, fontSize: 10, background: c }}>{n.slice(0, 2)}</span>
            <div className="grow"><div className="fig-t">{n}</div><div className="fig-d">{d}</div></div>
            <span className="caption faint row gap-6"><Eye size={11} />{t}</span>
          </div>
        ))}
      </div>
    </figure>
  );
}
