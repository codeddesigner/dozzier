"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Logo } from "@/components/Logo";
import { fetchAuthMethods, methodFor } from "@/lib/authMethods";

/** Google / Microsoft send people back here; the Supabase client reads the session from the URL. */
export default function AuthCallback() {
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const h = new URLSearchParams(window.location.hash.slice(1));
    const problem = q.get("error_description") || h.get("error_description");
    if (problem) { setErr(problem.replace(/\+/g, " ")); return; }
    const n = q.get("next");
    const next = n && n.startsWith("/") && !n.startsWith("//") ? n : "/app";
    (async () => {
      const code = q.get("code");
      if (code) await supabase.auth.exchangeCodeForSession(code).catch(() => null);
      for (let i = 0; i < 20; i++) {
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          // The identity signed in most recently is the one just used; refuse it if an admin switched that method off.
          const ids = [...(data.session.user.identities || [])].sort((a, b) => String(b.last_sign_in_at || "").localeCompare(String(a.last_sign_in_at || "")));
          const m = methodFor(ids[0]?.provider);
          if (m && !(await fetchAuthMethods())[m]) {
            await supabase.auth.signOut();
            const label = m === "google" ? "Google" : m === "microsoft" ? "Microsoft" : "SSO";
            return setErr(`Signing in with ${label} is turned off. Log in with your email instead — use “Forgot password?” if you haven’t set a password.`);
          }
          return router.replace(next);
        }
        await new Promise((r) => setTimeout(r, 150));
      }
      setErr("We couldn’t finish signing you in. Please try again.");
    })();
  }, [router]);
  return (
    <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: 24, textAlign: "center" }}>
      <Logo height={24} />
      {err ? (<><p className="muted" style={{ maxWidth: 380 }}>{err}</p><Link href="/login" className="btn btn-primary">Back to log in</Link></>) : <p className="muted">Signing you in…</p>}
    </main>
  );
}
