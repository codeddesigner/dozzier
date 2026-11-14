"use client";
import { useState } from "react";
import { Copy, Mail, Check } from "lucide-react";
import { supabase, Space } from "@/lib/supabase";
import { Avatar, Modal, copy, toast, useLoad } from "@/components/ui";
import { useApp } from "@/components/AppContext";
import { displayName } from "@/lib/format";
import { linkUrlOf } from "@/components/LinkReady";
import { audit, Group, spaceLink } from "@/lib/space";

const RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;

export function InviteModal({ space, onClose }: { space: Space; onClose: () => void }) {
  const { email: me, profile } = useApp();
  const { data: groups } = useLoad(async () => ((await supabase.from("space_groups").select("*").eq("space_id", space.id).order("position")).data || []) as Group[], [space.id]);
  const [raw, setRaw] = useState("");
  const [group, setGroup] = useState("");
  const [role, setRole] = useState<"viewer" | "editor">("viewer");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ emails: string[]; slug: string } | null>(null);
  const emails = [...new Set((raw.match(RE) || []).map((e) => e.toLowerCase()))];
  const g = group || groups?.[0]?.id || "";
  const sender = profile.full_name || displayName(me);

  async function invite() {
    if (!emails.length) return toast("Add at least one email");
    setBusy(true);
    const r = await supabase.from("space_members").upsert(emails.map((e) => ({ space_id: space.id, email: e, group_id: g || null, role })), { onConflict: "space_id,email" });
    if (r.error) { setBusy(false); return toast(r.error.message); }
    const slug = await spaceLink(space).catch(() => "");
    const gname = groups?.find((x) => x.id === g)?.name;
    audit(space.id, me, `Invited ${emails.length === 1 ? emails[0] : `${emails.length} people`}${gname ? ` to ${gname}` : ""}`, "permission");
    setBusy(false); setDone({ emails, slug });
  }

  if (done) {
    const body = (e: string) => `Hi ${displayName(e).split(" ")[0]},\n\n${note ? note + "\n\n" : ""}You’ve been given access to “${space.name}”: ${linkUrlOf(done.slug)}?email=${encodeURIComponent(e)}\n\nBest,\n${sender}`;
    const subject = `${sender} invited you to ${space.name}`;
    return (
      <Modal title="People added" onClose={onClose} width={520} footer={<><span className="grow" /><button className="btn btn-primary" onClick={onClose}>Done</button></>}>
        <div className="col gap-12">
          <div className="lr-hero"><span className="lr-check"><Check size={18} /></span><span className="col"><span className="medium">{done.emails.length} {done.emails.length === 1 ? "person" : "people"} can now enter</span><span className="caption muted">Send each one their personal link — their visits are tracked by name.</span></span></div>
          {done.emails.map((e) => (
            <div key={e} className="row gap-10 member-row" style={{ padding: "8px 0" }}><Avatar email={e} size={28} /><span className="grow ellipsis">{e}</span>
              <button className="icon-btn s" aria-label="Copy link" onClick={() => copy(`${linkUrlOf(done.slug)}?email=${encodeURIComponent(e)}`, "Personal link copied")}><Copy size={14} /></button>
              <a className="btn btn-secondary btn-s" href={`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(e)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body(e))}`} target="_blank" rel="noreferrer"><Mail size={14} />Gmail</a>
              <a className="btn btn-ghost btn-s" href={`mailto:${e}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body(e))}`}>Mail app</a></div>
          ))}
        </div>
      </Modal>
    );
  }
  return (
    <Modal title={`Invite people to ${space.name}`} onClose={onClose} width={520} footer={<><span className="grow caption faint">{emails.length ? `${emails.length} email${emails.length === 1 ? "" : "s"}` : ""}</span><button className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-dark" disabled={busy || !emails.length} onClick={invite}>{busy ? "Adding…" : "Invite"}</button></>}>
      <div className="col gap-12">
        <label className="field"><span className="label">Emails</span><textarea className="input" rows={3} autoFocus value={raw} onChange={(e) => setRaw(e.target.value)} placeholder="daniel@acmevc.com, sarah@acmevc.com" /></label>
        <div className="row gap-12">
          <label className="field grow"><span className="label">Group</span><select className="input" value={g} onChange={(e) => setGroup(e.target.value)}>{(groups || []).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}<option value="">No group (Space defaults)</option></select></label>
          <label className="field" style={{ width: 150 }}><span className="label">Role</span><select className="input" value={role} onChange={(e) => setRole(e.target.value as "viewer" | "editor")}><option value="viewer">Viewer</option><option value="editor">Editor</option></select></label>
        </div>
        <label className="field"><span className="label">Message (optional)</span><textarea className="input" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Here’s everything for diligence — shout if anything’s missing." /></label>
        <span className="caption faint">Group permissions decide which folders they see. Editors are tracked like viewers today; edit access for guests is coming.</span>
      </div>
    </Modal>
  );
}
