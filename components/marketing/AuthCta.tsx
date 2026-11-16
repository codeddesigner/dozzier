"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

/** True once we know someone is signed in on this browser (false while checking, so signed-out visitors see no flicker). */
export function useSignedIn() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    let live = true;
    supabase.auth.getSession().then(({ data }) => { if (live) setOn(!!data.session); });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setOn(!!s));
    return () => { live = false; sub.subscription.unsubscribe(); };
  }, []);
  return on;
}

export const DASHBOARD = "/app";

/** Right side of the marketing nav: Log in + Try for free, or Go to dashboard when signed in. */
export function NavAuth({ demo }: { demo: string }) {
  const signedIn = useSignedIn();
  return signedIn ? (
    <>
      <Link href={demo} className="btn btn-secondary btn-xs-shadow d-only">Talk to Sales</Link>
      <Link href={DASHBOARD} className="btn btn-dark lp-try">Go to dashboard</Link>
    </>
  ) : (
    <>
      <Link href="/login" className="btn btn-ghost d-only">Log in</Link>
      <Link href={demo} className="btn btn-secondary btn-xs-shadow d-only">Talk to Sales</Link>
      <Link href="/signup" className="btn btn-dark lp-try">Try for free</Link>
    </>
  );
}

/** A sign-up button that becomes "Go to dashboard" for signed-in visitors. */
export function StartCta({ className, label = "Try for free", href = "/signup", onClick }: { className: string; label?: string; href?: string; onClick?: () => void }) {
  const signedIn = useSignedIn();
  return <Link href={signedIn ? DASHBOARD : href} className={className} onClick={onClick}>{signedIn ? "Go to dashboard" : label}</Link>;
}

/** Pricing card button: sign up on that plan, or (signed in) go straight to upgrading. */
export function PlanCta({ id, className, label }: { id: string; className: string; label: string }) {
  const signedIn = useSignedIn();
  return <Link href={signedIn ? `/app/upgrade?plan=${id}` : `/signup?plan=${id}`} className={className}>{signedIn ? "Choose plan" : label}</Link>;
}
