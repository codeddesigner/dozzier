"use client";
import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ChevronRight, Info, X } from "lucide-react";
import { supabase, Link as LinkT } from "@/lib/supabase";
import { Avatar, Loading, useLoad } from "@/components/ui";
import { LinksTable, VisitRow, V, PV } from "@/components/DocTables";
import { LinkModal } from "@/components/LinkModal";
import { useApp } from "@/components/AppContext";

export default function LinkPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { profile, email } = useApp();
  const [edit, setEdit] = useState(false);
  const [banner, setBanner] = useState(true);
  const { data, loading, reload } = useLoad(async () => {
    const l = await supabase.from("links").select("*, documents(id,name,page_count), spaces(id,name)").eq("id", id).single();
    if (l.error) throw l.error;
    const v = await supabase.from("visits").select("id,link_id,contact_id,visitor_email,location,duration_seconds,pages_viewed,downloaded,is_sample,started_at").eq("link_id", id).order("started_at", { ascending: false });
    const ids = (v.data || []).map((x) => x.id);
    const pv = ids.length ? await supabase.from("page_views").select("visit_id,page_number,seconds").in("visit_id", ids) : { data: [] };
    return { link: l.data as LinkT & { documents: { id: string; name: string; page_count: number } | null; spaces: { id: string; name: string } | null }, visits: (v.data || []) as V[], pages: (pv.data || []) as PV[] };
  }, [id]);

  if (loading && !data) return <Loading />;
  if (!data) return <div className="content"><p className="error-text">Link not found.</p></div>;
  const { link, visits, pages } = data;
  const parent = link.documents ? { href: `/app/content/${link.documents.id}`, name: link.documents.name } : link.spaces ? { href: `/app/spaces/${link.spaces.id}`, name: link.spaces.name } : null;

  return (
    <div className="content">
      {banner && typeof Notification !== "undefined" && Notification.permission === "default" && (
        <div className="banner" style={{ marginBottom: 24 }}><Info size={16} color="#0061fe" /><span className="grow">Dozzier needs your permission to enable desktop notifications. <button className="semibold" onClick={() => Notification.requestPermission().then(() => setBanner(false))}>Allow</button></span>
          <button className="icon-btn s" onClick={() => setBanner(false)} aria-label="Dismiss"><X size={16} /></button></div>
      )}
      <div className="row gap-8 wrap">
        <div className="row gap-6 grow body-m"><Link href={link.documents ? "/app/content" : "/app/spaces"} className="muted">{link.documents ? "My Content" : "Spaces"}</Link><ChevronRight size={14} className="faint" />
          {parent && <><Link href={parent.href} className="muted">{parent.name}</Link><ChevronRight size={14} className="faint" /></>}<span className="semibold">{link.name}</span></div>
        <span className="muted">Owned by</span><Avatar name={profile.full_name} email={email} size={32} />
      </div>
      <div className="mt-24"><LinksTable links={[link]} visitCounts={{ [link.id]: visits.length }} lastVisit={{ [link.id]: visits[0]?.started_at }} onChange={() => { reload(); }} onEdit={() => setEdit(true)} /></div>
      <h2 className="h1 mt-32" style={{ marginBottom: 16 }}>Visits to this link</h2>
      <table className="table caps">
        <thead><tr><th>Visitor</th><th className="hide-sm">Link</th><th className="hide-sm" /><th>Time</th><th /></tr></thead>
        <tbody>
          {visits.length === 0 && <tr><td colSpan={5} className="table-empty">Nobody has opened this link yet.</td></tr>}
          {visits.map((v) => <VisitRow key={v.id} v={v} pages={pages.filter((p) => p.visit_id === v.id)} pageCount={link.documents?.page_count || 1} linkName={link.name} onOpen={() => router.push(`/app/contacts/${v.contact_id}`)} />)}
        </tbody>
      </table>
      {edit && <LinkModal existing={link} onClose={() => setEdit(false)} onSaved={() => { setEdit(false); reload(); }} />}
    </div>
  );
}
