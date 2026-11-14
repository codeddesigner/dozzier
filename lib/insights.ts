// Turns a contact's raw visits into the deep-dive: KPIs, heatmap, a plain-language read and a follow-up draft.
import { displayName, duration } from "@/lib/format";

export type IVisit = { id: string; document_id: string | null; link_id: string | null; duration_seconds: number; downloaded: boolean; pages_viewed: number; location: string | null; started_at: string; user_agent?: string | null;
  documents: { name: string; file_type: string; page_count: number } | null; links: { name: string } | null };
export type IPage = { visit_id: string; document_id: string; page_number: number; seconds: number };
export type IQuestion = { id: string; body: string; page_number: number; answer: string | null; created_at: string; document_id: string | null };
export type Event = { kind: "forward" | "page" | "download" | "open" | "question"; at: string; text: string; sub: string };

export function browserOf(ua?: string | null) {
  if (!ua) return "";
  const b = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : /Firefox\//.test(ua) ? "Firefox" : "";
  const o = /Mac OS X/.test(ua) ? "macOS" : /Windows/.test(ua) ? "Windows" : /iPhone|iPad/.test(ua) ? "iOS" : /Android/.test(ua) ? "Android" : "";
  return [b, o].filter(Boolean).join(" on ");
}

export function insights(name: string, visits: IVisit[], pages: IPage[], questions: IQuestion[], forwards: string[]) {
  const total = visits.reduce((a, v) => a + v.duration_seconds, 0);
  // Main document = the one they spent most time on.
  const byDoc = new Map<string, { id: string; name: string; secs: number; pages: number; maxViewed: number }>();
  visits.forEach((v) => {
    if (!v.document_id) return;
    const g = byDoc.get(v.document_id) || { id: v.document_id, name: v.documents?.name || "Document", secs: 0, pages: v.documents?.page_count || 1, maxViewed: 0 };
    g.secs += v.duration_seconds; g.maxViewed = Math.max(g.maxViewed, v.pages_viewed); byDoc.set(v.document_id, g);
  });
  const main = [...byDoc.values()].sort((a, b) => b.secs - a.secs)[0];
  const completion = main ? Math.min(1, main.maxViewed / Math.max(1, main.pages)) : 0;

  const heat: number[] = main ? Array(main.pages).fill(0) : [];
  const revisits: number[] = main ? Array(main.pages).fill(0) : [];
  if (main) pages.filter((p) => p.document_id === main.id && p.page_number <= main.pages).forEach((p) => { heat[p.page_number - 1] += p.seconds; revisits[p.page_number - 1] += 1; });
  const max = Math.max(1, ...heat);
  const level = (s: number) => (s === 0 ? "none" : s / max >= 0.7 ? "studied" : s / max >= 0.35 ? "read" : "skimmed");
  const top = heat.map((s, i) => ({ page: i + 1, secs: s, n: revisits[i] })).filter((x) => x.secs > 0).sort((a, b) => b.secs - a.secs);

  const first = name.split(" ")[0];
  const lastQ = [...questions].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))[0];
  let headline = `${first} hasn’t opened anything yet`;
  let read = "Share a link to start seeing their engagement here.";
  if (main && top.length) {
    const t = top[0];
    headline = `${first} is focused on page ${t.page}`;
    read = `${first} spent ${duration(t.secs)} on page ${t.page} of ${main.name}${t.n > 1 ? ` across ${t.n} visits` : ""}`;
    if (top[1]) read += `, then page ${top[1].page} (${duration(top[1].secs)})`;
    read += ".";
    if (lastQ) read += ` They asked: “${lastQ.body.length > 80 ? lastQ.body.slice(0, 80) + "…" : lastQ.body}”.`;
    if (forwards.length) read += ` It was forwarded to ${forwards.length === 1 ? forwards[0] : `${forwards.length} people`}.`;
    if (completion < 0.5) read += " They haven’t reached the second half yet.";
    else if (completion >= 1) read += " They read it all the way through.";
  } else if (visits.length) {
    headline = `${first} opened your content`;
    read = `${visits.length} visit${visits.length === 1 ? "" : "s"}, ${duration(total)} in total.`;
  }

  const timeline: Event[] = [];
  visits.forEach((v) => {
    const where = [v.location, browserOf(v.user_agent)].filter(Boolean).join(" · ");
    const when = new Date(v.started_at);
    const sub = `${when.toLocaleDateString("en-GB", { weekday: "short" })} ${when.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}${where ? " · " + where : ""}`;
    timeline.push({ kind: "open", at: v.started_at, text: `Opened ${v.documents?.name || v.links?.name || "a Space"}`, sub });
    const vp = pages.filter((p) => p.visit_id === v.id).sort((a, b) => b.seconds - a.seconds)[0];
    if (vp && vp.seconds >= 20) timeline.push({ kind: "page", at: new Date(when.getTime() + 1000).toISOString(), text: `Spent ${duration(vp.seconds)} on page ${vp.page_number}`, sub });
    if (v.downloaded) timeline.push({ kind: "download", at: new Date(when.getTime() + 2000).toISOString(), text: "Downloaded a PDF copy", sub });
  });
  questions.forEach((q) => timeline.push({ kind: "question", at: q.created_at, text: `Asked about page ${q.page_number}: “${q.body.length > 50 ? q.body.slice(0, 50) + "…" : q.body}”`, sub: q.answer ? "Answered" : "Waiting for your reply" }));
  forwards.forEach((f) => timeline.push({ kind: "forward", at: visits[0]?.started_at || new Date().toISOString(), text: `Forwarded to ${f}`, sub: "New visitor on the same link" }));
  timeline.sort((a, b) => +new Date(b.at) - +new Date(a.at));

  const tags = [top[0] && `Studied p.${top[0].page}`, lastQ && `Asked on p.${lastQ.page_number}`, forwards[0] && `Forwarded to ${forwards[0].split("@")[0]}`].filter(Boolean) as string[];
  return { total, main, completion, heat, level, top, headline, read, timeline, tags, lastQ };
}

