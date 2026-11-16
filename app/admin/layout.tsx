"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Users, CreditCard, Globe, LifeBuoy, Flag, ScrollText, ArrowLeft, ShieldCheck, KeyRound, Megaphone } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Logo } from "@/components/Logo";
import { ToastHost } from "@/components/ui";

const NAV = [
  { href: "/admin", label: "Overview", I: LayoutDashboard },
  { href: "/admin/users", label: "Users & workspaces", I: Users },
  { href: "/admin/billing", label: "Billing", I: CreditCard },
  { href: "/admin/domains", label: "Domains", I: Globe },
  { href: "/admin/sign-in", label: "Sign-in methods", I: KeyRound },
  { href: "/admin/support", label: "Support", I: LifeBuoy },
  { href: "/admin/updates", label: "Product updates", I: Megaphone },
  { href: "/admin/reports", label: "Reports", I: Flag },
  { href: "/admin/audit", label: "Admin log", I: ScrollText },
];

/** Dozzier staff area. Access is decided by the database (platform_admins); this only hides the UI. */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const path = usePathname();
  const [state, setState] = useState<"loading" | "ok" | "denied">("loading");
  const [email, setEmail] = useState("");
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace(`/login?next=${encodeURIComponent(path)}`); return; }
      setEmail(session.user.email || "");
      const { data } = await supabase.rpc("is_platform_admin");
      setState(data ? "ok" : "denied");
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (state === "loading") return <div className="loading" style={{ minHeight: "100vh" }}><span className="spinner" /></div>;
  if (state === "denied") return (
    <main className="col" style={{ minHeight: "100vh", alignItems: "center", justifyContent: "center", gap: 10, textAlign: "center", padding: 24 }}>
      <h1 className="h2">Page not found</h1>
      <p className="muted">This page doesn’t exist or you don’t have access to it.</p>
      <Link href="/app" className="btn btn-secondary mt-8">Back to Dozzier</Link>
    </main>
  );
  return (
    <div className="adm">
      <aside className="adm-side">
        <div className="row gap-8" style={{ padding: "4px 8px 18px" }}><Logo height={22} /><span className="badge badge-brand">Admin</span></div>
        <nav className="col gap-2">
          {NAV.map(({ href, label, I }) => {
            const on = href === "/admin" ? path === "/admin" : path.startsWith(href);
            return <Link key={href} href={href} className={`adm-nav ${on ? "on" : ""}`}><I size={17} />{label}</Link>;
          })}
        </nav>
        <span className="grow" />
        <div className="adm-me"><ShieldCheck size={14} className="brand" /><span className="ellipsis">{email}</span></div>
        <Link href="/app" className="adm-nav"><ArrowLeft size={17} />Back to app</Link>
      </aside>
      <main className="adm-main">{children}</main>
      <ToastHost />
    </div>
  );
}
