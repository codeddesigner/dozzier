"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, House } from "lucide-react";
import { supabase, Space } from "@/lib/supabase";
import { Loading, useLoad, Empty } from "@/components/ui";
import { TemplatePicker } from "@/components/SpacePicker";
import { timeAgo } from "@/lib/format";

export default function Spaces() {
  const router = useRouter();
  const [picker, setPicker] = useState(false);
  useEffect(() => { if (new URLSearchParams(window.location.search).get("new")) setPicker(true); }, []);
  const { data, loading } = useLoad(async () => {
    const [s, i, l] = await Promise.all([
      supabase.from("spaces").select("*").order("updated_at", { ascending: false }),
      supabase.from("space_items").select("space_id"),
      supabase.from("links").select("space_id").not("space_id", "is", null),
    ]);
    const items: Record<string, number> = {}; (i.data || []).forEach((x) => (items[x.space_id] = (items[x.space_id] || 0) + 1));
    const links: Record<string, number> = {}; (l.data || []).forEach((x) => x.space_id && (links[x.space_id] = (links[x.space_id] || 0) + 1));
    return { spaces: (s.data || []) as Space[], items, links };
  }, []);

  return (
    <div className="content">
      <div className="page-head"><h1 className="page-title grow">Spaces</h1><button className="btn btn-dark" onClick={() => setPicker(true)}><Plus size={16} />Create a Space</button></div>
      {loading && !data ? <Loading /> : data!.spaces.length === 0 ? (
        <Empty art={<House size={40} className="brand" />} title="Create your first data room" body="Spaces bundle many documents behind one secure link — perfect for fundraising, M&A and client portals.">
          <button className="btn btn-dark" onClick={() => setPicker(true)}>Create a Space</button>
        </Empty>
      ) : (
        <div className="grid-3 mt-24" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 20 }}>
          {data!.spaces.map((s) => (
            <button key={s.id} className="card" style={{ textAlign: "left", overflow: "hidden" }} onClick={() => router.push(`/app/spaces/${s.id}`)}>
              <div style={{ height: 96, background: s.banner }} />
              <div style={{ padding: 16 }}>
                <div className="row gap-8"><span className="h3 grow ellipsis">{s.name}</span><span className="badge badge-success">{s.status === "active" ? "Active" : s.status}</span></div>
                <div className="caption muted mt-8">{data!.items[s.id] || 0} items · {data!.links[s.id] || 0} links · Updated {timeAgo(s.updated_at)}</div>
              </div>
            </button>
          ))}
        </div>
      )}
      {picker && <TemplatePicker onClose={() => setPicker(false)} />}
    </div>
  );
}
