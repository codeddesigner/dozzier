"use client";
import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { User, Moon, Bell, Mail, KeyRound, Settings2, Users, Link2, Palette, Globe, Plug, Code2, CreditCard, ShieldCheck } from "lucide-react";

const SETTINGS_NAV = [
  { group: "Personal", items: [
    { href: "/app/settings/profile", label: "Profile", icon: User },
    { href: "/app/settings/preferences", label: "Preferences", icon: Moon },
    { href: "/app/settings/notifications", label: "Notifications", icon: Bell },
    { href: "/app/settings/email", label: "Email & signature", icon: Mail },
    { href: "/app/settings/security", label: "Security & sign-in", icon: KeyRound },
  ] },
  { group: "Workspace", items: [
    { href: "/app/settings/general", label: "General", icon: Settings2 },
    { href: "/app/settings/members", label: "Members & roles", icon: Users },
    { href: "/app/settings/link-defaults", label: "Link defaults", icon: Link2 },
    { href: "/app/settings/branding", label: "Branding", icon: Palette },
    { href: "/app/settings/domains", label: "Custom domains", icon: Globe },
    { href: "/app/settings/integrations", label: "Integrations", icon: Plug },
    { href: "/app/settings/api", label: "API & webhooks", icon: Code2 },
    { href: "/app/settings/billing", label: "Billing & plan", icon: CreditCard },
    { href: "/app/settings/sso", label: "Security & SSO", icon: ShieldCheck },
  ] },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const strip = useRef<HTMLDivElement>(null);
  useEffect(() => { strip.current?.querySelector<HTMLElement>(".on")?.scrollIntoView({ inline: "center", block: "nearest" }); }, [path]);
  return (
    <div className="set-shell">
      <nav className="set-mnav" aria-label="Settings sections" ref={strip}>
        {SETTINGS_NAV.flatMap((g) => g.items).map((i) => (
          <Link key={i.href} href={i.href} className={path.startsWith(i.href) ? "on" : ""}><i.icon size={14} />{i.label}</Link>
        ))}
      </nav>
      <nav className="set-nav" aria-label="Settings">
        <div className="h2" style={{ padding: "0 8px 12px" }}>Settings</div>
        {SETTINGS_NAV.map((g) => (
          <div key={g.group} className="col" style={{ gap: 2, marginBottom: 12 }}>
            <div className="set-nav-label">{g.group}</div>
            {g.items.map((i) => (
              <Link key={i.href} href={i.href} className={`set-nav-item ${path.startsWith(i.href) ? "on" : ""}`}><i.icon size={16} />{i.label}</Link>
            ))}
          </div>
        ))}
      </nav>
      <div className="set-main" key={path}>{children}</div>
    </div>
  );
}
