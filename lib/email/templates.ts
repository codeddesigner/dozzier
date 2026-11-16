// Server-only: Dozzier email design system (Figma › Emails). Every email = logo bar + illustrated
// banner + body + footer. Built with tables and inline styles so it renders in Gmail, Outlook and Apple Mail.
// Illustrations are rebuilt in HTML (not images) so they always show the real names and numbers.
import { SITE } from "./site";

export const esc = (s: unknown) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const A = `${SITE}/email`;
const FONT = "'Calamantus',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const INK = "#0f192c";
const img = (name: string, w: number, h: number, alt = "", style = "") => `<img src="${A}/${name}.png" width="${w}" height="${h}" alt="${esc(alt)}" style="display:block;border:0;outline:none;${style}">`;
const ico = (name: string, s = 14) => img(`i-${name}`, s, s, "", "display:inline-block;vertical-align:middle");

export type Banner = { bg: string; dark?: boolean; pill: string; title: string; sub: string; visual?: string };

// ---------- Illustration pieces ----------
const card = (inner: string, w: number, extra = "") => `<table role="presentation" cellspacing="0" cellpadding="0" width="${w}" style="width:${w}px;background:#ffffff;border-radius:14px;box-shadow:0 8px 24px rgba(15,23,43,.12);${extra}"><tr><td style="padding:12px">${inner}</td></tr></table>`;
const chipCard = (inner: string, ml = 40) => `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:8px 0 0 ${ml}px;background:#ffffff;border-radius:14px;box-shadow:0 8px 24px rgba(15,23,43,.12)"><tr><td style="padding:10px 12px;font:500 12px/16px ${FONT};color:${INK};white-space:nowrap">${inner}</td></tr></table>`;
const pillTag = (text: string, tone: "green" | "amber" | "blue" = "green") => {
  const c = { green: ["#dcfce7", "#15803d"], amber: ["#fef3c7", "#b45309"], blue: ["#eaf3fe", "#1463d1"] }[tone];
  return `<span style="display:inline-block;background:${c[0]};color:${c[1]};border-radius:999px;padding:2px 7px;font:500 12px/16px ${FONT};white-space:nowrap">${text}</span>`;
};
const avatar = (initials: string, color: string, size = 32, ring = "") => `<table role="presentation" cellspacing="0" cellpadding="0" style="display:inline-table"><tr><td width="${size}" height="${size}" align="center" valign="middle" style="width:${size}px;height:${size}px;border-radius:999px;background:${color};color:#fff;font:500 ${Math.round(size * 0.4)}px/1 ${FONT};${ring}">${esc(initials)}</td></tr></table>`;
const bars = (hs: number[], hi: number, gap = 3, radius = 3) => `<table role="presentation" cellspacing="0" cellpadding="0" width="100%"><tr valign="bottom">${hs.map((h, i) => `<td style="padding:0 ${i === hs.length - 1 ? 0 : gap}px 0 0"><div style="height:${h}px;background:${i === hi ? "#4d94f7" : "#dce9fd"};border-radius:${radius}px;font-size:0;line-height:0">&nbsp;</div></td>`).join("")}</tr></table>`;
const row = (left: string, right: string, style = "") => `<table role="presentation" cellspacing="0" cellpadding="0" width="100%" style="${style}"><tr><td style="font:13px/18px ${FONT};color:#4b5563">${left}</td><td align="right" style="font:13px/18px ${FONT};color:${INK};white-space:nowrap">${right}</td></tr></table>`;
export const initials = (name: string) => { const w = String(name || "?").replace(/@.*/, "").split(/[\s._-]+/).filter(Boolean)[0] || "?"; return w.charAt(0).toUpperCase() + w.charAt(1).toLowerCase(); };
const COLORS = ["#3b8bff", "#ff7a3d", "#ff4f8b", "#14c7b0", "#8b5cf6", "#ff5a5a"];
export const colorFor = (s: string) => COLORS[[...String(s)].reduce((a, c) => a + c.charCodeAt(0), 0) % COLORS.length];

