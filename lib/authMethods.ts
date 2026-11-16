"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export type AuthMethods = { google: boolean; microsoft: boolean; sso: boolean };
export const AUTH_DEFAULT: AuthMethods = { google: true, microsoft: true, sso: true };

/** Sign-in methods switched on in Admin → Sign-in methods. Null while loading so buttons don't flash. */
export async function fetchAuthMethods(): Promise<AuthMethods> {
  const { data } = await supabase.rpc("auth_methods");
  return { ...AUTH_DEFAULT, ...((data as Partial<AuthMethods>) || {}) };
}

export function useAuthMethods() {
  const [m, setM] = useState<AuthMethods | null>(null);
  useEffect(() => { fetchAuthMethods().then(setM, () => setM(AUTH_DEFAULT)); }, []);
  return m;
}

/** Maps a Supabase identity provider to our switch name. */
export const methodFor = (provider?: string | null): keyof AuthMethods | null =>
  provider === "google" ? "google" : provider === "azure" ? "microsoft" : provider?.startsWith("sso") ? "sso" : null;
