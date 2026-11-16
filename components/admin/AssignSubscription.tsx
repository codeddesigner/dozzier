"use client";
import { useEffect, useState } from "react";
import { Modal, toast } from "@/components/ui";
import { adminRpc, day } from "@/lib/admin";

type Hit = { id: string; email: string; full_name: string | null; workspace_name: string | null; plan: string; member_of: string | null };
const PLANS: [string, string][] = [["standard", "Standard"], ["datarooms", "Data Rooms"], ["personal", "Personal"]];
const LENGTHS: [string, string][] = [["1", "1 month"], ["3", "3 months"], ["6", "6 months"], ["12", "12 months"], ["24", "24 months"], ["", "No end date"]];

/** Admin: give an account's workspace a plan without Paystack, optionally until a date. */
export function AssignSubscription({ account, onClose, onDone }: { account?: { id: string; email: string; isMember?: boolean }; onClose: () => void; onDone: () => void }) {
  const [who, setWho] = useState(account || null);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [plan, setPlan] = useState("standard");
  const [months, setMonths] = useState("12");
  const [seats, setSeats] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (who || q.trim().length < 2) { setHits([]); return; }
    const t = setTimeout(() => adminRpc<{ rows: Hit[] }>("admin_users", { p_q: q.trim(), p_limit: 6 }).then((r) => setHits(r.rows || [])).catch(() => setHits([])), 250);
    return () => clearTimeout(t);
  }, [q, who]);

  const until = months ? new Date(Date.now() + Number(months) * 30.44 * 86400000) : null;
  async function save() {
    if (!who) return;
    setBusy(true);
    try {
      await adminRpc("admin_assign_subscription", { p_id: who.id, p_plan: plan, p_months: months ? Number(months) : null, p_seats: seats ? Number(seats) : null, p_note: note.trim() || null });
      toast(`${PLANS.find(([k]) => k === plan)![1]} assigned to ${who.email}`);
      onDone();
    } catch (e) { toast((e as Error).message); }
    setBusy(false);
  }

  return (
    <Modal title="Assign subscription" onClose={onClose} width={480}
      footer={<><span className="grow" /><button className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={busy || !who} onClick={save}>{busy ? "Assigning…" : "Assign"}</button></>}>
      <div className="col gap-12">
        {who ? (
          <div className="row gap-8"><span className="grow"><span className="caption muted">Account</span><br /><span className="medium">{who.email}</span></span>
            {!account && <button className="btn btn-ghost btn-s" onClick={() => { setWho(null); setQ(""); }}>Change</button>}</div>
        ) : (
          <div className="col gap-6">
            <label className="field"><span className="label">Account</span><input className="input" autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by email, name or workspace" /></label>
            {hits.map((h) => (
              <button key={h.id} className="adm-pick" onClick={() => setWho({ id: h.id, email: h.email, isMember: !!h.member_of })}>
                <span className="col grow" style={{ minWidth: 0, textAlign: "left" }}><span className="medium ellipsis">{h.email}</span><span className="caption muted ellipsis">{h.workspace_name || h.full_name || "—"}{h.member_of ? " · team member" : ""}</span></span>
                <span className="badge badge-muted">{h.plan}</span>
              </button>
            ))}
            {q.trim().length >= 2 && !hits.length && <span className="caption muted">No matching accounts. They need to sign up first.</span>}
          </div>
        )}
        {who?.isMember && <p className="caption muted" style={{ margin: 0 }}>This person is a member of someone else’s workspace, so the plan goes on that workspace.</p>}
        <div className="row gap-12">
          <label className="field grow"><span className="label">Plan</span><select className="input" value={plan} onChange={(e) => setPlan(e.target.value)}>{PLANS.map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
          <label className="field grow"><span className="label">Length</span><select className="input" value={months} onChange={(e) => setMonths(e.target.value)}>{LENGTHS.map(([k, v]) => <option key={v} value={k}>{v}</option>)}</select></label>
        </div>
        {plan !== "personal" && <label className="field"><span className="label">Seats (optional)</span><input className="input" type="number" min={1} max={1000} value={seats} onChange={(e) => setSeats(e.target.value)} placeholder={plan === "datarooms" ? "3 included" : "Leave blank for no seat record"} /></label>}
        <label className="field"><span className="label">Note (kept in the admin log)</span><input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Design partner, free for a year" /></label>
        <p className="caption muted" style={{ margin: 0 }}>No card is charged. {until ? `The plan ends on ${day(until.toISOString())} and the workspace is asked to pick a paid plan.` : "The plan stays until you end it."} You can end it any time from their account page.</p>
      </div>
    </Modal>
  );
}