export const visual = {
  welcome: () => card(`${img("app-icon", 40, 40)}
    <div style="font:600 14px/20px ${FONT};color:${INK};margin:6px 0 4px">Getting started</div>
    <div style="font:13px/18px ${FONT};color:#9ca3af;padding:2px 0">${ico("check-circle-green")}&nbsp; Create your account</div>
    <div style="font:13px/18px ${FONT};color:${INK};padding:2px 0">${ico("flag")}&nbsp; Upload a document</div>
    <div style="font:13px/18px ${FONT};color:${INK};padding:2px 0">${ico("flag")}&nbsp; Share a tracked link</div>`, 200),
  code: (code: string) => card(`<div style="font:500 13px/18px ${FONT};color:#6b7280;margin-bottom:6px">Your code</div>
    <table role="presentation" cellspacing="0" cellpadding="0"><tr>${code.replace(/\D/g, "").split("").map((d, i) => `<td style="padding-right:${i === 5 ? 0 : 6}px"><div style="width:28px;height:36px;line-height:36px;text-align:center;background:#f2f4f7;border-radius:8px;font:500 20px/36px ${FONT};color:${INK}">${d}</div></td>`).join("")}</tr></table>`, 220),
  live: (o: { name: string; doc: string; line: string; tag?: string; chip?: string; chipIcon?: string }) =>
    card(`<table role="presentation" cellspacing="0" cellpadding="0" width="100%"><tr>
      <td width="40" valign="middle">${avatar(initials(o.name), colorFor(o.name))}</td>
      <td valign="middle" style="font:500 13px/18px ${FONT};color:${INK};max-width:110px;overflow:hidden">${esc(o.name.length > 22 ? o.name.slice(0, 21) + "…" : o.name)}<br><span style="font:12px/16px ${FONT};color:#6b7280">${esc(o.doc.length > 24 ? o.doc.slice(0, 23) + "…" : o.doc)}</span></td>
      <td align="right" valign="middle">${pillTag(o.tag || "● Live")}</td></tr></table>
      <div style="height:6px;line-height:6px;font-size:0">&nbsp;</div>${bars([10, 16, 8, 26, 14, 12, 6, 20, 9, 5, 15, 9, 7, 4], 6)}
      <div style="font:12px/16px ${FONT};color:#6b7280;margin-top:6px">${esc(o.line)}</div>`, 230)
    + (o.chip ? chipCard(`${ico(o.chipIcon || "send")}&nbsp; ${esc(o.chip)}`, 60) : ""),
  digest: (o: { total: number; delta: string | null; bars: number[]; hot?: string }) => {
    const max = Math.max(1, ...o.bars); const hs = o.bars.map((v) => Math.max(6, Math.round((v / max) * 40)));
    return card(`<div style="font:13px/18px ${FONT};color:#6b7280">Total visits</div>
      <table role="presentation" cellspacing="0" cellpadding="0" style="margin:2px 0 6px"><tr><td style="font:500 22px/28px ${FONT};color:${INK};padding-right:8px">${o.total}</td><td>${o.delta ? pillTag(esc(o.delta), o.delta.startsWith("↓") ? "amber" : "green") : ""}</td></tr></table>
      ${bars(hs, hs.indexOf(Math.max(...hs)), 4, 0)}`, 220) + (o.hot ? chipCard(`${ico("flame")}&nbsp; ${esc(o.hot)}`, 60) : "");
  },
  signed: (o: { title: string; signer: string; when: string; done?: boolean }) => card(`<table role="presentation" cellspacing="0" cellpadding="0" width="100%"><tr>
      <td style="font:500 12px/16px ${FONT};color:#9ca3af;text-transform:uppercase">${esc(o.title.slice(0, 26))}</td>
      ${o.done ? `<td align="right" width="30"><div style="width:30px;height:30px;border-radius:999px;background:#16a34a;text-align:center;line-height:0">${img("i-check-white", 22, 22, "", "display:inline-block;margin-top:4px")}</div></td>` : ""}</tr></table>
    ${[180, 160, 170].map((w) => `<div style="width:${w}px;max-width:100%;height:5px;background:#eef0f3;border-radius:3px;margin:6px 0 0;font-size:0;line-height:0">&nbsp;</div>`).join("")}
    <div style="font:italic 26px/34px Georgia,'Times New Roman',serif;color:${INK};margin-top:4px">${esc(o.signer.split(" ")[0])}</div>
    <div style="font:12px/16px ${FONT};color:#6b7280">${esc(o.when)}</div>`, 210),
  signHere: (o: { title: string; who: string }) => card(`<div style="font:500 12px/16px ${FONT};color:#9ca3af;text-transform:uppercase">${esc(o.title.slice(0, 26))}</div>
    ${[180, 160, 170].map((w) => `<div style="width:${w}px;max-width:100%;height:5px;background:#eef0f3;border-radius:3px;margin:6px 0 0;font-size:0;line-height:0">&nbsp;</div>`).join("")}
    <div style="margin-top:10px;border:1.5px dashed #7fb2f5;background:#f0f6fe;border-radius:10px;padding:8px 10px"><div style="font:600 11px/14px ${FONT};color:#1463d1;text-transform:uppercase;letter-spacing:.04em">Sign here</div><div style="font:italic 22px/28px Georgia,serif;color:#9ca3af">${esc(o.who.split(" ")[0])}</div></div>`, 210),
  fileRequest: (o: { title: string; files?: { name: string; done: boolean }[] }) => card(`<div style="font:600 14px/20px ${FONT};color:${INK};margin-bottom:6px">${esc(o.title.slice(0, 28))}</div>
    <div style="border:1px dashed #b6c2d6;border-radius:10px;padding:12px 0;text-align:center">${img("i-upload", 18, 18, "", "display:inline-block")}<div style="font:500 13px/18px ${FONT};color:${INK};margin-top:4px">Drop files here</div></div>
    ${(o.files || []).slice(0, 3).map((f) => `<table role="presentation" cellspacing="0" cellpadding="0" width="100%" style="margin-top:6px"><tr><td width="20">${ico("file")}</td><td style="font:12px/16px ${FONT};color:${INK}">${esc(f.name.length > 18 ? f.name.slice(0, 17) + "…" : f.name)}</td><td align="right">${f.done ? pillTag("Uploaded") : pillTag("Pending", "amber")}</td></tr></table>`).join("")}`, 220),
  room: (o: { name: string; meta: string; lines?: string[]; cta: string; icon?: string }) => card(`<table role="presentation" cellspacing="0" cellpadding="0" width="100%"><tr>
      <td width="42" valign="middle"><div style="width:34px;height:34px;border-radius:999px;background:#eaf3fe;text-align:center;line-height:0">${img(`i-${o.icon || "space"}`, 18, 18, "", "display:inline-block;margin-top:8px")}</div></td>
      <td valign="middle" style="font:500 13px/18px ${FONT};color:${INK}">${esc(o.name.length > 24 ? o.name.slice(0, 23) + "…" : o.name)}<br><span style="font:12px/16px ${FONT};color:#6b7280">${esc(o.meta)}</span></td></tr></table>
    ${(o.lines || []).slice(0, 3).map((l) => `<div style="font:12px/16px ${FONT};color:${INK};margin-top:6px">${ico("folder")}&nbsp; ${esc(l.length > 26 ? l.slice(0, 25) + "…" : l)}</div>`).join("")}
    <div style="margin-top:8px;background:#edfc48;border-radius:10px;padding:7px 0;text-align:center;font:500 13px/18px ${FONT};color:#0a0a0a">${esc(o.cta)}</div>`, 220),
  quote: (o: { name: string; doc: string; text: string; tag: string; chip?: string; chipIcon?: string }) => card(`<table role="presentation" cellspacing="0" cellpadding="0" width="100%"><tr>
      <td width="40" valign="middle">${avatar(initials(o.name), colorFor(o.name))}</td>
      <td valign="middle" style="font:500 13px/18px ${FONT};color:${INK}">${esc(o.name.length > 22 ? o.name.slice(0, 21) + "…" : o.name)}<br><span style="font:12px/16px ${FONT};color:#6b7280">${esc(o.doc.length > 24 ? o.doc.slice(0, 23) + "…" : o.doc)}</span></td>
      <td align="right" valign="middle">${pillTag(esc(o.tag), "blue")}</td></tr></table>
    <div style="margin-top:8px;background:#f6f5f8;border-radius:10px;padding:8px 10px;font:12px/16px ${FONT};color:${INK}">“${esc(o.text.length > 110 ? o.text.slice(0, 109) + "…" : o.text)}”</div>`, 230)
    + (o.chip ? chipCard(`${ico(o.chipIcon || "message")}&nbsp; ${esc(o.chip)}`, 60) : ""),
  product: (o: { q: string; a: string }) => card(`<table role="presentation" cellspacing="0" cellpadding="0" width="100%"><tr><td><div style="display:inline-block;background:${INK};border-radius:10px;padding:7px 10px;font:500 12px/16px ${FONT};color:#fff">${esc(o.q)}</div></td>
      <td align="right" valign="top" width="28"><div style="width:28px;height:28px;border-radius:999px;background:#edfc48;text-align:center;line-height:0">${img("i-sparkles-dark", 16, 16, "", "display:inline-block;margin-top:6px")}</div></td></tr></table>
    <div style="font:500 12px/16px ${FONT};color:${INK};margin-top:8px">${ico("sparkles")}&nbsp; Dozzier</div>
    <div style="font:12px/16px ${FONT};color:#4b5563;margin-top:4px">${esc(o.a)}</div>`, 226),
  trial: (days: number) => `<table role="presentation" cellspacing="0" cellpadding="0" align="center"><tr><td width="96" height="96" align="center" valign="middle" style="width:96px;height:96px;border-radius:999px;border:12px solid #d97706;border-top-color:#fde68a;background:transparent">
      <div style="font:500 28px/34px ${FONT};color:${INK}">${days}</div><div style="font:500 12px/16px ${FONT};color:#92400e">day${days === 1 ? "" : "s"} left</div></td></tr></table>`,
  receipt: (o: { invoice: string; line: string; amount: string; tax: string; total: string }) => card(`<div style="font:500 12px/16px ${FONT};color:#9ca3af">${esc(o.invoice)}</div>
    ${row(esc(o.line), esc(o.amount), "margin-top:6px")}${row("Tax", esc(o.tax), "margin-top:4px")}
    <div style="height:1px;background:#e5e7eb;margin:8px 0;font-size:0;line-height:0">&nbsp;</div>
    <table role="presentation" cellspacing="0" cellpadding="0" width="100%"><tr><td style="font:600 14px/20px ${FONT};color:${INK}">Total paid</td><td align="right" style="font:600 14px/20px ${FONT};color:${INK}">${esc(o.total)}</td></tr></table>
    <div style="margin-top:6px">${pillTag("✓ Paid")}</div>`, 210),
  team: (o: { people: string[]; line: string; ring: string }) => `<table role="presentation" cellspacing="0" cellpadding="0" style="margin-left:16px"><tr>${o.people.slice(0, 3).map((p, i) => `<td style="padding:0;${i ? "padding-left:0" : ""}"><div style="margin-left:${i ? -12 : 0}px">${avatar(initials(p), colorFor(p), 56, `border:3px solid ${o.ring}`)}</div></td>`).join("")}
      <td><div style="margin-left:-12px;width:52px;height:52px;border-radius:999px;background:#fff;border:2px dashed #2577ea;text-align:center;line-height:0">${img("i-plus", 20, 20, "", "display:inline-block;margin-top:16px")}</div></td></tr></table>`
    + chipCard(`${ico("users")}&nbsp; ${esc(o.line)}`, 36),
  reset: (where: string) => card(`<div style="text-align:center"><div style="display:inline-block;width:50px;height:50px;border-radius:999px;background:#eaf3fe;line-height:0">${img("i-lock", 26, 26, "", "display:inline-block;margin-top:12px")}</div>
    <div style="font:18px/16px ${FONT};color:${INK};letter-spacing:3px;margin:8px 0 6px">••••••••</div>
    <div style="font:12px/16px ${FONT};color:#6b7280">${esc(where)}</div></div>`, 180),
};

