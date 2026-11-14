"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Calendar, ChevronDown, ChevronRight, Link2, Search, Users, Upload } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useApp } from "@/components/AppContext";
import { Avatar, Kpi, Loading, Tabs, useLoad, DocThumb } from "@/components/ui";
import { LineChart, dailySeries } from "@/components/charts";
import { displayName, duration, timeAgo, intentScore, intentLevel } from "@/lib/format";
import { UploadModal } from "@/components/UploadModal";
import { GettingStarted, useChecklist } from "@/components/GettingStarted";

type V = {
  id: string; visitor_email: string | null; duration_seconds: number; downloaded: boolean; started_at: string; link_id: string | null; document_id: string | null;
  contact_id: string | null; account_id: string | null;
  links: { name: string; space_id: string | null; spaces: { name: string } | null } | null; documents: { name: string; file_type: string } | null;
};

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

export default function Dashboard() {
  const { profile, userId } = useApp();
  const checklist = useChecklist(userId, profile);
  const onboarding = !profile.checklist_dismissed && !!checklist && checklist.some((i) => !i.done);
  const router = useRouter();
  const [days, setDays] = useState(30);
  const [tab, setTab] = useState<"visitors" | "content" | "links" | "spaces" | "chart">("visitors");
  const [q, setQ] = useState("");
  const [upload, setUpload] = useState(false);

  const { data, loading } = useLoad(async () => {
    const since = new Date(Date.now() - days * 2 * 86400000).toISOString();
    const { data, error } = await supabase.from("visits")
      .select("id,visitor_email,duration_seconds,downloaded,started_at,link_id,document_id,contact_id,account_id,links(name,space_id,spaces(name)),documents(name,file_type)")
      .gte("started_at", since).order("started_at", { ascending: false }).limit(2000);
    if (error) throw error;
    return data as unknown as V[];
  }, [days]);

  const cut = Date.now() - days * 86400000;
  const cur = useMemo(() => (data || []).filter((v) => new Date(v.started_at).getTime() >= cut), [data, cut]);
  const prev = useMemo(() => (data || []).filter((v) => new Date(v.started_at).getTime() < cut), [data, cut]);
  const stats = (list: V[]) => ({
    visits: list.length,
    unique: new Set(list.map((v) => v.visitor_email || v.id)).size,
    avg: list.length ? list.reduce((a, v) => a + v.duration_seconds, 0) / list.length : 0,
    downloads: list.filter((v) => v.downloaded).length,
  });
  const s = stats(cur), p = stats(prev);

  const groups = useMemo(() => {
    const key = (v: V) => tab === "visitors" ? (v.visitor_email || "anonymous") : tab === "content" ? (v.document_id || "—") : tab === "links" ? (v.link_id || "—") : (v.links?.space_id || "");
    const m = new Map<string, { key: string; rows: V[] }>();
    for (const v of cur) {
      const k = key(v);
      if (tab === "spaces" && !k) continue;
      if (!m.has(k)) m.set(k, { key: k, rows: [] });
      m.get(k)!.rows.push(v);
    }
    const term = q.toLowerCase();
    return [...m.values()].map((g) => {
      const f = g.rows[0];
      const secs = g.rows.reduce((a, v) => a + v.duration_seconds, 0);
      const dls = g.rows.filter((v) => v.downloaded).length;
      return {
        ...g, first: f, secs, dls, visits: g.rows.length, last: g.rows[0].started_at,
        title: tab === "visitors" ? displayName(f.visitor_email) : tab === "content" ? f.documents?.name || "Deleted" : tab === "links" ? f.links?.name || "—" : f.links?.spaces?.name || "Space",
        sub: tab === "visitors" ? f.visitor_email || "Anonymous visitor" : tab === "content" ? `${new Set(g.rows.map((r) => r.visitor_email)).size} visitors` : f.documents?.name || "",
        score: intentScore({ seconds: secs, visits: g.rows.length, downloads: dls }),
      };
    }).filter((g) => !term || (g.title + " " + g.sub).toLowerCase().includes(term))
      .sort((a, b) => (tab === "visitors" ? +new Date(b.last) - +new Date(a.last) : b.visits - a.visits));
  }, [cur, tab, q]);

  const series = useMemo(() => dailySeries(cur.map((v) => v.started_at), days), [cur, days]);
  const first = (profile.full_name || "").split(" ")[0];

  return (
    <div className="content">
      <div className="muted body-m">{onboarding ? `Welcome to Dozzier${first ? `, ${first}` : ""}` : `${greeting()}${first ? `, ${first}` : ""}`}</div>
      <div className="row gap-12 wrap"><h1 className="page-title grow">{onboarding ? "Let’s get your first link out" : "See what’s new"}</h1><button className="btn btn-dark" onClick={() => setUpload(true)}><Upload size={16} />Upload</button></div>
      {onboarding && <GettingStarted onUpload={() => setUpload(true)} />}
      <div className="row gap-8 mt-24">
        <label className="chip"><Calendar size={16} />
          <select value={days} onChange={(e) => setDays(+e.target.value)} aria-label="Date range">
            <option value={7}>Last 7 days</option><option value={30}>Last 30 days</option><option value={90}>Last 90 days</option>
          </select><ChevronDown size={14} /></label>
        <span className="chip"><Users size={16} />Team visits</span>
      </div>
      {loading && !data ? <Loading /> : (
        <>
          <div className="kpis mt-24">
            <Kpi label="Total visits" value={s.visits} cur={s.visits} prev={p.visits} />
            <Kpi label="Unique visitors" value={s.unique} cur={s.unique} prev={p.unique} />
            <Kpi label="Avg. time per visit" value={duration(s.avg)} cur={s.avg} prev={p.avg} />
            <Kpi label="Downloads" value={s.downloads} cur={s.downloads} prev={p.downloads} />
          </div>
          <div className="mt-24"><Tabs value={tab} onChange={setTab} tabs={[{ id: "visitors", label: "Visitor activity" }, { id: "content", label: "Popular content" }, { id: "links", label: "Top groups & links" }, { id: "spaces", label: "Top Spaces" }, { id: "chart", label: "Visit chart" }]} /></div>
          {tab === "chart" ? (
            <div className="card mt-24" style={{ padding: 24 }}>
              <div className="h2" style={{ marginBottom: 16 }}>Visits per day</div>
              <LineChart points={series.points} labels={series.labels} />
            </div>
          ) : (
            <>
              <div className="row gap-8 mt-24" style={{ justifyContent: "flex-end" }}>
                <div className="search"><Search size={16} /><input placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} /></div>
              </div>
              <table className="table mt-16">
                <thead><tr>
                  <th style={{ width: 24 }} /><th>{tab === "visitors" ? "Name" : tab === "content" ? "Content" : tab === "links" ? "Link" : "Space"}</th>
                  {tab === "visitors" && <th className="hide-sm">Space or link visited</th>}
                  <th>Visits</th><th className="hide-sm">Downloads</th><th>Time spent</th><th className="hide-sm">Intent</th><th>Last visit</th>
                </tr></thead>
                <tbody>
                  {groups.length === 0 && <tr><td colSpan={8} className="table-empty">No visits in this period yet. Create a link from <Link className="brand" href="/app/content">Content</Link> and share it.</td></tr>}
                  {groups.map((g) => {
                    const lvl = intentLevel(g.score);
                    const href = tab === "visitors" ? (g.first.contact_id ? `/app/contacts/${g.first.contact_id}` : null) : tab === "content" ? `/app/content/${g.key}` : tab === "links" ? `/app/links/${g.key}` : `/app/spaces/${g.key}`;
                    return (
                      <tr key={g.key} className="clickable" onClick={() => href && router.push(href)}>
                        <td><ChevronRight size={16} className="faint" /></td>
                        <td><div className="row gap-12">
                          {tab === "content" ? <DocThumb kind={g.first.documents?.file_type || "file"} /> : <Avatar name={g.title} email={tab === "visitors" ? g.first.visitor_email : undefined} size={32} />}
                          <div className="col" style={{ minWidth: 0 }}><span className="medium ellipsis">{g.title}</span><span className="caption muted ellipsis">{g.sub}</span></div></div></td>
                        {tab === "visitors" && <td className="hide-sm"><span className="row gap-6"><Link2 size={14} />{g.first.links?.name || g.first.documents?.name}</span></td>}
                        <td>{g.visits}</td><td className="hide-sm">{g.dls}</td><td>{duration(g.secs)}</td>
                        <td className="hide-sm"><span className={`intent ${lvl.tone}`}>{lvl.label} · {g.score}</span></td>
                        <td className="nowrap">{timeAgo(g.last)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </>
          )}
        </>
      )}
      {upload && <UploadModal onClose={() => setUpload(false)} onDone={(ids) => { setUpload(false); router.push(`/app/content/${ids[0]}`); }} />}
    </div>
  );
}
