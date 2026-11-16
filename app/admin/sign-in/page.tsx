"use client";
import { useState } from "react";
import { Loading, Toggle, toast, useLoad } from "@/components/ui";
import { adminRpc } from "@/lib/admin";
import { fetchAuthMethods, type AuthMethods } from "@/lib/authMethods";

const METHODS: { key: keyof AuthMethods; name: string; desc: string }[] = [
  { key: "google", name: "Google", desc: "“Continue with Google” on log in and sign up." },
  { key: "microsoft", name: "Microsoft", desc: "“Continue with Microsoft” on log in and sign up. Works with Outlook, Hotmail and work accounts." },
  { key: "sso", name: "SSO", desc: "“Continue with SSO” on log in, for Enterprise companies." },
];

export default function AdminSignIn() {
  const { data, loading } = useLoad(fetchAuthMethods, []);
  const [m, setM] = useState<AuthMethods | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const cur = m || data;
  if (loading && !cur) return <Loading />;
  if (!cur) return null;

  async function flip(key: keyof AuthMethods, on: boolean) {
    setBusy(key);
    try {
      const v = await adminRpc<AuthMethods>("admin_set_auth_method", { p_method: key, p_on: on });
      setM({ ...cur!, ...v });
      toast(`${METHODS.find((x) => x.key === key)!.name} sign-in ${on ? "turned on" : "turned off"}`);
    } catch (e) { toast(e instanceof Error ? e.message : "Couldn’t save"); }
    setBusy(null);
  }

  return (
    <>
      <div className="adm-head"><h1>Sign-in methods</h1><span className="caption muted">Changes apply immediately for everyone</span></div>
      <div className="adm-card" style={{ gap: 0, padding: "4px 18px" }}>
        {METHODS.map((x, i) => (
          <div key={x.key} className="row gap-16" style={{ padding: "14px 0", borderTop: i ? "1px solid var(--dz-border-subtle)" : undefined }}>
            <div className="col grow" style={{ gap: 2 }}>
              <span className="medium">{x.name}</span>
              <span className="caption muted">{x.desc}</span>
            </div>
            <Toggle on={cur[x.key]} disabled={busy === x.key} onChange={(v) => flip(x.key, v)} />
          </div>
        ))}
        <div className="row gap-16" style={{ padding: "14px 0", borderTop: "1px solid var(--dz-border-subtle)" }}>
          <div className="col grow" style={{ gap: 2 }}>
            <span className="medium">Email and password</span>
            <span className="caption muted">Always on, so admins and existing users can never be locked out.</span>
          </div>
          <Toggle on disabled />
        </div>
      </div>
      <p className="caption muted">Turning a method off hides its button and stops anyone finishing a sign-in with it. People who signed up that way can still log in with their email: they use “Forgot password?” to set a password.</p>
    </>
  );
}
