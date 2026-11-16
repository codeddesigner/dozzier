"use client";
import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { LogoMark } from "@/components/Logo";

/** Home page of a customer's custom domain (docs.acme.com/). Links live at docs.acme.com/<link>. */
export default function DomainHome() {
  const [ws, setWs] = useState<string | null | undefined>(undefined);
  useEffect(() => { supabase.rpc("domain_workspace", { p_host: window.location.host }).then(({ data }) => setWs((data as string) || null)); }, []);
  return (
    <main className="col" style={{ minHeight: "100vh", alignItems: "center", justifyContent: "center", gap: 12, padding: 24, textAlign: "center", background: "var(--dz-bg-subtle)" }}>
      <ShieldCheck size={28} className="brand" />
      <h1 className="h2">{ws ? `Documents shared by ${ws}` : ws === null ? "Nothing to see here" : " "}</h1>
      <p className="muted" style={{ maxWidth: 420 }}>Open the link you were sent to view a document. Links on this domain look like <b>{typeof window !== "undefined" ? window.location.host : ""}/your-link</b>.</p>
      <a href="https://dozzier.co" className="caption faint row gap-6" style={{ marginTop: 12 }}><LogoMark size={14} />Secured by Dozzier</a>
    </main>
  );
}
