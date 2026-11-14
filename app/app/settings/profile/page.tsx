"use client";
import { useEffect, useRef, useState } from "react";
import { CalendarDays, Upload } from "lucide-react";
import { supabase, BUCKET } from "@/lib/supabase";
import { useApp } from "@/components/AppContext";
import { Avatar, Toggle, toast } from "@/components/ui";
import { Card, SettingsHead, SaveButton } from "@/components/settings/kit";

export default function Profile() {
  const { profile, userId, email, refreshProfile } = useApp();
  const [first, ...rest] = (profile.full_name || "").split(" ");
  const [f, setF] = useState({ first: first || "", last: rest.join(" "), title: profile.job_title || "", bio: profile.bio || "", booking: profile.booking_url || "" });
  const [showBooking, setShowBooking] = useState<boolean>((profile.settings || {}).show_booking ?? !!profile.booking_url);
  const [photo, setPhoto] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (profile.avatar_path) supabase.storage.from(BUCKET).createSignedUrl(profile.avatar_path, 3600).then(({ data }) => setPhoto(data?.signedUrl || null));
  }, [profile.avatar_path]);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF((x) => ({ ...x, [k]: e.target.value }));
  const name = `${f.first} ${f.last}`.trim() || email;

  async function upload(fl: File) {
    if (fl.size > 2 * 1024 * 1024) return toast("Photo must be under 2 MB");
    const path = `${userId}/avatar/${Date.now()}-${fl.name.replace(/[^\w.\-]+/g, "_")}`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, fl, { contentType: fl.type });
    if (error) return toast(error.message);
    await supabase.from("profiles").update({ avatar_path: path }).eq("id", userId);
    await refreshProfile(); toast("Photo updated");
  }
  async function save() {
    if (f.booking && !/^https?:\/\//.test(f.booking)) return toast("Booking link should start with https://");
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      full_name: `${f.first} ${f.last}`.trim(), job_title: f.title.trim() || null, bio: f.bio.trim() || null, booking_url: f.booking.trim() || null,
      settings: { ...(profile.settings || {}), show_booking: showBooking },
    }).eq("id", userId);
    setSaving(false);
    if (error) return toast(error.message);
    await refreshProfile(); toast("Profile saved");
  }

  return (
    <>
      <SettingsHead title="Profile" sub="How you appear to teammates and the people you share with." action={<SaveButton onClick={save} saving={saving} />} />
      <div className="set-split">
        <div className="col gap-16 grow">
          <Card title="Photo">
            <div className="row gap-16">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {photo ? <img src={photo} alt="" width={56} height={56} style={{ borderRadius: 999, objectFit: "cover" }} /> : <Avatar name={name} size={56} color="#ff7a3d" />}
              <button className="btn btn-secondary btn-s" onClick={() => file.current?.click()}><Upload size={14} />Upload photo</button>
              <span className="caption faint">JPG or PNG, up to 2 MB</span>
              <input ref={file} type="file" hidden accept="image/png,image/jpeg,image/webp" onChange={(e) => { const x = e.target.files?.[0]; if (x) upload(x); e.target.value = ""; }} />
            </div>
          </Card>
          <Card title="Personal info">
            <div className="set-grid">
              <label className="field"><span className="label">First name</span><input className="input" value={f.first} onChange={set("first")} /></label>
              <label className="field"><span className="label">Last name</span><input className="input" value={f.last} onChange={set("last")} /></label>
              <label className="field"><span className="label">Job title</span><input className="input" value={f.title} onChange={set("title")} placeholder="Founder & CEO" /></label>
              <label className="field"><span className="label">Company</span><input className="input" value={profile.workspace_name || ""} disabled /></label>
            </div>
            <label className="field"><span className="label">Email</span><input className="input" value={email} disabled /><span className="caption faint">Change your sign-in email from Security &amp; sign-in.</span></label>
            <label className="field"><span className="label">Short bio</span><textarea className="input" rows={2} value={f.bio} onChange={set("bio")} placeholder="Building Dozzier — secure sharing for teams who close deals." /></label>
            <label className="field"><span className="label">Booking link</span><input className="input" value={f.booking} onChange={set("booking")} placeholder="https://cal.com/you/30min" /></label>
          </Card>
        </div>
        <div className="col gap-12" style={{ width: 300, flexShrink: 0 }}>
          <span className="caption muted">Visitor preview</span>
          <div className="set-card" style={{ gap: 10 }}>
            <span className="overline" style={{ color: "var(--dz-text-tertiary)" }}>Shared by</span>
            <div className="row gap-10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {photo ? <img src={photo} alt="" width={36} height={36} style={{ borderRadius: 999, objectFit: "cover" }} /> : <Avatar name={name} size={36} color="#ff7a3d" />}
              <div className="col"><span className="medium">{name}</span><span className="caption muted">{[f.title, profile.workspace_name].filter(Boolean).join(" · ")}</span></div>
            </div>
            {f.bio && <p className="caption muted">{f.bio}</p>}
            {showBooking && f.booking && <span className="btn btn-primary btn-s btn-block"><CalendarDays size={14} />Book a 30-min call</span>}
          </div>
          <div className="row"><span className="grow" style={{ fontSize: 14 }}>Show booking button to visitors</span><Toggle on={showBooking} onChange={setShowBooking} /></div>
        </div>
      </div>
    </>
  );
}
