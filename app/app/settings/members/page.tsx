"use client";
import { useState } from "react";
import Link from "next/link";
import { Plus, Search, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useApp } from "@/components/AppContext";
import { Avatar, Modal, toast, useLoad, Loading } from "@/components/ui";
import { SettingsHead } from "@/components/settings/kit";

type Inv = { id: string; email: string; role: string; created_at: string };

export default function Members() {
  const { profile, email } = useApp();
  const { data, loading, reload } = useLoad(async () => (await supabase.from("invites").select("id,email,role,created_at").order("created_at")).data as Inv[] || [], []);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [emails, setEmails] = useState("");
  const [role, setRole] = useState("Editor");
  const term = q.toLowerCase();
  const list = (data || []).filter((i) => i.email.includes(term));

  async function invite() {
    const rows = emails.split(/[\s,;]+/).map((e) => e.trim().toLowerCase()).filter((e) => /^\S+@\S+\.\S+$/.test(e)).map((e) => ({ email: e, role }));
    if (!rows.length) return toast("Add at least one valid email");
    const { error } = await supabase.from("invites").upsert(rows, { onConflict: "owner_id,email" });
    if (error) return toast(error.message);
    setOpen(false); setEmails(""); reload(); toast(`${rows.length} invite${rows.length > 1 ? "s" : ""} saved — email delivery isn’t connected yet`);
  }
  async function setRoleFor(id: string, r: string) { await supabase.from("invites").update({ role: r }).eq("id", id); reload(); }
  async function remove(id: string) { await supabase.from("invites").delete().eq("id", id); reload(); toast("Invite removed"); }

  return (
    <>
      <SettingsHead title="Members & roles" sub="Who can access this workspace, and what they can do." />
      <div className="row gap-12">
        <label className="search" style={{ width: 240 }}><Search size={16} /><input placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} /></label>
        <span className="spacer" />
        <button className="btn btn-primary" onClick={() => setOpen(true)}><Plus size={16} />Invite members</button>
      </div>
      <section className="set-card" style={{ padding: 0, gap: 0 }}>
        <div className="member-row">
          <Avatar name={profile.full_name} email={email} size={32} color="#ff7a3d" />
          <div className="col grow"><span className="medium">{profile.full_name || email}</span><span className="caption muted">{email} · Owner</span></div>
          <span className="tag">{profile.job_role || "Owner"}</span><span className="role-select" style={{ display: "inline-flex", alignItems: "center", backgroundImage: "none" }}>Admin</span>
        </div>
        {loading && !data ? <Loading /> : list.map((i) => (
          <div className="member-row" key={i.id}>
            <Avatar email={i.email} size={32} />
            <div className="col grow"><span className="medium">{i.email.split("@")[0]}</span><span className="caption muted">{i.email} · Invited</span></div>
            <span className="badge badge-warn">Pending</span>
            <select className="role-select" value={i.role} onChange={(e) => setRoleFor(i.id, e.target.value)}><option>Admin</option><option>Editor</option><option>Viewer</option></select>
            <button className="icon-btn s" aria-label={`Remove ${i.email}`} onClick={() => remove(i.id)}><X size={14} /></button>
          </div>
        ))}
        {data && !list.length && q && <div className="caption faint" style={{ padding: 16 }}>No members match “{q}”.</div>}
      </section>
      <p className="caption muted">Invited teammates join when team workspaces open up; their invites are saved here. Workspace security lives in <Link href="/app/settings/sso" className="link">Security &amp; SSO</Link>.</p>
      {open && (
        <Modal title="Invite members" onClose={() => setOpen(false)} width={480} footer={<><button className="btn btn-ghost" onClick={() => setOpen(false)}>Cancel</button><button className="btn btn-primary" onClick={invite}>Send invites</button></>}>
          <div className="col gap-12">
            <label className="field"><span className="label">Emails</span><textarea className="input" rows={3} autoFocus value={emails} onChange={(e) => setEmails(e.target.value)} placeholder="stella@company.com, cynthia@company.com" /></label>
            <label className="field"><span className="label">Role</span><select className="input" value={role} onChange={(e) => setRole(e.target.value)}><option>Admin</option><option>Editor</option><option>Viewer</option></select></label>
          </div>
        </Modal>
      )}
    </>
  );
}
