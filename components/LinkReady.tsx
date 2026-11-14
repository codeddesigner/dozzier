"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Mail, Code2, QrCode, Users, Download, MessageSquare, Send } from "lucide-react";
import { Modal, Tabs, copy, toast } from "./ui";
import { sendEmail } from "@/lib/sendEmail";
import { useApp } from "@/components/AppContext";
import type { Link } from "@/lib/supabase";

export function linkUrlOf(slug: string) {
  return `${typeof window !== "undefined" ? window.location.origin : "https://dozzier.co"}/v/${slug}`;
}

/** Fills {{placeholders}} in an email template. */
export function fillTemplate(t: string, v: Record<string, string>) {
  return t.replace(/\{\{(\w+)\}\}/g, (_, k) => v[k] ?? "");
}

export function useQr(text: string, width = 200) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let off = false;
    import("qrcode").then((m) => (m.default || m).toDataURL(text, { margin: 1, width, color: { dark: "#111827", light: "#ffffff" } })).then((u: string) => { if (!off) setSrc(u); }).catch(() => setSrc(null));
    return () => { off = true; };
  }, [text, width]);
  return src;
}

/** Shown right after a link is created — the Figma "Link ready" share sheet. */
export function LinkReady({ link, docName, documentId, onDone }: { link: Link; docName?: string; documentId?: string; onDone: () => void }) {
  const router = useRouter();
  const { profile, email } = useApp();
  const url = linkUrlOf(link.slug);
  const [tab, setTab] = useState<"email" | "slack" | "qr" | "embed">("email");
  const [copied, setCopied] = useState(false);
  const [to, setTo] = useState("");
  const [sent, setSent] = useState<"idle" | "sending" | "sent">("idle");
  const qr = useQr(url, 220);
  const sender = profile.full_name || email.split("@")[0];
  const tpl = (profile.settings?.email?.templates as { subject: string; body: string }[] | undefined)?.[0];
  const vars = { first_name: "", company: link.name, document: docName || link.name, link: url, signature: profile.settings?.email?.signature || sender };
  const subject = fillTemplate(tpl?.subject || "{{document}}", vars).replace(/^\s*×\s*/, "");
  const body = fillTemplate(tpl?.body || "Hi,\n\nHere’s {{document}}: {{link}}\n\nIt’s private to you — let me know if you have any questions.\n\n{{signature}}", vars).replace(/^Hi ,/, "Hi,");
  const slack = `Here’s ${docName || link.name} — ${url}`;
  const embed = `<iframe src="${url}?embed=1" width="100%" height="600" style="border:0;border-radius:12px" allow="fullscreen"></iframe>`;
  const protections = [link.require_email && "Email required", link.passcode && "Passcode", link.watermark && "Watermark", link.require_nda && "NDA", link.expires_at && `Expires ${new Date(link.expires_at).toLocaleDateString()}`, !link.allow_download && "No downloads"].filter(Boolean) as string[];

  return (
    <Modal title="Your link is ready" onClose={onDone} width={560}
      footer={<>{documentId && <button className="btn btn-ghost" onClick={() => router.push(`/app/content/${documentId}/personalise`)}><Users size={14} />Personalise for recipients</button>}<span className="grow" /><button className="btn btn-primary" onClick={onDone}>Done</button></>}>
      <div className="col gap-16">
        <div className="lr-hero">
          <span className="lr-check"><Check size={18} /></span>
          <div className="col grow" style={{ minWidth: 0 }}><span className="medium ellipsis">{link.name}</span><span className="caption muted ellipsis">{protections.join(" · ") || "Public link"}</span></div>
        </div>
        <div className="lr-url">
          <span className="grow ellipsis medium">{url.replace(/^https?:\/\//, "")}</span>
          <button className={`btn btn-s ${copied ? "btn-secondary" : "btn-primary"}`} onClick={() => { copy(url, "Link copied"); setCopied(true); setTimeout(() => setCopied(false), 1800); }}>{copied ? <><Check size={14} />Copied</> : <><Copy size={14} />Copy link</>}</button>
        </div>
        <Tabs value={tab} onChange={setTab} tabs={[{ id: "email", label: "Email" }, { id: "slack", label: "Slack" }, { id: "qr", label: "QR code" }, { id: "embed", label: "Embed" }]} />
        {tab === "email" && (
          <div className="col gap-8">
            <form className="row gap-8" onSubmit={async (ev) => {
              ev.preventDefault();
              const list = to.split(/[,;\s]+/).map((x) => x.trim()).filter(Boolean);
              if (!list.length) return;
              setSent("sending");
              const err = await sendEmail({ kind: "share", to: list, subject, message: body, cta: { label: `Open ${docName || link.name}`, url } });
              if (err) { toast(err); setSent("idle"); return; }
              setSent("sent"); toast(`Sent to ${list.length === 1 ? list[0] : `${list.length} people`}`);
            }}>
              <input className="input grow" type="text" inputMode="email" placeholder="To: name@company.com" value={to} onChange={(e) => { setTo(e.target.value); setSent("idle"); }} aria-label="Recipient email" />
              <button className="btn btn-primary" type="submit" disabled={!to.trim() || sent === "sending"}><Send size={14} />{sent === "sending" ? "Sending…" : sent === "sent" ? "Sent" : "Send"}</button>
            </form>
            <div className="lr-preview"><span className="caption muted">Subject</span><span className="medium">{subject}</span><pre>{body}</pre></div>
            <div className="row gap-8 wrap">
              <a className="btn btn-secondary btn-s" href={`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(to)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`} target="_blank" rel="noreferrer"><Mail size={14} />Gmail</a>
              <a className="btn btn-ghost btn-s" href={`mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`}>Mail app</a>
              <button className="btn btn-ghost btn-s" onClick={() => copy(body, "Email copied")}><Copy size={14} />Copy text</button>
            </div>
          </div>
        )}
        {tab === "slack" && (
          <div className="col gap-8">
            <div className="lr-preview row gap-10" style={{ alignItems: "flex-start" }}><MessageSquare size={16} className="muted" /><span style={{ fontSize: 14 }}>{slack}</span></div>
            <div className="row gap-8"><button className="btn btn-primary btn-s" onClick={() => copy(slack, "Copied — paste it in Slack")}><Copy size={14} />Copy for Slack</button><span className="caption faint">Slack unfurls the link with your branding.</span></div>
          </div>
        )}
        {tab === "qr" && (
          <div className="row gap-16" style={{ alignItems: "center" }}>
            <div className="lr-qr">{qr ? <img src={qr} alt={`QR code for ${url}`} width={160} height={160} /> : <QrCode size={40} className="faint" />}</div>
            <div className="col gap-8"><span className="medium">Scan to open</span><span className="caption muted">Print it on a one-pager or show it at the end of a pitch. Visits are tracked like any other.</span>
              {qr && <a className="btn btn-secondary btn-s" href={qr} download={`${link.slug}-qr.png`} style={{ alignSelf: "flex-start" }}><Download size={14} />Download PNG</a>}</div>
          </div>
        )}
        {tab === "embed" && (
          <div className="col gap-8">
            <pre className="lr-code">{embed}</pre>
            <div className="row gap-8"><button className="btn btn-primary btn-s" onClick={() => copy(embed, "Embed code copied")}><Code2 size={14} />Copy embed code</button><span className="caption faint">Works on Notion, Webflow and any site that allows iframes.</span></div>
          </div>
        )}
      </div>
    </Modal>
  );
}
