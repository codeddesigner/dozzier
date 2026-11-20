// Server-only: every email Dozzier sends, each with its Figma header (Figma › Emails).
import { SITE } from "./site";
import { renderEmail, visual, p, text, button, steps, codeBlock, quoteBlock, facts, muted, signoff, esc, type Banner } from "./templates";

export type Built = { subject: string; html: string; text: string };
/** "Paul Adeyemi" → "Paul"; "paul.adeyemi@acme.com" → "Paul". */
const first = (s?: string | null) => { const t = (s || "").trim(); if (!t) return "there"; const w = t.includes("@") ? t.split("@")[0].split(/[._+-]/)[0] : t.split(/\s+/)[0]; return w.charAt(0).toUpperCase() + w.slice(1); };
const short = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + "…" : s);
const plain = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join("\n\n");
const today = () => new Date().toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
const accountFooter = (why: string) => ({ reason: why, account: true });

// ---------- Alerts to the owner (Settings → Notifications) ----------
export type AlertPayload = {
  event: "open" | "question" | "download" | "signed" | "upload" | "request";
  who?: string | null; company?: string | null; doc?: string | null; location?: string | null; page?: number | null; body?: string | null;
  count?: number | null; file?: string | null; title?: string | null; completed?: boolean | null; returning?: boolean | null; url: string;
};
export function alertEmail(a: AlertPayload): Built & { heading: string; line: string; cta: string } {
  const who = a.who || "Someone"; const from = a.company ? `${who} (${a.company})` : who;
  const doc = a.doc || "your document";
  const foot = accountFooter("You’re getting this because alerts are on for this event. Change them in Settings → Notifications.");
  let subject = "", banner: Banner, body = "", cta = "Open in Dozzier", heading = "", line = "";
  switch (a.event) {
    case "open":
      subject = `${who} ${a.returning ? "is back on" : "opened"} ${doc}`;
      heading = `${first(who)} is reading ${a.doc ? "your document" : "your link"} right now`;
      line = `${from} ${a.returning ? "came back to" : "just opened"} ${doc}${a.location ? ` from ${a.location}` : ""}.`;
      banner = { bg: "#16233d", dark: true, pill: a.returning ? "Back again" : "Live alert", title: heading, sub: `${short(doc, 40)}${a.location ? ` · ${a.location}` : ""}. A great moment to follow up.`,
        visual: visual.live({ name: who, doc, line: a.returning ? "Returning visitor · opened just now" : "Opened just now", chip: a.company ? `${a.company}` : a.location || undefined, chipIcon: "eye" }) };
      body = p(esc(line)) + p("You’ll see every page they read, and for how long, on their profile.") + button(cta = "See their activity", a.url);
      break;
    case "question":
      subject = `${who} asked a question on ${doc}`; heading = `${first(who)} asked a question`;
      line = `${from} asked a question${a.page ? ` on page ${a.page}` : ""} of ${doc}.`;
      banner = { bg: "#16233d", dark: true, pill: "Question", title: heading, sub: `${a.page ? `Page ${a.page} of ` : "On "}${short(doc, 40)}. Reply and they’ll see it next to the page.`,
        visual: visual.quote({ name: who, doc, text: a.body || "", tag: a.page ? `Page ${a.page}` : "Q&A" }) };
      body = p(esc(line)) + quoteBlock((a.body || "").slice(0, 800)) + button(cta = "Reply", a.url);
      break;
    case "download":
      subject = `${who} downloaded ${doc}`; heading = `${first(who)} downloaded ${a.doc ? "your document" : "a file"}`;
      line = `${from} downloaded a copy of ${doc}.`;
      banner = { bg: "#16233d", dark: true, pill: "Download", title: heading, sub: `${short(doc, 50)} — a copy is now on their device.`,
        visual: visual.live({ name: who, doc, line: "Downloaded a copy just now", tag: "↓ Saved", chip: a.company || undefined, chipIcon: "download" }) };
      body = p(esc(line)) + p("Their full activity, including every page they read before downloading, is on their profile.") + button(cta = "See their activity", a.url);
      break;
    case "signed": {
      const t = a.title || "your agreement";
      subject = a.completed ? `“${t}” is fully signed` : `${who} signed “${t}”`;
      heading = a.completed ? `${first(who)} signed — it’s complete` : `${first(who)} signed ${short(t, 30)}`;
      line = a.completed ? `Everyone has signed “${t}”. The certificate of completion and the signed PDF are ready.` : `${who} signed “${t}”. You’ll get another email when everyone has signed.`;
      banner = { bg: "#e8f7ee", pill: a.completed ? "Completed" : "Signed", title: heading, sub: a.completed ? "All parties have signed. The certificate is ready for your records." : "One more signature in. We’ll tell you when everyone’s done.",
        visual: visual.signed({ title: t, signer: who, when: `Signed ${today()}`, done: !!a.completed }) };
      body = p(esc(line)) + button(cta = a.completed ? "Download signed PDF" : "View status", a.url);
      break;
    }
    case "upload": {
      const what = a.count && a.count > 1 ? `${a.count} files` : a.file || "a file";
      subject = `${who} uploaded ${what}`; heading = `New upload to ${short(a.title || "your request", 28)}`;
      line = `${who} uploaded ${a.file || "a file"} to your request “${a.title}”.`;
      banner = { bg: "#eaf3fe", pill: "New upload", title: heading, sub: `${short(who, 30)} uploaded ${what}. It’s already in the right folder.`,
        visual: visual.fileRequest({ title: a.title || "File request", files: [{ name: a.file || "File", done: true }] }) };
      body = p(esc(line)) + (a.body ? quoteBlock(a.body.slice(0, 400)) : "") + button(cta = "View files", a.url);
      break;
    }
    case "request":
      subject = `${who} requested “${short(a.title || "", 80)}”`; heading = "New request in your data room";
      line = `${from} asked for “${a.title}” in ${doc}.`;
      banner = { bg: "#16233d", dark: true, pill: "Diligence request", title: heading, sub: `${short(who, 30)} asked for “${short(a.title || "", 40)}”.`,
        visual: visual.room({ name: doc, meta: "Request tracker", lines: [a.title || "New request"], cta: "Open request tracker", icon: "message" }) };
      body = p(esc(line)) + (a.body ? quoteBlock(a.body.slice(0, 500)) : "") + button(cta = "Open request tracker", a.url);
      break;
  }
  return { subject, heading, line, cta, html: renderEmail({ preheader: line, banner: banner!, body, footer: foot }), text: plain(line, a.body && `“${a.body}”`, `${cta}: ${a.url}`) };
}

