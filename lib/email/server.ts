// Server-only: renders Dozzier emails and sends them through Delivrie.
const API = "https://delivrie.io/api/emails";
export const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://dozzier.co";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
/** Plain text → HTML paragraphs with clickable links. */
export function textToHtml(text: string) {
  return esc(text).split(/\n{2,}/).map((p) => `<p style="margin:0 0 14px;line-height:1.6">${p.replace(/\n/g, "<br>").replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" style="color:#2563eb;text-decoration:underline">$1</a>')}</p>`).join("");
}

export function layout(o: { preheader?: string; heading?: string; bodyHtml: string; cta?: { label: string; url: string }; footer?: string }) {
  const btn = o.cta ? `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:22px 0 6px"><tr><td style="border-radius:10px;background:#111827"><a href="${esc(o.cta.url)}" style="display:inline-block;padding:12px 20px;font-weight:600;font-size:14px;color:#ffffff;text-decoration:none;border-radius:10px">${esc(o.cta.label)}</a></td></tr></table>` : "";
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#111827">
<span style="display:none;max-height:0;overflow:hidden">${esc(o.preheader || "")}</span>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f4f6;padding:32px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px">
<tr><td style="padding:0 4px 16px"><a href="${SITE}" style="text-decoration:none;color:#0F192C;font-weight:700;font-size:20px;letter-spacing:-.02em">dozzier<span style="color:#4D94F7">&#9873;</span></a></td></tr>
<tr><td style="background:#ffffff;border-radius:14px;padding:28px;font-size:15px;border:1px solid #e5e7eb">
${o.heading ? `<h1 style="margin:0 0 16px;font-size:20px;line-height:1.3;font-weight:650">${esc(o.heading)}</h1>` : ""}${o.bodyHtml}${btn}
</td></tr>
<tr><td style="padding:16px 4px;font-size:12px;color:#6b7280;line-height:1.5">${o.footer ? esc(o.footer) + "<br>" : ""}Sent with <a href="${SITE}" style="color:#6b7280">Dozzier</a> · Secure document sharing</td></tr>
</table></td></tr></table></body></html>`;
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
