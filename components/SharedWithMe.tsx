"use client";
import { DocArt } from "@/components/DocArt";
import { supabase } from "@/lib/supabase";
import { Loading, useLoad } from "@/components/ui";
import { timeAgo } from "@/lib/format";

type Row = { slug: string; link_name: string; document_name: string; sender: string; last_visit: string; visits: number };

/** Documents and data rooms other Dozzier workspaces shared with you (shown in Content → Shared with me). */
export function SharedWithMe() {
  const { data, loading } = useLoad(async () => ((await supabase.rpc("shared_with_me")).data || []) as Row[], []);
  if (loading && !data) return <Loading />;
  if (!data?.length) return (
    <div className="ag-empty" style={{ paddingTop: 80 }}>
      <DocArt big />
      <div className="ag-empty-title">When you open an invite, it will appear here</div>
      <p className="muted">Documents and data rooms people share with you show up here.</p>
    </div>
  );
  return (
    <table className="table mt-24">
      <thead><tr><th>Content</th><th>Shared by</th><th>Your visits</th><th>Last opened</th></tr></thead>
      <tbody>{data.map((r) => (
        <tr key={r.slug} className="clickable" onClick={() => window.open(`/v/${r.slug}`, "_blank")}>
          <td className="medium">{r.document_name}</td><td>{r.sender}</td><td>{r.visits}</td><td>{timeAgo(r.last_visit)}</td>
        </tr>))}</tbody>
    </table>
  );
}