// ---------- Viewer verification code ----------
export function viewCodeEmail(o: { code: string; sender: string; doc: string }): Built {
  const spaced = `${o.code.slice(0, 3)} ${o.code.slice(3)}`;
  return {
    subject: `${spaced} is your code to view “${o.doc}”`,
    html: renderEmail({ preheader: `Your viewing code is ${spaced}`,
      banner: { bg: "#eaf3fe", pill: "Security", title: "Here’s your code", sub: "Enter it to open the document. It expires in 15 minutes.", visual: visual.code(o.code) },
      body: p(`Enter this code to view “${esc(o.doc)}” from ${esc(o.sender)}:`) + codeBlock(spaced) + muted("It expires in 15 minutes. If you didn’t ask for it, you can ignore this email."),
      footer: { reason: `You’re receiving this because someone used this address to open a document shared by ${o.sender} on Dozzier.` } }),
    text: `Your code to view “${o.doc}” from ${o.sender} is ${spaced}.\n\nIt expires in 15 minutes. If you didn’t ask for it, you can ignore this email.`,
  };
}

// ---------- Emails people send through Dozzier ----------
export type UserKind = "invite" | "sign" | "file_request" | "reminder" | "share" | "follow_up" | "update" | "nudge";
export type UserMeta = { template?: "team_invite" | "room_invite" | "sign" | "sign_reminder" | "file_request" | "file_reminder" | "share" | "update" | "message"; title?: string; role?: string; workspace?: string; items?: string[]; due?: string; subtitle?: string };
/** Picks the Figma header for an email someone sends from the app. Message text stays exactly as they wrote it. */
export function userEmail(o: { kind: UserKind; meta?: UserMeta; heading?: string; subject: string; message: string; cta?: { label: string; url: string }; sender: string; workspace?: string | null }): string {
  const m = o.meta || {};
  const t = m.template || ({ invite: "team_invite", sign: "sign", file_request: "file_request", reminder: "message", share: "share", follow_up: "message", update: "update", nudge: "message" } as const)[o.kind];
  const title = (m.title || "").slice(0, 120);
  const s = o.sender; const ws = m.workspace || o.workspace || "";
  let banner: Banner;
  switch (t) {
    case "team_invite": banner = { bg: "#eaf3fe", pill: "Team", title: o.heading || `Join ${ws || "the team"} on Dozzier`, sub: `${s} invited you${m.role ? ` as ${/^[AE]/.test(m.role) ? "an" : "a"} ${m.role}` : ""}. Accept to start sharing with your team.`,
      visual: visual.team({ people: [s, ...(ws ? [ws] : [])], line: `${m.role ? `Role: ${m.role}` : "Teammate"}${ws ? ` · ${short(ws, 16)}` : ""}`, ring: "#eaf3fe" }) }; break;
    case "room_invite": banner = { bg: "#16233d", dark: true, pill: "Invitation", title: "You’re invited to a data room", sub: `${s}${ws ? ` at ${ws}` : ""} shared “${short(title || "a data room", 40)}” with you.`,
      visual: visual.room({ name: title || "Data room", meta: m.subtitle || "Secure data room", lines: m.items, cta: "Open data room" }) }; break;
    case "sign": banner = { bg: "#eaf3fe", pill: "Signature request", title: o.heading || `Please sign ${short(title, 30)}`, sub: `${s} sent you “${short(title || "an agreement", 40)}” to sign. It takes about a minute.`,
      visual: visual.signHere({ title: title || "Agreement", who: "Your name" }) }; break;
    case "sign_reminder": banner = { bg: "#fef3c7", pill: "Reminder", title: o.heading || "Waiting for your signature", sub: `“${short(title || "An agreement", 40)}” from ${s} still needs your signature.`,
      visual: visual.signHere({ title: title || "Agreement", who: "Your name" }) }; break;
    case "file_request": banner = { bg: "#eaf3fe", pill: "File request", title: o.heading || `${first(s)} requested files from you`, sub: `Upload them securely — no account needed.${m.due ? ` Due ${m.due}.` : ""}`,
      visual: visual.fileRequest({ title: title || "Files", files: (m.items || []).map((n) => ({ name: n, done: false })) }) }; break;
    case "file_reminder": banner = { bg: "#fef3c7", pill: "Reminder", title: o.heading || `A quick reminder about ${short(title, 28)}`, sub: `${s} is still waiting for your files.${m.due ? ` Due ${m.due}.` : ""}`,
      visual: visual.fileRequest({ title: title || "Files", files: (m.items || []).map((n) => ({ name: n, done: false })) }) }; break;
    case "share": banner = { bg: "#16233d", dark: true, pill: "Shared with you", title: o.heading || `${first(s)} shared ${title ? short(title, 30) : "a document"}`, sub: `${s}${ws ? ` at ${ws}` : ""} sent you a secure link.`,
      visual: visual.room({ name: title || "Document", meta: "Secure link · tracked by Dozzier", cta: o.cta?.label?.slice(0, 22) || "Open document", icon: "eye" }) }; break;
    case "update": banner = { bg: "#0f192c", dark: true, pill: "Updated", title: o.heading || `${short(title || "A document", 34)} was updated`, sub: `${s} shared a new version. Your link now opens the latest one.`,
      visual: visual.room({ name: title || "Document", meta: "New version available", cta: "View latest version", icon: "eye" }) }; break;
    default: banner = { bg: "#f3f1ed", pill: o.kind === "reminder" ? "Reminder" : "Message", title: o.heading || o.subject, sub: `From ${s}${ws ? ` · ${ws}` : ""}` };
  }
  return renderEmail({ preheader: o.message.slice(0, 120), banner, body: text(o.message) + (o.cta ? button(o.cta.label, o.cta.url) : ""),
    footer: { reason: `${s}${ws ? ` · ${ws}` : ""} sent you this through Dozzier. Reply to this email to reach them directly.` } });
}