/** Next weekday at a given hour, e.g. "Thursday 2pm". */
function slot(offsetDays: number, hour: number) {
  const d = new Date(); d.setDate(d.getDate() + offsetDays);
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
  return `${d.toLocaleDateString("en-GB", { weekday: "long" })} ${hour > 12 ? hour - 12 + "pm" : hour + "am"}`;
}

export function draftFollowUp(o: { name: string; email: string; sender: string; signature?: string; docName?: string; topPage?: number; question?: { body: string; answer: string | null }; forwards: string[]; variant?: number }) {
  const first = displayName(o.email, o.name).split(" ")[0];
  const v = o.variant || 0;
  const openers = [
    `Thanks for spending time on ${o.docName || "the deck"}${o.topPage ? ` — I saw page ${o.topPage} was the focus` : ""}.`,
    `Great to see you dig into ${o.docName || "the deck"}${o.topPage ? `, especially page ${o.topPage}` : ""}.`,
    `Hope ${o.docName || "the deck"} was useful${o.topPage ? ` — page ${o.topPage} seemed to stand out` : ""}.`,
  ];
  const lines = [`Hi ${first},`, "", openers[v % openers.length]];
  if (o.question) lines.push(o.question.answer ? `To your question (“${o.question.body}”): ${o.question.answer}` : `On your question (“${o.question.body}”) — happy to go through it live.`);
  if (o.forwards.length) lines.push(`I’ve added ${o.forwards.map((f) => f.split("@")[0]).join(" and ")} so they have the context too.`);
  lines.push("", `Would ${slot(v + 3, 14)} or ${slot(v + 4, 10)} work for a 30-minute walkthrough?`, "", "Best,", o.signature?.trim() || o.sender);
  return { subject: `${o.docName ? `${o.docName.split(" — ")[0]} follow-up` : "Following up"} + time ${slot(v + 3, 14).split(" ")[0]}?`, body: lines.join("\n") };
}

export function tone(body: string, kind: "shorter" | "formal" | "metrics") {
  if (kind === "formal") return body.replace(/^Hi /m, "Dear ").replace(/^Best,$/m, "Kind regards,").replace(/happy to/g, "I would be glad to").replace(/Great to see/g, "Thank you for taking the time to");
  if (kind === "metrics") return body.replace(/\n\nWould /, "\n\nQuick update since we spoke: [add your latest metric, e.g. ARR or customer count].\n\nWould ");
  const parts = body.split("\n\n");
  return [parts[0], parts[parts.length - 2], parts[parts.length - 1]].filter(Boolean).join("\n\n");
}
