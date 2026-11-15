"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, Users, Archive, Trash2, ArchiveRestore } from "lucide-react";
import { supabase, Contact } from "@/lib/supabase";
import { Avatar, Loading, Menu, Modal, toast, useLoad } from "@/components/ui";
import { displayName, timeAgo } from "@/lib/format";

export default function Contacts() {
  const router = useRouter();
  const [filter, setFilter] = useState<"personal" | "team" | "archived">("personal");
  const [q, setQ] = useState("");
  const [add, setAdd] = useState(false);
  const { data, loading, reload } = useLoad(async () => {
    const [c, v] = await Promise.all([
      supabase.from("contacts").select("*").order("created_at", { ascending: false }),
      supabase.from("visits").select("contact_id,started_at").not("contact_id", "is", null).order("started_at", { ascending: false }),
    ]);
    const stats: Record<string, { n: number; last: string }> = {};
    (v.data || []).forEach((x) => { const s = (stats[x.contact_id!] ||= { n: 0, last: x.started_at }); s.n++; });
    return { contacts: (c.data || []) as Contact[], stats };
  }, []);

  const list = useMemo(() => (data?.contacts || []).filter((c) =>
    (filter === "archived" ? c.archived : !c.archived && c.scope === filter) &&
    (!q || `${c.name} ${c.email}`.toLowerCase().includes(q.toLowerCase())))
    .sort((a, b) => +new Date(data!.stats[b.id]?.last || b.created_at) - +new Date(data!.stats[a.id]?.last || a.created_at)), [data, filter, q]);

  async function update(c: Contact, patch: Partial<Contact>) { await supabase.from("contacts").update(patch).eq("id", c.id); reload(); }

  return (
    <div className="content">
      <div className="page-head"><h1 className="page-title">Contacts</h1><span className="stat-pill"><Users size={14} />{data?.contacts.filter((c) => !c.archived).length ?? "–"}</span><span className="spacer" />
        <button className="btn btn-dark" onClick={() => setAdd(true)}><Plus size={16} />Add contact</button></div>
      <div className="row gap-8 wrap list-filters">
        {(["personal", "team", "archived"] as const).map((f) => <button key={f} className={`chip ${filter === f ? "active" : ""}`} onClick={() => setFilter(f)}>{f[0].toUpperCase() + f.slice(1)}</button>)}
        <span className="spacer" /><div className="search"><Search size={16} /><input placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      </div>
      {loading && !data ? <Loading /> : (
        <table className="table list-table">
          <thead><tr><th>Name</th><th className="hide-sm">Last activity</th><th>Visits</th><th className="hide-sm">Tags</th><th style={{ width: 40 }} /></tr></thead>
          <tbody>
            {list.length === 0 && <tr><td colSpan={5} className="table-empty">No contacts here. Visitors who enter their email on your links are added automatically.</td></tr>}
            {list.map((c) => (
              <tr key={c.id} className="clickable" onClick={() => router.push(`/app/contacts/${c.id}`)}>
                <td><div className="row gap-12"><Avatar name={displayName(c.email, c.name)} email={c.email} size={32} />
                  <div className="col"><span className="medium">{displayName(c.email, c.name)}</span><span className="caption muted">{c.email}</span>{c.account_id && <span><span className="tag">1 account</span></span>}</div></div></td>
                <td className="hide-sm">{data!.stats[c.id] ? timeAgo(data!.stats[c.id].last) : "—"}</td>
                <td>{data!.stats[c.id]?.n || 0} visit{data!.stats[c.id]?.n === 1 ? "" : "s"}</td>
                <td className="hide-sm"><div className="row gap-4 wrap">{c.tags.map((t) => <span key={t} className="badge badge-brand">{t}</span>)}</div></td>
                <td><Menu items={[
                  c.archived ? { label: "Unarchive", icon: <ArchiveRestore size={14} />, onClick: () => update(c, { archived: false }) } : { label: "Archive", icon: <Archive size={14} />, onClick: () => update(c, { archived: true }) },
                  { label: c.scope === "team" ? "Move to Personal" : "Share with team", icon: <Users size={14} />, onClick: () => update(c, { scope: c.scope === "team" ? "personal" : "team" }) },
                  { label: "Delete", icon: <Trash2 size={14} />, danger: true, onClick: async () => { await supabase.from("contacts").delete().eq("id", c.id); toast("Contact deleted"); reload(); } },
                ]} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {add && <AddContact onClose={() => setAdd(false)} onDone={() => { setAdd(false); reload(); }} />}
    </div>
  );
}

function AddContact({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [f, setF] = useState({ name: "", email: "", title: "", tags: "" });
  const [err, setErr] = useState<string | null>(null);
  async function save() {
    const email = f.email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email)) return setErr("Enter a valid email");
    const domain = email.split("@")[1];
    let account_id: string | null = null;
    if (!/^(gmail|yahoo|outlook|hotmail|icloud|proton|aol|live)\./.test(domain)) {
      const a = await supabase.from("accounts").upsert({ name: domain.split(".")[0].replace(/^./, (c) => c.toUpperCase()), domain }, { onConflict: "owner_id,domain" }).select("id").single();
      account_id = a.data?.id || null;
    }
    const { error } = await supabase.from("contacts").insert({ name: f.name.trim() || null, email, title: f.title.trim() || null, account_id, tags: f.tags.split(",").map((t) => t.trim()).filter(Boolean) });
    if (error) return setErr(error.message.includes("duplicate") ? "You already have a contact with this email" : error.message);
    toast("Contact added"); onDone();
  }
  return (
    <Modal title="Add contact" onClose={onClose} width={480} footer={<><span className="grow" /><button className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-dark" onClick={save}>Add contact</button></>}>
      <div className="col gap-12">
        {([["name", "Name", "Paul"], ["email", "Email", "paul@randombase.com"], ["title", "Title", "Account Executive"], ["tags", "Tags (comma separated)", "Investor"]] as const).map(([k, l, ph]) => (
          <label key={k} className="field"><span className="label">{l}</span><input className="input" placeholder={ph} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} /></label>
        ))}
        {err && <p className="error-text">{err}</p>}
      </div>
    </Modal>
  );
}