// ---------- Lifecycle ----------
export function welcomeEmail(o: { name?: string | null; workspace?: string | null }): Built {
  const hi = first(o.name);
  return {
    subject: `Welcome to Dozzier, ${hi}`,
    html: renderEmail({ preheader: "Your workspace is ready. Share your first tracked link in under two minutes.",
      banner: { bg: "#edfc48", pill: "Welcome", title: `Welcome aboard, ${hi}`, sub: "Your workspace is ready. Share your first tracked link in under two minutes.", visual: visual.welcome() },
      body: p(`Hi ${esc(hi)},`, true) + p(`Welcome to Dozzier! Your workspace${o.workspace ? `, ${esc(o.workspace)},` : ""} is ready. Here’s the fastest way to see what it can do:`)
        + steps([["Upload a document", "A deck, proposal or PDF — we count the pages and get it ready to share."], ["Share a tracked link", "Send one link per recipient so you know exactly who’s reading."], ["Watch the first visit roll in", "See every page they read, live, from your dashboard."]])
        + button("Upload your first document", `${SITE}/app/content?upload=1`)
        + p(`Prefer a walkthrough? Reply to this email or <a href="${SITE}/talk-to-sales" style="color:#2577ea">book a demo</a> — we’re happy to help.`) + signoff(),
      footer: accountFooter("You’re receiving this because you created a Dozzier account.") }),
    text: `Hi ${hi},\n\nWelcome to Dozzier! Your workspace is ready.\n\n1. Upload a document\n2. Share a tracked link\n3. Watch the first visit roll in\n\nUpload your first document: ${SITE}/app/content?upload=1\n\n— The Dozzier team`,
  };
}

