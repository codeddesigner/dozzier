"use client";
import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Eye, Clock3, Info, X, Link2, Trash2, Archive, ArrowDown, MoreHorizontal } from "lucide-react";
import { supabase, Account } from "@/lib/supabase";
import { Avatar, DocThumb, Loading, Menu, Tabs, useLoad } from "@/components/ui";
import { displayName, duration, timeAgo } from "@/lib/format";

type V = { id: string; contact_id: string | null; visitor_email: string | null; location: string | null; duration_seconds: number; started_at: string; is_sample: boolean;
  document_id: string | null; link_id: string | null; documents: { name: string; file_type: string } | null; links: { name: string; space_id: string | null } | null };

export default function AccountPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [tab, setTab] = useState<"activity" | "links" | "spaces" | "requests">("activity");
  const [banner, setBanner] = useState(true);
  const { data, loading } = useLoad(async () => {
    const a = await supabase.from("accounts").select("*").eq("id", id).single();
    if (a.error) throw a.error;
    const v = await supabase.from("visits").select("id,contact_id,visitor_email,location,duration_seconds,started_at,is_sample,document_id,link_id,documents(name,file_type),links(name,space_id)").eq("account_id", id).order("started_at", { ascending: false });
    return { account: a.data as Account, visits: (v.data || []) as unknown as V[] };
  }, [id]);

  const people = useMemo(() => {
    const m = new Map<string, { email: string; contact_id: string | null; last: string; loc: string | null; secs: number; n: number; sample: boolean }>();
    (data?.visits || []).forEach((v) => {
      const k = v.visitor_email || "anonymous";
      const g = m.get(k) || { email: k, contact_id: v.contact_id, last: v.started_at, loc: v.location, secs: 0, n: 0, sample: v.is_sample };
      g.secs += v.duration_seconds; g.n++; m.set(k, g);
    });
    return [...m.values()];
  }, [data]);
  const content = useMemo(() => {
    const m = new Map<string, { id: string; name: string; type: string; last: string; n: number }>();
    (data?.visits || []).forEach((v) => { if (!v.document_id) return; const g = m.get(v.document_id) || { id: v.document_id, name: v.documents?.name || "", type: v.documents?.file_type || "file", last: v.started_at, n: 0 }; g.n++; m.set(v.document_id, g); });
    return [...m.values()];
  }, [data]);

  if (loading && !data) return <Loading />;
  if (!data) return <div className="content"><p className="error-text">Account not found.</p></div>;
  const { account, visits } = data;
  const total = visits.reduce((a, v) => a + v.duration_seconds, 0);
  const links = [...new Map(visits.filter((v) => v.link_id).map((v) => [v.link_id, v])).values()];

  return (
    <div className="content">
      {banner && typeof Notification !== "undefined" && Notification.permission === "default" && (
        <div className="banner" style={{ marginBottom: 24 }}><Info size={16} color="#4D94F7" /><span className="grow">Dozzier needs your permission to enable desktop notifications. <button className="semibold" onClick={() => Notification.requestPermission().then(() => setBanner(false))}>Allow</button></span><button className="icon-btn s" onClick={() => setBanner(false)} aria-label="Dismiss"><X size={16} /></button></div>
      )}
      <div className="row gap-12">
        <div className="col grow">
          <div className="row gap-12 wrap"><h1 className="page-title">{account.name}</h1><span className="stat-pill"><Eye size={14} />{visits.length}</span><span className="stat-pill"><Clock3 size={14} />{duration(total)}</span></div>
          <span className="caption muted">{visits[0] ? `Active ${timeAgo(visits[0].started_at).toLowerCase()}` : "No activity yet"}{account.domain ? ` · ${account.domain}` : ""}</span>
        </div>
        <Menu items={[
          { label: "Archive account", icon: <Archive size={14} />, onClick: async () => { await supabase.from("accounts").update({ archived: true }).eq("id", id); router.push("/app/accounts"); } },
          { label: "Delete account", icon: <Trash2 size={14} />, danger: true, onClick: async () => { await supabase.from("accounts").delete().eq("id", id); router.push("/app/accounts"); } },
        ]} />
      </div>
      <div className="mt-24"><Tabs value={tab} onChange={setTab} tabs={[{ id: "activity", label: "Activity" }, { id: "links", label: "Links" }, { id: "spaces", label: "Spaces" }, { id: "requests", label: "File requests" }]} /></div>
      {tab === "activity" && (
        <>
          <h2 className="h1 mt-24" style={{ marginBottom: 12 }}>Visitors</h2>
          <table className="table caps">
            <thead><tr><th>Visitor</th><th className="hide-sm">Last seen</th><th className="hide-sm">Last location</th><th>Total time</th><th>Visits</th></tr></thead>
            <tbody>{people.map((p) => (
              <tr key={p.email} className="clickable" onClick={() => p.contact_id && router.push(`/app/contacts/${p.contact_id}`)}>
                <td><div className="row gap-12"><Avatar email={p.email} size={28} /><div className="col"><span>{displayName(p.email)}</span>{p.sample && <span><span className="tag">Sample contact</span></span>}</div></div></td>
                <td className="hide-sm">{timeAgo(p.last)}</td><td className="hide-sm">{p.loc || "—"}</td><td>{duration(p.secs)}</td><td>{p.n}</td>
              </tr>))}
              {people.length === 0 && <tr><td colSpan={5} className="table-empty">No visitors from this account yet.</td></tr>}
            </tbody>
          </table>
          <h2 className="h1 mt-32" style={{ marginBottom: 12 }}>Content</h2>
          <table className="table">
            <thead><tr><th style={{ width: 40 }} /><th>Name</th><th className="sorted">Updated <ArrowDown size={14} /></th><th>Visits</th><th style={{ width: 40 }} /></tr></thead>
            <tbody>{content.map((c) => (
              <tr key={c.id} className="clickable" onClick={() => router.push(`/app/content/${c.id}`)}><td><DocThumb kind={c.type} /></td><td className="medium">{c.name}</td><td><div className="col"><span>{timeAgo(c.last)}</span><span className="caption faint">Last visited</span></div></td><td>{c.n} visit{c.n === 1 ? "" : "s"}</td><td><MoreHorizontal size={16} /></td></tr>
            ))}{content.length === 0 && <tr><td colSpan={5} className="table-empty">No content viewed.</td></tr>}</tbody>
          </table>
        </>
      )}
      {tab === "links" && (
        <table className="table mt-16"><thead><tr><th>Link</th><th>Content</th><th>Last visit</th></tr></thead>
          <tbody>{links.map((v) => <tr key={v.link_id} className="clickable" onClick={() => router.push(`/app/links/${v.link_id}`)}><td><span className="row gap-8"><Link2 size={14} />{v.links?.name}</span></td><td>{v.documents?.name || "Space"}</td><td>{timeAgo(v.started_at)}</td></tr>)}
            {links.length === 0 && <tr><td colSpan={3} className="table-empty">No links opened.</td></tr>}</tbody></table>
      )}
      {tab === "spaces" && <p className="table-empty">{links.some((v) => v.links?.space_id) ? "This account has opened your data rooms — see Spaces for details." : "This account hasn’t opened any Spaces yet."}</p>}
      {tab === "requests" && <p className="table-empty">No file requests sent to this account.</p>}
    </div>
  );
}
