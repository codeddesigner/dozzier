"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Trash2 } from "lucide-react";
import { supabase, BUCKET } from "@/lib/supabase";
import { useApp } from "@/components/AppContext";
import { Modal, toast } from "@/components/ui";
import { Card, Row, SettingsHead } from "@/components/settings/kit";
import { TwoFactorRow } from "@/components/settings/TwoFactor";
import { timeAgo } from "@/lib/format";

function device() {
  const ua = navigator.userAgent;
  const b = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : /Firefox\//.test(ua) ? "Firefox" : "Browser";
  const o = /Mac OS X/.test(ua) ? "macOS" : /Windows/.test(ua) ? "Windows" : /Android/.test(ua) ? "Android" : /iPhone|iPad/.test(ua) ? "iOS" : /Linux/.test(ua) ? "Linux" : "";
  return `${b}${o ? ` on ${o}` : ""}`;
}

export default function Security() {
  const { userId, email } = useApp();
  const router = useRouter();
  const [pwOpen, setPwOpen] = useState(false);
  const [pw, setPw] = useState(""); const [pw2, setPw2] = useState("");
  const [meta, setMeta] = useState<{ updated?: string; providers: string[]; lastSignIn?: string }>({ providers: [] });
  const [where, setWhere] = useState<string>("");
  const [del, setDel] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const u = data.user;
      setMeta({ updated: u?.updated_at, providers: (u?.identities || []).map((i) => i.provider), lastSignIn: u?.last_sign_in_at });
    });
    fetch("/api/geo").then((r) => r.json()).then((g) => setWhere([g.city, g.country].filter(Boolean).join(", "))).catch(() => {});
  }, []);

  async function changePw() {
    if (pw.length < 8) return toast("Use at least 8 characters");
    if (pw !== pw2) return toast("Passwords don’t match");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) return toast(error.message);
    setPwOpen(false); setPw(""); setPw2(""); toast("Password updated");
  }
  async function signOutOthers() {
    const { error } = await supabase.auth.signOut({ scope: "others" });
    toast(error ? error.message : "Signed out of all other sessions");
  }
  async function exportData() {
    setBusy(true);
    const tables = ["profiles", "folders", "documents", "links", "spaces", "space_items", "contacts", "accounts", "visits", "page_views", "agreements", "file_requests", "file_request_uploads", "invites", "custom_domains"];
    const out: Record<string, unknown> = { exported_at: new Date().toISOString(), email };
    for (const t of tables) { const { data } = await supabase.from(t).select("*").limit(10000); out[t] = data || []; }
    const blob = new Blob([JSON.stringify(out, null, 2)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `dozzier-export-${new Date().toISOString().slice(0, 10)}.json`; a.click();
    setBusy(false); toast("Export downloaded");
  }
  async function deleteAccount() {
    setBusy(true);
    // Remove stored files first, then the account (database rows cascade).
    for (const dir of ["", "brand", "avatar"]) {
      const { data } = await supabase.storage.from(BUCKET).list(dir ? `${userId}/${dir}` : userId, { limit: 1000 });
      const paths = (data || []).filter((f) => f.id).map((f) => `${userId}/${dir ? dir + "/" : ""}${f.name}`);
      if (paths.length) await supabase.storage.from(BUCKET).remove(paths);
    }
    const { error } = await supabase.rpc("delete_my_account");
    if (error) { setBusy(false); return toast(error.message); }
    await supabase.auth.signOut();
    router.replace("/");
  }

  return (
    <>
      <SettingsHead title="Security & sign-in" sub="Keep your account safe and see where you’re signed in." />
      <Card title="Sign-in methods">
        <Row title="Password" sub={meta.updated ? `Last changed ${timeAgo(meta.updated)}` : "Set at sign-up"}><button className="btn btn-secondary btn-s" onClick={() => setPwOpen(true)}>Change</button></Row>
        <TwoFactorRow />
        <Row title="Passkeys" sub="Sign in with Face ID, Touch ID or a security key"><span className="badge badge-muted">Coming soon</span></Row>
      </Card>
      <Card title="Connected accounts" sub="Sign in faster with these accounts.">
        {([["google", "Google"], ["azure", "Microsoft"]] as const).map(([p, n]) => (
          <Row key={p} title={n} sub={meta.providers.includes(p) ? email : "Not connected"} icon={<img src={`/logos/${p === "azure" ? "microsoft" : "google"}.svg`} alt="" width={18} height={18} />}>
            <span className="caption faint">{meta.providers.includes(p) ? "Connected" : "Available soon"}</span>
          </Row>
        ))}
      </Card>
      <Card title="Active sessions">
        <Row title={device()} sub={`${where ? where + " · " : ""}Active now`}><span className="badge badge-brand">This device</span></Row>
        <p className="caption muted">Signed in somewhere you don’t recognise? End every other session and change your password.</p>
        <div><button className="btn btn-outline btn-s" onClick={signOutOthers}>Sign out of all other sessions</button></div>
      </Card>
      <Card title="Your data">
        <Row title="Export my data" sub="Download everything in your workspace as JSON"><button className="btn btn-secondary btn-s" disabled={busy} onClick={exportData}><Download size={14} />Export</button></Row>
        <Row title="Delete account" sub="Permanently delete your account, files, links and analytics"><button className="btn btn-danger btn-s" onClick={() => setDel(true)}><Trash2 size={14} />Delete account</button></Row>
      </Card>

      {pwOpen && (
        <Modal title="Change password" onClose={() => setPwOpen(false)} width={440} footer={<><button className="btn btn-ghost" onClick={() => setPwOpen(false)}>Cancel</button><button className="btn btn-primary" disabled={busy} onClick={changePw}>Update password</button></>}>
          <div className="col gap-12">
            <label className="field"><span className="label">New password</span><input className="input" type="password" autoFocus value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" /></label>
            <label className="field"><span className="label">Confirm</span><input className="input" type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} autoComplete="new-password" /></label>
          </div>
        </Modal>
      )}
      {del && (
        <Modal title="Delete your account?" onClose={() => setDel(false)} width={460} footer={<><button className="btn btn-ghost" onClick={() => setDel(false)}>Cancel</button><button className="btn btn-danger" disabled={busy || confirm !== "DELETE"} onClick={deleteAccount}>{busy ? "Deleting…" : "Delete forever"}</button></>}>
          <div className="col gap-12">
            <p className="muted">This permanently deletes {email}, every document, link, Space and all visitor analytics. Shared links stop working immediately. This can’t be undone.</p>
            <label className="field"><span className="label">Type DELETE to confirm</span><input className="input" value={confirm} onChange={(e) => setConfirm(e.target.value)} /></label>
          </div>
        </Modal>
      )}
    </>
  );
}