export function trialEndingEmail(o: { name?: string | null; days: number; ends: string }): Built {
  const d = Math.max(1, o.days); const title = `${d} day${d === 1 ? "" : "s"} left in your trial`;
  return {
    subject: `Your trial ends in ${d} day${d === 1 ? "" : "s"}`,
    html: renderEmail({ preheader: "Pick a plan to keep your links, analytics and data rooms running.",
      banner: { bg: "#fef3c7", pill: "Trial", title, sub: "Pick a plan to keep your links, analytics and data rooms running.", visual: visual.trial(d) },
      body: p(`Hi ${esc(first(o.name))},`, true) + p(`Your free trial ends on <b>${esc(o.ends)}</b>. After that, your links stop opening for visitors until you choose a plan. Nothing is deleted.`)
        + facts([["Personal", "$5 / month"], ["Standard", "$25 / user / month"], ["Data Rooms", "$140 / month"]]) + button("Choose a plan", `${SITE}/app/upgrade`)
        + muted("Save 20% when you pay yearly. Questions about which plan fits? Just reply.") + signoff(),
      footer: accountFooter("You’re receiving this because your Dozzier trial is ending.") }),
    text: `Your Dozzier trial ends on ${o.ends}. Choose a plan to keep your links running: ${SITE}/app/upgrade`,
  };
}

