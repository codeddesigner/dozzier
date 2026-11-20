"use client";
import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Ban, CalendarPlus, Trash2, RotateCcw, ExternalLink, Gift } from "lucide-react";
import { Avatar, Loading, Modal, toast, useLoad } from "@/components/ui";
import { adminRpc, bytes, day, PLAN_LABEL } from "@/lib/admin";
import { AssignSubscription } from "@/components/admin/AssignSubscription";
import { timeAgo } from "@/lib/format";

type Detail = {
  user: { id: string; email: string; created_at: string; last_sign_in_at: string | null; confirmed: boolean } | null;
  profile: { full_name: string | null; workspace_name: string | null; plan: string; subscription_status: string | null; billing_customer: string | null; billing_subscription: string | null; billing_seats: number | null; comp_ends_at: string | null; comp_note: string | null;
    suspended_at: string | null; suspended_reason: string | null; trial_ends_at: string | null; created_at: string; job_role: string | null; team_size: string | null } | null;
  workspace_owner: { id: string; email: string } | null;
  members: { user_id: string; email: string; role: string; joined_at: string }[];
  invites: { email: string; role: string; accepted: boolean }[];
  domains: { domain: string; status: string }[];
  counts: { documents: number; links: number; spaces: number; visits: number; storage_bytes: number };
  links: { id: string; name: string; slug: string; enabled: boolean; created_at: string; visits: number }[];
  audit: { admin_email: string; action: string; detail: Record<string, unknown> | null; at: string }[];
};

