"use client";
import { sendEach } from "@/lib/sendEmail";

/** Emails workspace invites. The link pre-fills the invitee's email on sign-up; existing users accept from the in-app banner. */
export function sendInviteEmails(list: string[], role: string, inviter: string, workspace: string) {
  const signup = `${window.location.origin}/signup`;
  return sendEach(list, (to) => ({
    kind: "invite" as const, to: [to], subject: `${inviter} invited you to ${workspace} on Dozzier`, heading: `Join ${workspace} on Dozzier`,
    message: `${inviter} invited you to join ${workspace} on Dozzier as ${role === "Admin" ? "an" : "a"} ${role}.\n\nCreate your account with this email address (${to}) and you’ll go straight into the shared workspace. Already on Dozzier? Sign in and accept the invite at the top of the app.`,
    cta: { label: "Accept invite", url: `${signup}?email=${encodeURIComponent(to)}` },
    meta: { template: "team_invite" as const, role, workspace },
  }));
}
