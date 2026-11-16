"use client";
import { supabase } from "@/lib/supabase";

/** Starts Google / Microsoft sign-in. Returns an error message, or null while the browser redirects. */
export async function startOAuth(provider: "google" | "azure", next = "/app"): Promise<string | null> {
  const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next.startsWith("/") && !next.startsWith("//") ? next : "/app")}`;
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo, scopes: provider === "azure" ? "email" : undefined, queryParams: provider === "google" ? { prompt: "select_account" } : undefined },
  });
  if (!error) return null;
  const name = provider === "google" ? "Google" : "Microsoft";
  return /not enabled|unsupported provider/i.test(error.message) ? `${name} sign-in isn’t switched on yet — use your email for now.` : error.message;
}
