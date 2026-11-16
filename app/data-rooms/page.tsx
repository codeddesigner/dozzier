import type { Metadata } from "next";
import { Users, FileLock2, ListChecks, MessageSquareText, ScrollText, History, TrendingUp, FileSearch, LayoutGrid, Share2, Folder, Image as ImageIcon, ChevronDown } from "lucide-react";
import { SiteNav, SiteCta, SiteFooter, PageHero, CardGrid } from "@/components/marketing/Chrome";

export const metadata: Metadata = { title: "Data rooms | Dozzier", description: "Share hundreds of files under one secure link, control access by group, and track every request and question in one place." };

function RoomPreview() {
  const folders: [string, string, string][] = [["01 · Corporate structure", "8 files", "All groups"], ["02 · Financials", "9 files", "Investors · Board"], ["03 · Material contracts", "14 files", "Legal only"], ["04 · IP & product", "8 files", "Investors"]];
  return (
    <div className="mk-room" data-reveal>
      <div className="mk-room-card">
        <div className="banner-anim mk-room-banner"><span className="mk-room-tag">Preview</span></div>
        <div className="mk-room-body">
          <span className="mk-room-img"><ImageIcon size={26} /></span>
          <div className="col gap-6" style={{ paddingTop: 44 }}>
            <span className="mk-room-title">Investor due diligence</span>
            <span className="row gap-8 muted" style={{ fontSize: 14 }}>Subtitle · Last updated 1d ago <span className="badge badge-success">Active <ChevronDown size={12} /></span></span>
            <span className="row">{[["Ab", "#ff5a5a"], ["Pa", "#3b8bff"], ["Cy", "#ff4f8b"]].map(([t, c]) => <span key={t} className="avatar" style={{ width: 30, height: 30, fontSize: 11, background: c, marginRight: -4, border: "2px solid #fff" }}>{t}</span>)}<span className="avatar" style={{ width: 24, height: 24, background: "#fff", border: "1px solid var(--dz-border-default)", color: "#111827", fontSize: 14, marginLeft: 6 }}>+</span></span>
          </div>
        </div>
      </div>
      <div className="mk-folders">
        {folders.map(([n, c, g]) => <div key={n} className="row gap-10"><Folder size={16} className="brand" /><span className="medium grow">{n}</span><span className="caption muted">{c}</span><span className="mk-tag">{g}</span></div>)}
      </div>
    </div>
  );
}

export default function DataRooms() {
  return (
    <main>
      <SiteNav active="/data-rooms" />
      <PageHero pill="Virtual data rooms" title="Data rooms that run diligence for you" sub="Share hundreds of files under one secure link, control access by group, and track every request and question in one place." />
      <div className="mk-panel blue"><RoomPreview /></div>
      <CardGrid overline="Built for diligence" title="Everything a deal room needs" cards={[
        [Users, "Group permissions", "Give investors, legal and the board different access to the same room."],
        [FileLock2, "NDA & watermarks", "Require an NDA before entry and stamp every page with the viewer’s details."],
        [ListChecks, "Request tracker", "Track diligence requests with owners, due dates and status."],
        [MessageSquareText, "Q&A", "Visitors ask questions on any file; answers stay with the room."],
        [ScrollText, "Full audit log", "Every view, download and permission change — exportable."],
        [History, "Version control", "Replace files without breaking links and notify past viewers."],
      ]} />
      <CardGrid tint={false} cols={2} overline="Use cases" title="One room, many deals" cards={[
        [TrendingUp, "Fundraising", "Share your deck, model and cap table with investors — and see who’s serious."],
        [FileSearch, "M&A", "Run sell-side diligence with buyers in separate, permissioned groups."],
        [LayoutGrid, "Board reporting", "Publish board packs and keep a permanent record of who read what."],
        [Share2, "Enterprise sales", "Give buyers one room with security docs, proposals and contracts."],
      ]} />
      <SiteCta />
      <SiteFooter />
    </main>
  );
}