export default function AdminUser() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data, loading, reload } = useLoad(() => adminRpc<Detail>("admin_user", { p_id: id }), [id]);
  const [modal, setModal] = useState<null | "plan" | "trial" | "suspend" | "delete" | "assign">(null);
  const [plan, setPlan] = useState("standard");
  const [note, setNote] = useState("");
  const [days, setDays] = useState(14);
  const [confirmEmail, setConfirmEmail] = useState("");
  const [busy, setBusy] = useState(false);

  if (loading && !data) return <Loading />;
  if (!data?.user) return <p className="muted">Account not found.</p>;
  const { user, profile: p, counts } = data;
  const trialEnd = p?.trial_ends_at || (p ? new Date(new Date(p.created_at).getTime() + 14 * 86400000).toISOString() : null);

  async function act(fn: string, args: Record<string, unknown>, ok: string, after?: () => void) {
    setBusy(true);
    try { await adminRpc(fn, args); toast(ok); setModal(null); setNote(""); after ? after() : reload(); }
    catch (e) { toast((e as Error).message); }
    setBusy(false);
  }

  return (
    <>
      <Link href="/admin/users" className="row gap-6 caption muted"><ArrowLeft size={14} />All accounts</Link>
      <div className="adm-head">
        <Avatar name={p?.full_name} email={user.email} size={44} />
        <div className="col grow" style={{ minWidth: 0 }}>
          <h1 className="ellipsis">{p?.full_name || user.email}</h1>
          <span className="muted">{user.email}{p?.workspace_name ? ` · ${p.workspace_name}` : ""}</span>
        </div>
        {p?.suspended_at
          ? <button className="btn btn-secondary" disabled={busy} onClick={() => act("admin_suspend", { p_id: id, p_suspend: false }, "Account restored")}><RotateCcw size={15} />Restore</button>
          : <button className="btn btn-secondary" onClick={() => setModal("suspend")}><Ban size={15} />Suspend</button>}
        <button className="btn btn-primary" onClick={() => setModal("assign")}><Gift size={15} />Assign subscription</button>
        <button className="btn btn-secondary" onClick={() => { setPlan(p?.plan === "trial" ? "standard" : p?.plan || "standard"); setModal("plan"); }}>Change plan</button>
        <button className="btn btn-secondary" onClick={() => setModal("trial")}><CalendarPlus size={15} />Extend trial</button>
        <button className="btn btn-danger" onClick={() => setModal("delete")}><Trash2 size={15} />Delete</button>
      </div>
      {p?.suspended_at && <div className="callout" style={{ background: "var(--dz-bg-danger-subtle)", color: "var(--dz-text-danger)", padding: "10px 14px", borderRadius: 10 }}>Suspended {timeAgo(p.suspended_at)}{p.suspended_reason ? ` — ${p.suspended_reason}` : ""}. Their links don’t open and they can’t use the app.</div>}

      <div className="adm-kpis">
        {([["Documents", counts.documents], ["Links", counts.links], ["Data rooms", counts.spaces], ["Visits", counts.visits], ["Storage", bytes(counts.storage_bytes)]] as const).map(([l, v]) => <div key={l} className="adm-kpi"><b>{v}</b><span>{l}</span></div>)}
      </div>

      <div className="adm-grid2">
        <div className="adm-card"><span className="medium">Account</span>
          <dl className="adm-dl">
            <dt>Joined</dt><dd>{day(user.created_at)}</dd>
            <dt>Last sign-in</dt><dd>{user.last_sign_in_at ? timeAgo(user.last_sign_in_at) : "Never"}</dd>
            <dt>Email confirmed</dt><dd>{user.confirmed ? "Yes" : "No"}</dd>
            <dt>Role / team size</dt><dd>{[p?.job_role, p?.team_size].filter(Boolean).join(" · ") || "—"}</dd>
            {data.workspace_owner && <><dt>Member of</dt><dd><Link className="link" href={`/admin/users/${data.workspace_owner.id}`}>{data.workspace_owner.email}’s workspace</Link></dd></>}
          </dl>
        </div>
        <div className="adm-card"><span className="medium">Plan &amp; billing</span>
          <dl className="adm-dl">
            <dt>Plan</dt><dd>{PLAN_LABEL[p?.plan || "trial"] || p?.plan}</dd>
            {p?.plan === "trial" && <><dt>Trial ends</dt><dd>{day(trialEnd)}</dd></>}
            <dt>Subscription</dt><dd>{p?.subscription_status === "comped" ? "Assigned by admin" : p?.subscription_status || "None"}{p?.billing_seats ? ` · ${p.billing_seats} seats` : ""}</dd>
            {p?.subscription_status === "comped" && <><dt>Assigned until</dt><dd className="row gap-8">{p.comp_ends_at ? day(p.comp_ends_at) : "No end date"}<button className="btn btn-ghost btn-s" disabled={busy} onClick={() => { if (confirm("End this assigned plan now? The workspace will be asked to choose a paid plan.")) act("admin_end_subscription", { p_id: id }, "Assigned plan ended"); }}>End now</button></dd>
              {p.comp_note && <><dt>Note</dt><dd>{p.comp_note}</dd></>}</>}
            <dt>Stripe customer</dt><dd>{p?.billing_customer ? <a className="link row gap-4" target="_blank" rel="noreferrer" href={`https://dashboard.stripe.com/customers/${p.billing_customer}`}>{p.billing_customer}<ExternalLink size={12} /></a> : "—"}</dd>
            <dt>Subscription code</dt><dd>{p?.billing_subscription || "—"}</dd>
          </dl>
        </div>
        <div className="adm-card"><span className="medium">Team</span>
          {!data.members.length && !data.invites.length && <span className="caption muted">Just the owner.</span>}
          {data.members.map((m) => <div key={m.user_id} className="row gap-8"><Link className="link grow ellipsis" href={`/admin/users/${m.user_id}`}>{m.email}</Link><span className="badge badge-muted">{m.role}</span></div>)}
          {data.invites.filter((i) => !i.accepted).map((i) => <div key={i.email} className="row gap-8"><span className="grow ellipsis muted">{i.email}</span><span className="badge badge-warn">Invited · {i.role}</span></div>)}
        </div>
        <div className="adm-card"><span className="medium">Custom domains</span>
          {!data.domains.length && <span className="caption muted">None.</span>}
          {data.domains.map((d) => <div key={d.domain} className="row gap-8"><span className="grow">{d.domain}</span><span className={`badge ${d.status === "active" ? "badge-success" : "badge-warn"}`}>{d.status === "active" ? "Live" : "Waiting for DNS"}</span></div>)}
        </div>
      </div>

      <div className="adm-card" style={{ paddingBottom: 0 }}><span className="medium">Recent links</span>
        <table className="table">
          <thead><tr><th>Link</th><th>Visits</th><th>Created</th><th>Status</th><th /></tr></thead>
          <tbody>
            {!data.links.length && <tr><td colSpan={5} className="table-empty">No links yet.</td></tr>}
            {data.links.map((l) => (
              <tr key={l.id}>
                <td><div className="col"><span className="medium">{l.name}</span><a className="caption link" href={`/v/${l.slug}`} target="_blank" rel="noreferrer">/v/{l.slug}</a></div></td>
                <td>{l.visits}</td><td className="muted">{day(l.created_at)}</td>
                <td>{l.enabled ? <span className="badge badge-success">On</span> : <span className="badge badge-muted">Off</span>}</td>
                <td><button className="btn btn-ghost btn-s" disabled={busy} onClick={() => act("admin_set_link", { p_link: l.id, p_enabled: !l.enabled }, l.enabled ? "Link turned off" : "Link turned on")}>{l.enabled ? "Turn off" : "Turn on"}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data.audit.length > 0 && (
        <div className="adm-card"><span className="medium">Admin actions on this account</span>
          {data.audit.map((a, i) => <div key={i} className="row gap-8 caption"><span className="grow">{a.action.replace(/_/g, " ")}{a.detail ? ` — ${Object.entries(a.detail).filter(([, v]) => v != null).map(([k, v]) => `${k}: ${v}`).join(", ")}` : ""}</span><span className="muted">{a.admin_email} · {timeAgo(a.at)}</span></div>)}
        </div>
      )}

      {modal === "plan" && (
        <Modal title="Change plan" onClose={() => setModal(null)} width={440} footer={<><span className="grow" /><button className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button><button className="btn btn-primary" disabled={busy} onClick={() => act("admin_set_plan", { p_id: id, p_plan: plan, p_note: note || null }, `Plan set to ${PLAN_LABEL[plan]}`)}>Save</button></>}>
          <div className="col gap-12">
            <label className="field"><span className="label">Plan</span><select className="input" value={plan} onChange={(e) => setPlan(e.target.value)}>{Object.entries(PLAN_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
            <label className="field"><span className="label">Reason (kept in the admin log)</span><input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Comped for beta feedback" /></label>
            {p?.billing_subscription && <p className="caption muted">This workspace pays through Stripe. Changing the plan here doesn’t change what Stripe charges; the next payment event can set it back.</p>}
          </div>
        </Modal>
      )}
      {modal === "assign" && <AssignSubscription account={{ id, email: user.email, isMember: !!data.workspace_owner }} onClose={() => setModal(null)} onDone={() => { setModal(null); reload(); }} />}
      {modal === "trial" && (
        <Modal title="Extend trial" onClose={() => setModal(null)} width={420} footer={<><span className="grow" /><button className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button><button className="btn btn-primary" disabled={busy} onClick={() => act("admin_extend_trial", { p_id: id, p_days: days }, `Trial extended by ${days} days`)}>Extend</button></>}>
          <div className="col gap-12">
            <label className="field"><span className="label">Add days</span><input className="input" type="number" min={1} max={365} value={days} onChange={(e) => setDays(Number(e.target.value))} /></label>
            <p className="caption muted">Puts the account on the trial plan. Current end: {day(trialEnd)}.</p>
          </div>
        </Modal>
      )}
      {modal === "suspend" && (
        <Modal title="Suspend account" onClose={() => setModal(null)} width={460} footer={<><span className="grow" /><button className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button><button className="btn btn-danger-solid" disabled={busy || note.trim().length < 3} onClick={() => act("admin_suspend", { p_id: id, p_suspend: true, p_reason: note.trim() }, "Account suspended")}>Suspend</button></>}>
          <div className="col gap-12">
            <p className="muted">They’ll be signed out of the app and every link they’ve shared stops opening. Nothing is deleted, and you can restore it any time.</p>
            <label className="field"><span className="label">Reason (shown to them and kept in the log)</span><input className="input" autoFocus value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Phishing documents reported" /></label>
          </div>
        </Modal>
      )}
      {modal === "delete" && (
        <Modal title="Delete account permanently" onClose={() => setModal(null)} width={480} footer={<><span className="grow" /><button className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button><button className="btn btn-danger-solid" disabled={busy || confirmEmail.trim().toLowerCase() !== user.email.toLowerCase()} onClick={() => act("admin_delete_user", { p_id: id, p_confirm_email: confirmEmail }, "Account deleted", () => router.push("/admin/users"))}>Delete forever</button></>}>
          <div className="col gap-12">
            <p className="muted">This deletes the account and everything it owns — documents, links, data rooms, contacts and analytics. It can’t be undone. Uploaded files stay in storage until removed in Supabase.{p?.billing_subscription ? " Cancel their Stripe subscription first so they aren’t charged again." : ""}</p>
            <label className="field"><span className="label">Type <b>{user.email}</b> to confirm</span><input className="input" value={confirmEmail} onChange={(e) => setConfirmEmail(e.target.value)} /></label>
          </div>
        </Modal>
      )}
    </>
  );
}
