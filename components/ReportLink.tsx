"use client";
import { useState } from "react";
import { Flag } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Modal, toast } from "@/components/ui";

const REASONS = ["Phishing or scam", "Malware or virus", "Harassment or hate", "Copyright or trademark", "Illegal content", "Something else"];

/** Viewer toolbar button: lets a visitor report a shared link to Dozzier's admins. */
export function ReportLink({ email }: { email?: string | null }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState(REASONS[0]);
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  async function send() {
    setBusy(true);
    const slug = decodeURIComponent(window.location.pathname.split("/").filter(Boolean).pop() || "");
    const { error } = await supabase.from("link_reports").insert({ slug, reason, details: details.trim() || null, reporter_email: email || null });
    setBusy(false);
    if (error) return toast("Couldn’t send the report. Email abuse@dozzier.co instead.");
    setOpen(false); setDetails(""); toast("Thanks — our team will review this link.");
  }
  return (
    <>
      <button className="vb-icon hide-sm" aria-label="Report this link" title="Report this link" onClick={() => setOpen(true)}><Flag size={18} /></button>
      {open && (
        <Modal title="Report this link" onClose={() => setOpen(false)} width={460}
          footer={<><span className="grow" /><button className="btn btn-ghost" onClick={() => setOpen(false)}>Cancel</button><button className="btn btn-danger-solid" disabled={busy} onClick={send}>{busy ? "Sending…" : "Send report"}</button></>}>
          <div className="col gap-12">
            <p className="muted">Tell Dozzier if this document looks harmful. The person who shared it isn’t told who reported it.</p>
            <div className="col gap-6">{REASONS.map((r) => <label key={r} className="row gap-8" style={{ cursor: "pointer" }}><input type="radio" name="reason" checked={reason === r} onChange={() => setReason(r)} />{r}</label>)}</div>
            <label className="field"><span className="label">Details (optional)</span><textarea className="input" rows={3} maxLength={2000} value={details} onChange={(e) => setDetails(e.target.value)} placeholder="What’s wrong with it?" /></label>
          </div>
        </Modal>
      )}
    </>
  );
}
