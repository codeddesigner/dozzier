"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ChevronRight, Flame, Mail, Trash2, Link2 } from "lucide-react";
import { supabase, Contact } from "@/lib/supabase";
import { Avatar, DocThumb, Loading, Menu, Tabs, toast, useLoad } from "@/components/ui";
import { displayName, duration, timeAgo, intentScore, intentLevel } from "@/lib/format";

type V = { id: string; document_id: string | null; link_id: string | null; duration_seconds: number; downloaded: boolean; pages_viewed: number; location: string | null; started_at: string;
  documents: { name: string; file_type: string } | null; links: { name: string } | null };

export default function ContactPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [tab, setTab] = useState<"content" | "activity" | "links" | "details">("content");
  const { data, loading, reload } = useLoad(async () => {
    const c = await supabase.from("contacts").select("*, accounts(id,name)").eq("id", id).single();
    if (c.error) throw c.error;
    const v = await supabase.from("visits").select("id,document_id,link_id,duration_seconds,downloaded,pages_viewed,location,started_at,documents(name,file_type),links(name)").eq("contact_id", id).order("started_at", { ascending: false });
    return { contact: c.data as Contact & { accounts: { id: string; name: string } | null }, visits: (v.data || []) as unknown as V[] };
  }, [id]);

  const byDoc = useMemo(() => {
    const m = new Map<string, { id: string; name: string; type: string; last: string; secs: number; n: number }>();
    (data?.visits || []).forEach((v) => {
      const k = v.document_id || "none";
      const g = m.get(k) || { id: k, name: v.documents?.name || "Space", type: v.documents?.file_type || "file", last: v.started_at, secs: 0, n: 0 };
      g.secs += v.duration_seconds; g.n++; m.set(k, g);
    });
    return [...m.values()];
  }, [data]);
  const [form, setForm] = useState<{ name: string; title: string; tags: string } | null>(null);

  if (loading && !data) return <Loading />;
  if (!data) return <div className="content"><p className="error-text">Contact not found.</p></div>;
  const { contact: c, visits } = data;
  const score = intentScore({ seconds: visits.reduce((a, v) => a + v.duration_seconds, 0), visits: visits.length, downloads: visits.filter((v) => v.downloaded).length, pages: Math.max(0, ...visits.map((v) => v.pages_viewed)) });
  const lvl = intentLevel(score);
  const f = form || { name: c.name || "", title: c.title || "", tags: c.tags.join(", ") };
  const links = [...new Map(visits.filter((v) => v.link_id).map((v) => [v.link_id, v])).values()];

  return (
    <div className="content">
      <div className="row gap-6 body-m"><Link href="/app/contacts" className="muted">Contacts</Link><ChevronRight size={14} className="faint" /><span className="semibold">{displayName(c.email, c.name)}</span></div>
      <div className="row gap-16 mt-24" style={{ alignItems: "flex-start" }}>
        <Avatar name={displayName(c.email, c.name)} email={c.email} size={56} />
        <div className="col gap-4 grow">
          <div className="row gap-12"><span className="page-title" style={{ fontSize: 28 }}>{displayName(c.email, c.name)}</span><span className={`intent ${lvl.tone}`} style={{ fontSize: 13 }}><Flame size={12} />{lvl.label} · {score} intent</span></div>
          <span className="muted body-m">{c.email}</span>
          {c.title && <span className="muted body-m">{c.title}{c.accounts ? ` at ${c.accounts.name}` : ""}</span>}
          {c.accounts && <Link href={`/app/accounts/${c.accounts.id}`} className="brand body-m">{c.accounts.name}</Link>}
        </div>
        <a className="icon-btn" href={`mailto:${c.email}`} aria-label="Email"><Mail size={18} /></a>
        <Menu items={[{ label: "Delete contact", icon: <Trash2 size={14} />, danger: true, onClick: async () => { await supabase.from("contacts").delete().eq("id", c.id); router.push("/app/contacts"); } }]} />
      </div>
      <div className="mt-24"><Tabs value={tab} onChange={setTab} tabs={[{ id: "content", label: "Content" }, { id: "activity", label: "Visit activity" }, { id: "links", label: "Links" }, { id: "details", label: "Details" }]} /></div>
      {tab === "content" && (
        <table className="table mt-16">
          <thead><tr><th>Content</th><th>Time spent</th><th>Visits</th></tr></thead>
          <tbody>
            {byDoc.length === 0 && <tr><td colSpan={3} className="table-empty">{displayName(c.email, c.name)} hasn’t viewed anything yet.</td></tr>}
            {byDoc.map((d) => (
              <tr key={d.id} className="clickable" onClick={() => d.id !== "none" && router.push(`/app/content/${d.id}`)}>
                <td><div className="row gap-12"><DocThumb kind={d.type} /><div className="col"><span className="medium">{d.name}</span><span className="caption muted">Last visited {timeAgo(d.last).toLowerCase()}</span></div></div></td>
                <td>{duration(d.secs)}</td><td>{d.n}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {tab === "activity" && (
        <table className="table mt-16">
          <thead><tr><th>Visit</th><th className="hide-sm">Location</th><th>Pages</th><th>Time</th></tr></thead>
          <tbody>{visits.map((v) => (
            <tr key={v.id}><td><div className="col"><span className="medium">{v.documents?.name || "Space"} {v.downloaded && <span className="badge badge-brand">Downloaded</span>}</span><span className="caption muted">{new Date(v.started_at).toLocaleString()}</span></div></td>
              <td className="hide-sm muted">{v.location || "—"}</td><td>{v.pages_viewed}</td><td>{duration(v.duration_seconds)}</td></tr>
          ))}</tbody>
        </table>
      )}
      {tab === "links" && (
        <table className="table mt-16"><thead><tr><th>Link</th><th>First opened</th></tr></thead>
          <tbody>{links.map((v) => <tr key={v.link_id} className="clickable" onClick={() => router.push(`/app/links/${v.link_id}`)}><td><span className="row gap-8"><Link2 size={14} />{v.links?.name}</span></td><td>{timeAgo(v.started_at)}</td></tr>)}
            {links.length === 0 && <tr><td colSpan={2} className="table-empty">No links opened.</td></tr>}</tbody></table>
      )}
      {tab === "details" && (
        <div className="col gap-12 mt-24" style={{ maxWidth: 480 }}>
          <label className="field"><span className="label">Name</span><input className="input" value={f.name} onChange={(e) => setForm({ ...f, name: e.target.value })} /></label>
          <label className="field"><span className="label">Title</span><input className="input" value={f.title} onChange={(e) => setForm({ ...f, title: e.target.value })} /></label>
          <label className="field"><span className="label">Tags</span><input className="input" value={f.tags} onChange={(e) => setForm({ ...f, tags: e.target.value })} placeholder="Investor, Lead" /></label>
          <div><button className="btn btn-dark" onClick={async () => { await supabase.from("contacts").update({ name: f.name || null, title: f.title || null, tags: f.tags.split(",").map((t) => t.trim()).filter(Boolean) }).eq("id", c.id); toast("Contact saved"); setForm(null); reload(); }}>Save</button></div>
        </div>
      )}
    </div>
  );
}
