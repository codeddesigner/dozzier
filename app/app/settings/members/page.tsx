"use client";
import { useState } from "react";
import Link from "next/link";
import { Plus, Search, X, Mail } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useApp } from "@/components/AppContext";
import { Avatar, Modal, toast, useLoad, Loading } from "@/components/ui";
import { SettingsHead } from "@/components/settings/kit";
import { sendInviteEmails } from "@/lib/invites";

type Inv = { id: string; email: string; role: string; created_at: string; accepted_at: string | null };
type Member = { user_id: string; email: string; role: string; joined_at: string; name?: string | null };
const ROLE_HELP: Record<string, string> = { Admin: "Everything, including members and settings", Editor: "Upload, share and manage content", Viewer: "See content and analytics, can’t change anything" };

export default function Members() {
  const { profile, email, userId, wsId, role: myRole, refreshProfile } = useApp();
  const isOwner = wsId === userId;
  const canAdmin = myRole === "Owner" || myRole === "Admin";
  const { data, loading, reload } = useLoad(async () => {
    const [inv, mem, owner] = await Promise.all([
      supabase.from("invites").select("id,email,role,created_at,accepted_at").is("accepted_at", null).order("created_at"),
      supabase.from("workspace_members").select("user_id,email,role,joined_at").order("joined_at"),
      supabase.from("profiles").select("id,full_name").eq("id", wsId).maybeSingle(),
    ]);
    const members = (mem.data || []) as Member[];
    if (members.length) {
      const { data: ps } = await supabase.from("profiles").select("id,full_name").in("id", members.map((m) => m.user_id));
      members.forEach((m) => { m.name = ps?.find((p) => p.id === m.user_id)?.full_name; });
    }
    return { invites: (inv.data || []) as Inv[], members, ownerName: (owner.data?.full_name as string | null) || null };
  }, [wsId]);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [emails, setEmails] = useState("");
  const [role, setRole] = useState("Editor");
  const [busy, setBusy] = useState(false);
  const term = q.toLowerCase();
  const members = (data?.members || []).filter((m) => m.email.includes(term) || (m.name || "").toLowerCase().includes(term));
  const invites = (data?.invites || []).filter((i) => i.email.includes(term));
  const ws = profile.workspace_name || "our workspace";

  const emailInvites = (list: string[], r: string) => sendInviteEmails(list, r, profile.full_name || email, ws);

  async function invite() {
    const rows = [...new Set(emails.split(/[\s,;]+/).map((e) => e.trim().toLowerCase()).filter((e) => /^\S+@\S+\.\S+$/.test(e) && e !== email.toLowerCase()))].map((e) => ({ email: e, role, accepted_at: null }));
    if (!rows.length) return toast("Add at least one valid email");
    setBusy(true);
    const { error } = await supabase.from("invites").upsert(rows, { onConflict: "owner_id,email" });
    if (error) { setBusy(false); return toast(error.message); }
    const res = await emailInvites(rows.map((r) => r.email), role);
    setBusy(false); setOpen(false); setEmails(""); reload();
    toast(res.failed ? `Saved ${rows.length} invite${rows.length > 1 ? "s" : ""}, but ${res.failed} email${res.failed > 1 ? "s" : ""} failed: ${res.error}` : `Invite${rows.length > 1 ? "s" : ""} sent to ${rows.length} ${rows.length > 1 ? "people" : "person"}`);
  }
  async function setInviteRole(id: string, r: string) { await supabase.from("invites").update({ role: r }).eq("id", id); reload(); }
  async function setMemberRole(id: string, r: string) { const { error } = await supabase.from("workspace_members").update({ role: r }).eq("user_id", id); if (error) return toast(error.message); reload(); toast("Role updated"); }
  async function removeInvite(id: string) { await supabase.from("invites").delete().eq("id", id); reload(); toast("Invite cancelled"); }
  async function removeMember(m: Member) {
    if (!confirm(`Remove ${m.name || m.email} from ${ws}? They’ll lose access to everything shared here.`)) return;
    const { error } = await supabase.from("workspace_members").delete().eq("user_id", m.user_id);
    if (error) return toast(error.message);
    reload(); toast(`${m.name || m.email} removed`);
  }
  async function leave() {
    if (!confirm(`Leave ${ws}? You’ll go back to your own workspace and lose access to this one.`)) return;
    const { error } = await supabase.rpc("leave_workspace");
    if (error) return toast(error.message);
    await refreshProfile(); toast(`You left ${ws}`); window.location.href = "/app";
  }

  return (
    <>
      <SettingsHead title="Members & roles" sub="Who can access this workspace, and what they can do." />
      <div className="row gap-12">
        <label className="search" style={{ width: 240 }}><Search size={16} /><input placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} /></label>
        <span className="spacer" />
        {!isOwner && <button className="btn btn-secondary" onClick={leave}>Leave workspace</button>}
        {canAdmin && <button className="btn btn-primary" onClick={() => setOpen(true)}><Plus size={16} />Invite members</button>}
      </div>
      <section className="set-card" style={{ padding: 0, gap: 0 }}>
        <div className="member-row">
          <Avatar name={isOwner ? profile.full_name : data?.ownerName} email={isOwner ? email : undefined} size={32} color="#ff7a3d" />
          <div className="col grow"><span className="medium">{isOwner ? profile.full_name || email : data?.ownerName || "Workspace owner"}{isOwner && " (you)"}</span><span className="caption muted">{isOwner ? email : ws} · Owner</span></div>
          <span className="role-select" style={{ display: "inline-flex", alignItems: "center", backgroundImage: "none" }}>Owner</span>
        </div>
        {loading && !data ? <Loading /> : (
          <>
            {members.map((m) => (
              <div className="member-row" key={m.user_id}>
                <Avatar name={m.name} email={m.email} size={32} />
                <div className="col grow"><span className="medium">{m.name || m.email.split("@")[0]}{m.user_id === userId && " (you)"}</span><span className="caption muted">{m.email} · Joined {new Date(m.joined_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span></div>
                {canAdmin && m.user_id !== userId
                  ? <select className="role-select" value={m.role} title={ROLE_HELP[m.role]} onChange={(e) => setMemberRole(m.user_id, e.target.value)}><option>Admin</option><option>Editor</option><option>Viewer</option></select>
                  : <span className="role-select" style={{ display: "inline-flex", alignItems: "center", backgroundImage: "none" }}>{m.role}</span>}
                {canAdmin && m.user_id !== userId && <button className="icon-btn s" aria-label={`Remove ${m.email}`} onClick={() => removeMember(m)}><X size={14} /></button>}
              </div>
            ))}
            {invites.map((i) => (
              <div className="member-row" key={i.id}>
                <Avatar email={i.email} size={32} />
                <div className="col grow"><span className="medium">{i.email.split("@")[0]}</span><span className="caption muted">{i.email} · Invited {new Date(i.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span></div>
                <span className="badge badge-warn">Pending</span>
                {canAdmin && <>
                  <button className="icon-btn s" aria-label={`Resend invite to ${i.email}`} title="Resend invite" onClick={async () => { const r = await emailInvites([i.email], i.role); toast(r.failed ? r.error || "Couldn’t send" : `Invite resent to ${i.email}`); }}><Mail size={14} /></button>
                  <select className="role-select" value={i.role} onChange={(e) => setInviteRole(i.id, e.target.value)}><option>Admin</option><option>Editor</option><option>Viewer</option></select>
                  <button className="icon-btn s" aria-label={`Cancel invite to ${i.email}`} onClick={() => removeInvite(i.id)}><X size={14} /></button>
                </>}
              </div>
            ))}
          </>
        )}
        {data && !members.length && !invites.length && q && <div className="caption faint" style={{ padding: 16 }}>No members match “{q}”.</div>}
      </section>
      <p className="caption muted">Everyone in the workspace shares content, links, data rooms, contacts and analytics. <b>Admins</b> manage members and settings, <b>Editors</b> upload and share, <b>Viewers</b> can look but not change anything. Workspace security lives in <Link href="/app/settings/sso" className="link">Security &amp; SSO</Link>.</p>
      {open && (
        <Modal title="Invite members" onClose={() => setOpen(false)} width={480} footer={<><button className="btn btn-ghost" onClick={() => setOpen(false)}>Cancel</button><button className="btn btn-primary" disabled={busy} onClick={invite}>{busy ? "Sending…" : "Send invites"}</button></>}>
          <div className="col gap-12">
            <label className="field"><span className="label">Emails</span><textarea className="input" rows={3} autoFocus value={emails} onChange={(e) => setEmails(e.target.value)} placeholder="stella@company.com, cynthia@company.com" /></label>
            <label className="field"><span className="label">Role</span><select className="input" value={role} onChange={(e) => setRole(e.target.value)}><option>Admin</option><option>Editor</option><option>Viewer</option></select></label>
            <p className="caption muted">{ROLE_HELP[role]}.</p>
          </div>
        </Modal>
      )}
    </>
  );
}