export function receiptEmail(o: { name?: string | null; plan: string; interval: string; seats?: number | null; amount: string; reference: string; date: string; currency: string }): Built {
  const line = `${o.plan}${o.seats && o.seats > 1 ? ` · ${o.seats} users` : " · 1 user"}`;
  return {
    subject: `Your Dozzier receipt · ${o.amount}`,
    html: renderEmail({ preheader: `Payment received — ${o.amount} for ${o.plan}.`,
      banner: { bg: "#f2f4f7", pill: "Receipt", title: "Payment received — thank you", sub: `${o.plan} plan · ${o.date}. Billed ${o.interval}.`,
        visual: visual.receipt({ invoice: `REF ${o.reference.slice(0, 18).toUpperCase()}`, line, amount: o.amount, tax: "Included", total: o.amount }) },
      body: p(`Hi ${esc(first(o.name))},`, true) + p("Thanks for your payment. Here are the details for your records:")
        + facts([["Plan", line], ["Billing", o.interval === "annually" ? "Yearly" : "Monthly"], ["Amount", `${o.amount} (${o.currency})`], ["Date", o.date], ["Reference", o.reference]])
        + button("View billing", `${SITE}/app/settings/billing`) + muted("Invoice PDFs are under Settings → Billing → Manage subscription. Need your company details on them? Reply to this email.") + signoff(),
      footer: accountFooter("You’re receiving this because a payment was made for your Dozzier workspace.") }),
    text: `Payment received: ${o.amount} for ${line} (${o.interval}). Reference ${o.reference}. ${SITE}/app/settings/billing`,
  };
}

export function digestEmail(o: { name?: string | null; visits: number; prev: number; docs: number; days: number[]; hot: { name: string; visits: number }[]; top: { doc: string; visits: number }[] }): Built {
  const delta = o.prev ? Math.round(((o.visits - o.prev) / o.prev) * 100) : null;
  const d = delta === null ? null : `${delta >= 0 ? "↑" : "↓"} ${Math.abs(delta)}%`;
  const hotLine = o.hot.length ? `${o.hot.length} account${o.hot.length === 1 ? "" : "s"} coming back for more` : "your links are live";
  return {
    subject: `Your week: ${o.visits} visit${o.visits === 1 ? "" : "s"}${o.hot.length ? `, ${o.hot.length} active account${o.hot.length === 1 ? "" : "s"}` : ""}`,
    html: renderEmail({ preheader: `${o.visits} visits across ${o.docs} documents — and ${hotLine}.`,
      banner: { bg: "#f3f1ed", pill: "Weekly digest", title: "Your week in Dozzier", sub: `${o.visits} visit${o.visits === 1 ? "" : "s"} across ${o.docs} document${o.docs === 1 ? "" : "s"} — and ${hotLine}.`,
        visual: visual.digest({ total: o.visits, delta: d, bars: o.days, hot: o.hot[0] ? `${short(o.hot[0].name, 18)} · ${o.hot[0].visits} visit${o.hot[0].visits === 1 ? "" : "s"}` : undefined }) },
      body: p(`Hi ${esc(first(o.name))}, here’s what happened in the last 7 days.`, true)
        + (o.top.length ? facts(o.top.slice(0, 5).map((t) => [short(t.doc, 40), `${t.visits} visit${t.visits === 1 ? "" : "s"}`])) : "")
        + (o.hot.length ? p(`<b>Ready for a follow-up:</b> ${o.hot.slice(0, 3).map((h) => esc(h.name)).join(", ")}.`) : "")
        + button("Open your dashboard", `${SITE}/app`) + signoff(),
      footer: accountFooter("You’re receiving the weekly digest. Turn it off in Settings → Notifications.") }),
    text: `Your week in Dozzier: ${o.visits} visits across ${o.docs} documents. ${SITE}/app`,
  };
}

export function productUpdateEmail(o: { title: string; sub: string; bodyText: string; cta?: { label: string; url: string } | null; q?: string; a?: string }): Built {
  return {
    subject: `New in Dozzier: ${o.title}`,
    html: renderEmail({ preheader: o.sub || o.bodyText.slice(0, 120), banner: { bg: "#0f192c", dark: true, pill: "What’s new", title: o.title, sub: o.sub, visual: o.q && o.a ? visual.product({ q: o.q, a: o.a }) : undefined },
      body: text(o.bodyText) + (o.cta ? button(o.cta.label, o.cta.url) : "") + signoff(),
      footer: accountFooter("You’re receiving product updates because you have a Dozzier account. Turn them off in Settings → Notifications.") }),
    text: `${o.title}\n\n${o.bodyText}${o.cta ? `\n\n${o.cta.label}: ${o.cta.url}` : ""}\n\nTurn off product updates in Settings → Notifications.`,
  };
}

