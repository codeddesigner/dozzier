"use client";
import { supabase } from "@/lib/supabase";

/** Calls an admin-only database function; the database itself refuses anyone who isn't a platform admin. */
export async function adminRpc<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw new Error(error.message);
  return data as T;
}
export const money = (cents: number) => `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: cents % 100 ? 2 : 0, maximumFractionDigits: 2 })}`;
export const bytes = (n: number) => (n >= 1e9 ? `${(n / 1e9).toFixed(1)} GB` : n >= 1e6 ? `${(n / 1e6).toFixed(0)} MB` : n > 0 ? `${Math.max(1, Math.round(n / 1e3))} KB` : "—");
export const day = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—");
export const PLAN_LABEL: Record<string, string> = { trial: "Trial", personal: "Personal", standard: "Standard", datarooms: "Data Rooms", canceled: "Canceled" };
