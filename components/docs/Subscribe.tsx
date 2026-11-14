"use client";
import { useState } from "react";
import { Bell, Check } from "lucide-react";
import { supabase } from "@/lib/supabase";

export function Subscribe() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  if (done) return <span className="badge badge-success cycle-item"><Check size={12} />Subscribed</span>;
  if (!open) return <button className="btn btn-secondary btn-s" onClick={() => setOpen(true)}><Bell size={14} />Subscribe</button>;
  return (
    <form className="row gap-6 cycle-item" onSubmit={async (e) => { e.preventDefault(); await supabase.from("changelog_subscribers").insert({ email: email.trim().toLowerCase() }); setDone(true); }}>
      <input className="input" style={{ height: 30, width: 200 }} type="email" required autoFocus placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} />
      <button className="btn btn-primary btn-s">Subscribe</button>
    </form>
  );
}
