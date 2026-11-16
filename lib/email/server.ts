// Server-only: renders Dozzier emails and sends them through Delivrie.
const API = "https://delivrie.io/api/emails";
import { SITE } from "./site";
import { renderEmail, button } from "./templates";
export { SITE };

/** Legacy helper: wraps HTML in the Figma email design with a generic header. Prefer lib/email/messages.ts. */
export function layout(o: { preheader?: string; heading?: string; bodyHtml: string; cta?: { label: string; url: string }; footer?: string }) {
  return renderEmail({ preheader: o.preheader, banner: { bg: "#eaf3fe", pill: "Dozzier", title: o.heading || "An update from Dozzier", sub: o.preheader?.slice(0, 120) || "" },
    body: o.bodyHtml + (o.cta ? button(o.cta.label, o.cta.url) : ""), footer: { reason: o.footer || "You’re receiving this because of activity on Dozzier.", account: true } });
}

export async function deliver(o: { to: string[]; cc?: string[]; bcc?: string[]; subject: string; html: string; text: string; replyTo?: string; fromName?: string; tag?: string }) {
  const key = process.env.DELIVRIE_API_KEY;
  if (!key) throw new Error("Email isn’t configured yet");
  const base = process.env.EMAIL_FROM || "Dozzier <notifications@dozzier.co>";
  const addr = base.match(/<([^>]+)>/)?.[1] || base;
  const from = o.fromName ? `${o.fromName.replace(/[<>"]/g, "").slice(0, 60)} via Dozzier <${addr}>` : base;
  const res = await fetch(API, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: o.to, cc: o.cc?.length ? o.cc : undefined, bcc: o.bcc?.length ? o.bcc : undefined, subject: o.subject, html: o.html, text: o.text,
      reply_to: o.replyTo ? [o.replyTo] : undefined, tags: o.tag ? [{ name: "category", value: o.tag }] : undefined }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((body as { message?: string; error?: { message?: string } }).message || (body as { error?: { message?: string } }).error?.message || `Delivrie error ${res.status}`);
  return (body as { id?: string }).id;
}

export const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