// ---------- Account emails (Supabase Auth → /api/hooks/auth-email) ----------
export function authEmail(o: { type: string; url: string; code?: string; email: string; name?: string | null }): Built {
  const hi = first(o.name || o.email.split("@")[0]);
  const foot = { reason: "You’re receiving this because someone used this address on Dozzier. If it wasn’t you, you can ignore this email.", account: false };
  switch (o.type) {
    case "recovery":
      return { subject: "Reset your Dozzier password",
        html: renderEmail({ preheader: "Use this link to choose a new password. It expires in 1 hour.",
          banner: { bg: "#f2f4f7", pill: "Account", title: "Reset your password", sub: "We got a request to reset your password. This link expires in 1 hour.", visual: visual.reset("Requested just now") },
          body: p(`Hi ${esc(hi)},`, true) + p("Click the button below to choose a new password for your Dozzier account.") + button("Reset password", o.url)
            + (o.code ? muted(`Or enter this code: ${o.code}`) : "") + muted("If you didn’t ask for this, you can ignore this email — your password won’t change."), footer: foot }),
        text: `Reset your Dozzier password: ${o.url}\n\nIf you didn’t ask for this, ignore this email.` };
    case "magiclink":
    case "reauthentication":
      return { subject: o.code ? `Your Dozzier sign-in code: ${o.code}` : "Your Dozzier sign-in link",
        html: renderEmail({ preheader: o.code ? `Your code is ${o.code}` : "Use this link to sign in.",
          banner: { bg: "#eaf3fe", pill: "Security", title: o.code ? "Here’s your sign-in code" : "Your sign-in link", sub: "Enter it to finish signing in. It expires in 10 minutes.", visual: o.code ? visual.code(o.code) : visual.reset("Requested just now") },
          body: p(`Hi ${esc(hi)},`, true) + (o.code ? p("Enter this code to finish signing in:") + codeBlock(o.code) : "") + (o.type === "magiclink" ? button("Sign in to Dozzier", o.url) : "")
            + muted("It expires in 10 minutes. If you didn’t try to sign in, you can ignore this email."), footer: foot }),
        text: `${o.code ? `Your sign-in code is ${o.code}. ` : ""}Sign in: ${o.url}` };
    case "email_change":
      return { subject: "Confirm your new email address",
        html: renderEmail({ preheader: "Confirm the change to your Dozzier email address.",
          banner: { bg: "#f2f4f7", pill: "Account", title: "Confirm your new email", sub: "Click the button to finish changing the email on your account.", visual: visual.reset("Email change requested") },
          body: p(`Hi ${esc(hi)},`, true) + p(`Confirm that <b>${esc(o.email)}</b> should be the new email for your Dozzier account.`) + button("Confirm email", o.url), footer: foot }),
        text: `Confirm your new Dozzier email: ${o.url}` };
    case "invite":
      return { subject: "You’ve been invited to Dozzier",
        html: renderEmail({ preheader: "Accept your invitation to Dozzier.",
          banner: { bg: "#eaf3fe", pill: "Team", title: "You’re invited to Dozzier", sub: "Accept to set your password and start sharing.", visual: visual.team({ people: ["Dozzier", o.email], line: "Invitation", ring: "#eaf3fe" }) },
          body: p("You’ve been invited to join a workspace on Dozzier.") + button("Accept invitation", o.url), footer: foot }),
        text: `Accept your Dozzier invitation: ${o.url}` };
    default: // signup confirmation
      return { subject: "Confirm your email to finish signing up",
        html: renderEmail({ preheader: "One click to confirm your email and open your workspace.",
          banner: { bg: "#edfc48", pill: "Welcome", title: `Confirm your email, ${hi}`, sub: "One click and your workspace is ready.", visual: visual.welcome() },
          body: p(`Hi ${esc(hi)},`, true) + p("Confirm this is your email address to finish creating your Dozzier account.") + button("Confirm email", o.url)
            + (o.code ? muted(`Or enter this code: ${o.code}`) : "") + muted("If you didn’t sign up, you can ignore this email."), footer: foot }),
        text: `Confirm your email to finish signing up: ${o.url}` };
  }
}