// ---------- Body pieces ----------
export const p = (html: string, strong = false) => `<p style="margin:0 0 18px;font:15px/22px ${FONT};color:${strong ? INK : "#374151"}">${html}</p>`;
export const text = (t: string) => esc(t).split(/\n{2,}/).map((x) => p(x.replace(/\n/g, "<br>").replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" style="color:#2577ea;text-decoration:underline">$1</a>'))).join("");
export const button = (label: string, url: string) => `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:4px 0 22px"><tr><td style="border-radius:10px;background:#2577ea"><a href="${esc(url)}" style="display:inline-block;padding:13px 24px;font:600 14px/20px ${FONT};color:#ffffff;text-decoration:none;border-radius:10px">${esc(label)}</a></td></tr></table>`;
export const steps = (items: [string, string][]) => `<table role="presentation" cellspacing="0" cellpadding="0" width="100%" style="margin:0 0 18px">${items.map(([t, d], i) => `<tr><td width="36" valign="top" style="padding:0 0 10px"><div style="width:24px;height:24px;line-height:24px;border-radius:999px;background:#eaf3fe;color:#2577ea;text-align:center;font:500 13px/24px ${FONT}">${i + 1}</div></td><td valign="top" style="padding:0 0 10px"><div style="font:500 15px/22px ${FONT};color:${INK}">${esc(t)}</div><div style="font:14px/20px ${FONT};color:#4b5563">${esc(d)}</div></td></tr>`).join("")}</table>`;
export const codeBlock = (code: string) => `<div style="margin:0 0 18px;font:600 32px/40px ui-monospace,Menlo,Consolas,monospace;letter-spacing:.18em;color:${INK}">${esc(code)}</div>`;
export const quoteBlock = (t: string) => `<div style="margin:0 0 18px;border-left:3px solid #4d94f7;background:#f6f5f8;border-radius:0 10px 10px 0;padding:12px 16px;font:15px/22px ${FONT};color:${INK}">${esc(t).replace(/\n/g, "<br>")}</div>`;
export const facts = (rows: [string, string][]) => `<table role="presentation" cellspacing="0" cellpadding="0" width="100%" style="margin:0 0 18px;border:1px solid #e5e7eb;border-radius:12px">${rows.map(([k, v], i) => `<tr><td style="padding:10px 14px;font:14px/20px ${FONT};color:#6b7280;${i ? "border-top:1px solid #e5e7eb" : ""}">${esc(k)}</td><td align="right" style="padding:10px 14px;font:500 14px/20px ${FONT};color:${INK};${i ? "border-top:1px solid #e5e7eb" : ""}">${esc(v)}</td></tr>`).join("")}</table>`;
export const muted = (t: string) => `<p style="margin:0 0 18px;font:13px/18px ${FONT};color:#6b7280">${esc(t)}</p>`;
export const signoff = (from = "The Dozzier team") => p(`— ${esc(from)}`);

// ---------- Footer ----------
export type Footer = { reason: string; account?: boolean };
function footer(f: Footer) {
  const link = (label: string, url: string) => `<a href="${url}" style="color:#374151;text-decoration:underline;font:500 13px/18px ${FONT}">${label}</a>`;
  const dot = `<span style="color:#9ca3af;font:13px/18px ${FONT};padding:0 6px">·</span>`;
  const links = f.account
    ? [link("Manage notifications", `${SITE}/app/settings/notifications`), link("Unsubscribe", `${SITE}/app/settings/notifications`), link("Help center", `${SITE}/docs`), link("Privacy", `${SITE}/legal/privacy`)]
    : [link("What is Dozzier?", SITE), link("Help center", `${SITE}/docs`), link("Privacy", `${SITE}/legal/privacy`)];
  const social = (n: string, url: string) => `<td style="padding:0 5px"><a href="${url}" style="display:inline-block;width:28px;height:28px;border-radius:999px;background:#fff;border:1px solid #e5e7eb;text-align:center;line-height:0">${img(`i-${n}`, 14, 14, n, "display:inline-block;margin-top:7px")}</a></td>`;
  return `<tr><td align="center" style="background:#f6f5f8;padding:28px 40px 32px">
    <a href="${SITE}">${img("footer-logo", 155, 22, "Dozzier")}</a>
    <table role="presentation" cellspacing="0" cellpadding="0" style="margin:16px auto 0"><tr>${social("at", `mailto:hello@dozzier.co`)}${social("mail", `${SITE}/talk-to-sales`)}${social("globe", SITE)}</tr></table>
    <div style="height:1px;background:#e5e7eb;margin:16px 0;font-size:0;line-height:0">&nbsp;</div>
    <div style="line-height:18px">${links.join(dot)}</div>
    <p style="margin:16px auto 0;max-width:440px;font:12px/16px ${FONT};color:#6b7280">${esc(f.reason)}</p>
    <p style="margin:16px 0 0;font:12px/16px ${FONT};color:#9ca3af">© ${new Date().getFullYear()} Surce Inc. · Dozzier is a product of Surce Inc.</p>
  </td></tr>`;
}

/** Full email document. */
export function renderEmail(o: { preheader?: string; banner: Banner; body: string; footer: Footer }) {
  const b = o.banner; const dark = !!b.dark;
  const shell = dark ? INK : "#ffffff";
  const vis = b.visual ? `<td class="dz-vis" width="250" valign="middle" align="center" style="width:250px;padding:20px 12px 20px 0">${b.visual}</td>` : "";
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light">
<title>${esc(b.title)}</title>
<style>
@font-face{font-family:'Calamantus';font-weight:400;src:url(${SITE}/fonts/Calamantus-Regular.woff) format('woff')}
@font-face{font-family:'Calamantus';font-weight:500;src:url(${SITE}/fonts/Calamantus-Medium.woff) format('woff')}
@font-face{font-family:'Calamantus';font-weight:600;src:url(${SITE}/fonts/Calamantus-SemiBold.woff) format('woff')}
body{margin:0;padding:0;-webkit-text-size-adjust:100%}
@media (max-width:620px){.dz-wrap{padding:0!important}.dz-vis{display:none!important}.dz-txt{width:auto!important;padding:28px 22px!important}.dz-body{padding:28px 22px 30px!important}.dz-bar{padding:18px 22px 14px!important}.dz-ban{padding:0 12px 16px!important}}
</style></head>
<body style="margin:0;padding:0;background:#f3f4f6">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(o.preheader || b.sub)}&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f4f6"><tr><td align="center" class="dz-wrap" style="padding:28px 12px">
<table role="presentation" width="600" cellspacing="0" cellpadding="0" style="width:100%;max-width:600px;background:#ffffff">
  <tr><td style="background:${shell}">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td class="dz-bar" style="padding:22px 32px 18px"><a href="${SITE}">${img(dark ? "logo-dark" : "logo", 109, 20, "Dozzier")}</a></td></tr>
    <tr><td class="dz-ban" style="padding:0 24px 24px">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${b.bg}"><tr>
        <td class="dz-txt" valign="middle" style="padding:36px 16px 36px 28px">
          <span style="display:inline-block;background:${dark ? "rgba(255,255,255,.12)" : "rgba(15,25,44,.06)"};border-radius:999px;padding:3px 10px;font:500 12px/16px ${FONT};color:${dark ? "#ffffff" : INK};text-transform:uppercase">${esc(b.pill)}</span>
          <div style="margin-top:8px;font:500 26px/1.12 ${FONT};letter-spacing:-.13px;color:${dark ? "#ffffff" : INK}">${esc(b.title)}</div>
          <div style="margin-top:8px;font:14px/20px ${FONT};color:${dark ? "#b6c2d6" : "#4b5563"}">${esc(b.sub)}</div>
        </td>${vis}
      </tr></table>
    </td></tr></table>
  </td></tr>
  <tr><td class="dz-body" style="padding:32px 40px 18px;font:15px/22px ${FONT};color:#374151">${o.body}</td></tr>
  ${footer(o.footer)}
</table></td></tr></table></body></html>`;
}
