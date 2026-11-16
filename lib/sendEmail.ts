"use client";
import { supabase } from "@/lib/supabase";

export type EmailKind = "invite" | "sign" | "file_request" | "reminder" | "share" | "follow_up" | "update" | "nudge";
export type EmailMeta = { template?: "team_invite" | "room_invite" | "sign" | "sign_reminder" | "file_request" | "file_reminder" | "share" | "update" | "message"; title?: string; role?: string; workspace?: string; items?: string[]; due?: string; subtitle?: string };
export type EmailInput = { kind: EmailKind; to: string[]; cc?: string[]; bcc?: string[]; subject: string; message: string; heading?: string; cta?: { label: string; url: string }; meta?: EmailMeta };

/** Sends through /api/email (Delivrie). Returns null on success or an error message. */
export async function sendEmail(e: EmailInput): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return "Sign in again to send email";
  try {
    const res = await fetch("/api/email", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(e) });
    const j = await res.json().catch(() => ({}));
    return res.ok ? null : (j as { error?: string }).error || "Couldn’t send";
  } catch { return "Couldn’t reach the server"; }
}

/** Sends one email per recipient (personal links), a few at a time. */
export async function sendEach<T>(items: T[], build: (x: T) => EmailInput, onDone?: (x: T, err: string | null) => void) {
  let ok = 0; let lastErr: string | null = null;
  for (let i = 0; i < items.length; i += 4) {
    await Promise.all(items.slice(i, i + 4).map(async (x) => { const err = await sendEmail(build(x)); if (!err) ok++; else lastErr = err; onDone?.(x, err); }));
  }
  return { ok, failed: items.length - ok, error: lastErr as string | null };
}
