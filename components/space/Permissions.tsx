"use client";
import { useState } from "react";
import { Folder, Download, Eye, EyeOff, Droplets, Plus, Trash2, ChevronDown, UserPlus } from "lucide-react";
import { supabase, SpaceItem } from "@/lib/supabase";
import { Avatar, Menu, Modal, toast, useLoad } from "@/components/ui";
import { useApp } from "@/components/AppContext";
import { displayName } from "@/lib/format";
import { audit, Group, LEVELS, Level, levelLabel, Member, Perm } from "@/lib/space";

const ICON = { download: Download, view: Eye, view_watermark: Droplets, hidden: EyeOff };

function LevelPick({ value, onChange }: { value: Level; onChange: (l: Level) => void }) {
  const [open, setOpen] = useState<{ x: number; y: number } | null>(null);
  const I = ICON[value];
  return (
    <span>
      <button className={`perm-pill ${value}`} onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); const up = r.bottom + 190 > window.innerHeight; setOpen((o) => (o ? null : { x: r.left, y: up ? r.top - 188 : r.bottom + 4 })); }} onBlur={() => setTimeout(() => setOpen(null), 150)}><I size={14} />{levelLabel(value)}<ChevronDown size={13} /></button>
      {open && <div className="menu" style={{ position: "fixed", top: open.y, left: open.x, right: "auto", zIndex: 90, minWidth: 180, transformOrigin: "top left" }}>
        {LEVELS.map((l) => { const LI = ICON[l.id]; return <button key={l.id} className={`menu-item ${l.id === value ? "active" : ""}`} onMouseDown={(e) => e.preventDefault()} onClick={() => { onChange(l.id); setOpen(null); }}><LI size={14} />{l.label}</button>; })}
      </div>}
    </span>
  );
}

export function Permissions({ spaceId, folders, defaultLevel, onInvite }: { spaceId: string; folders: SpaceItem[]; defaultLevel: Level; onInvite: () => void }) {
  const { email } = useApp();
  const { data, reload } = useLoad(async () => {
    const [g, m] = await Promise.all([
      supabase.from("space_groups").select("*").eq("space_id", spaceId).order("position"),
      supabase.from("space_members").select("*").eq("space_id", spaceId).order("created_at"),
    ]);
    const groups = (g.data || []) as Group[];
    const p = groups.length ? await supabase.from("space_perms").select("group_id,item_id,level").in("group_id", groups.map((x) => x.id)) : { data: [] };
    return { groups, members: (m.data || []) as Member[], perms: (p.data || []) as Perm[] };
  }, [spaceId]);
  const [newGroup, setNewGroup] = useState<string | null>(null);
  if (!data) return <div className="skeleton mt-24"><span /><span /><span /></div>;
  const { groups, members, perms } = data;
  const lv = (g: string, i: string) => perms.find((p) => p.group_id === g && p.item_id === i)?.level || defaultLevel;

  async function setLevel(g: Group, f: SpaceItem, l: Level) {
    await supabase.from("space_perms").upsert({ group_id: g.id, item_id: f.id, level: l });
    audit(spaceId, email, `Changed ${g.name} → ${f.name} to ${levelLabel(l)}`, "permission", f.id);
    reload();
  }
  async function addGroup() {
    if (!newGroup?.trim()) return;
    await supabase.from("space_groups").insert({ space_id: spaceId, name: newGroup.trim(), position: groups.length });
    audit(spaceId, email, `Created group “${newGroup.trim()}”`, "permission");
    setNewGroup(null); reload();
  }

  return (
    <div className="mt-24">
      <div className="card perm-table">
        <table className="table">
          <thead><tr><th>Folder</th>{groups.map((g) => (
            <th key={g.id}><span className="row gap-4">{g.name}<span className="caption faint">({members.filter((m) => m.group_id === g.id).length})</span>
              <Menu items={[{ label: "Rename", onClick: async () => { const n = prompt("Group name", g.name); if (n?.trim()) { await supabase.from("space_groups").update({ name: n.trim() }).eq("id", g.id); reload(); } } },
                { label: "Delete group", danger: true, icon: <Trash2 size={14} />, onClick: async () => { await supabase.from("space_groups").delete().eq("id", g.id); audit(spaceId, email, `Deleted group “${g.name}”`, "permission"); reload(); } }]} /></span></th>
          ))}<th style={{ width: 120 }}><button className="btn btn-ghost btn-s" onClick={() => setNewGroup("")}><Plus size={14} />Group</button></th></tr></thead>
          <tbody>
            {folders.length === 0 && <tr><td colSpan={groups.length + 2} className="table-empty">Add folders in Content to set who sees what.</td></tr>}
            {folders.map((f) => (
              <tr key={f.id}><td><span className="row gap-10"><Folder size={18} fill="#a9c4fb" color="#a9c4fb" /><span className="medium">{f.name}</span></span></td>
                {groups.map((g) => <td key={g.id}><LevelPick value={lv(g.id, f.id)} onChange={(l) => setLevel(g, f, l)} /></td>)}<td /></tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="caption faint mt-8">Folders without a setting use the Space default ({levelLabel(defaultLevel)}). Visitors who aren’t members of a group get the default too.</p>

      <div className="row mt-32" style={{ marginBottom: 12 }}><span className="h2 grow">Members</span><button className="btn btn-secondary btn-s" onClick={onInvite}><UserPlus size={14} />Invite people</button></div>
      <div className="card">
        {members.length === 0 && <div className="table-empty" style={{ padding: 24 }}>No members yet. Invite people to place them in a group.</div>}
        {members.map((m) => (
          <div className="member-row" key={m.id}>
            <Avatar email={m.email} name={m.name} size={36} />
            <div className="col grow" style={{ minWidth: 0 }}><span className="medium">{m.name || displayName(m.email)}</span><span className="caption muted ellipsis">{m.email} · {groups.find((g) => g.id === m.group_id)?.name || "No group"}</span></div>
            <select className="input select-s" value={m.group_id || ""} aria-label="Group" onChange={async (e) => { await supabase.from("space_members").update({ group_id: e.target.value || null }).eq("id", m.id); audit(spaceId, email, `Moved ${m.email} to ${groups.find((g) => g.id === e.target.value)?.name || "no group"}`, "permission"); reload(); }}>
              <option value="">No group</option>{groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</select>
            <select className="input select-s" value={m.role} aria-label="Role" onChange={async (e) => { await supabase.from("space_members").update({ role: e.target.value }).eq("id", m.id); reload(); }}>
              <option value="viewer">Viewer</option><option value="editor">Editor</option></select>
            <Menu items={[{ label: "Remove from Space", danger: true, icon: <Trash2 size={14} />, onClick: async () => { await supabase.from("space_members").delete().eq("id", m.id); audit(spaceId, email, `Removed ${m.email}`, "permission"); toast("Member removed"); reload(); } }]} />
          </div>
        ))}
      </div>
      {newGroup !== null && (
        <Modal title="New group" width={420} onClose={() => setNewGroup(null)} footer={<><span className="grow" /><button className="btn btn-ghost" onClick={() => setNewGroup(null)}>Cancel</button><button className="btn btn-dark" onClick={addGroup}>Create group</button></>}>
          <input className="input" autoFocus placeholder="e.g. Co-investors" value={newGroup} onChange={(e) => setNewGroup(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addGroup()} />
        </Modal>
      )}
    </div>
  );
}
