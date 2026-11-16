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
  return oauthError(provider, error.message);
}

/** Company single sign-on: finds the SAML connection for the email's domain and redirects there. */
export async function startSSO(email: string, next = "/app"): Promise<string | null> {
  const domain = email.trim().toLowerCase().split("@")[1];
  if (!domain || !domain.includes(".")) return "Enter your work email, like you@company.com.";
  const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next.startsWith("/") && !next.startsWith("//") ? next : "/app")}`;
  const { data, error } = await supabase.auth.signInWithSSO({ domain, options: { redirectTo } });
  if (error) return /no sso provider|not found|404/i.test(error.message) ? `${domain} isn’t set up for single sign-on yet. Ask your IT team, or log in with your email.` : /disabled|not enabled/i.test(error.message) ? "Single sign-on isn’t available right now. Log in with your email." : error.message;
  if (data?.url) { window.location.href = data.url; return null; }
  return "Couldn’t start single sign-on. Please try again.";
}

function oauthError(provider: "google" | "azure", message: string) {
  const error = { message };
  const name = provider === "google" ? "Google" : "Microsoft";
  return /not enabled|unsupported provider/i.test(error.message) ? `${name} sign-in isn’t switched on yet — use your email for now.` : error.message;
}
