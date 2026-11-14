"use client";
import Link from "next/link";
import { KeyRound, ShieldCheck, Globe, Lock, Clock } from "lucide-react";
import { Card, Row, Select, SettingsHead, SaveButton, useSetting } from "@/components/settings/kit";

export default function SecuritySso() {
  const s = useSetting<{ session_timeout: string }>("security", { session_timeout: "30 days" });
  return (
    <>
      <SettingsHead title="Security & SSO" sub="Workspace-wide sign-in and data controls." action={<SaveButton onClick={() => s.save()} saving={s.saving} />} />
      <Card title="Sign-in">
        <Row icon={<ShieldCheck size={16} />} title="Two-factor authentication" sub="Turn on 2FA for your own account"><Link href="/app/settings/security" className="btn btn-secondary btn-s">Manage</Link></Row>
        <Row icon={<Clock size={16} />} title="Session length" sub="How long people stay signed in on a device"><Select value={s.value.session_timeout} onChange={(x) => s.update({ session_timeout: x })} options={["24 hours", "7 days", "30 days"]} /></Row>
      </Card>
      <Card title="Enterprise controls" sub="Available on the Enterprise plan.">
        <Row icon={<KeyRound size={16} />} title="SAML single sign-on" sub="Okta, Azure AD, Google Workspace · SCIM provisioning"><span className="badge badge-muted">Enterprise</span></Row>
        <Row icon={<Globe size={16} />} title="IP allow-list" sub="Only allow sign-in from office and VPN ranges"><span className="badge badge-muted">Enterprise</span></Row>
        <Row icon={<Lock size={16} />} title="Data residency" sub="Keep files and analytics in the EU or US"><span className="badge badge-muted">Enterprise</span></Row>
        <div><Link href="/docs/contact" className="btn btn-primary btn-s">Talk to sales</Link></div>
      </Card>
    </>
  );
}
