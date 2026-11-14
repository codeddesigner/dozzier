// Dozzier help-center content (docs.dozzier.io in the Figma "Flow 7").

export type Block =
  | { h: string }
  | { p: string }
  | { list: string[] }
  | { steps: string[] }
  | { note: string }
  | { figure: "link-settings" | "space-permissions" | "visitor-timeline" };

export type Article = { slug: string; cat: string; title: string; summary: string; plan: string; updated: string; read: number; body: Block[]; related?: string[]; faq?: [string, string][]; keywords?: string };
export type Category = { id: string; title: string; blurb: string; icon: string };

export const CATEGORIES: Category[] = [
  { id: "getting-started", title: "Getting started", blurb: "Set up your workspace and send your first link", icon: "sparkles" },
  { id: "sharing", title: "Sharing & links", blurb: "Link settings, email gates, expiry and watermarks", icon: "link" },
  { id: "analytics", title: "Analytics", blurb: "Visits, page-by-page time, heatmaps and intent", icon: "chart" },
  { id: "data-rooms", title: "Data rooms", blurb: "Spaces, folders, permissions and Q&A", icon: "space" },
  { id: "esign", title: "eSignatures & NDAs", blurb: "Agreements, signing order and certificates", icon: "signature" },
  { id: "file-requests", title: "File requests", blurb: "Collect files from anyone, no account needed", icon: "file" },
  { id: "integrations", title: "Integrations", blurb: "HubSpot, Salesforce, Slack, Gmail and Zapier", icon: "plug" },
  { id: "account", title: "Account & billing", blurb: "Plans, seats, invoices and security", icon: "card" },
];

export const ARTICLES: Article[] = [
  // ---------- Getting started ----------
  { slug: "create-your-workspace", cat: "getting-started", title: "Create your workspace", plan: "All plans", updated: "Nov 4, 2026", read: 2,
    summary: "Sign up with your work email, name your workspace and pick what you’ll use Dozzier for.",
    body: [
      { p: "Your workspace is where your team’s content, links and data rooms live. You create it the first time you sign up." },
      { h: "1. Sign up with your work email" },
      { p: "Go to dozzier.io and click Try for free. Use your work email so teammates on the same domain can find and join your workspace." },
      { h: "2. Name your workspace" },
      { p: "Pick a name visitors will recognise — usually your company name. It appears on every link you share as “Randombase shared …”." },
      { h: "3. Tell us your use case" },
      { p: "Choose everything that applies (fundraising, sales, M&A, legal, client portals). We use it to set sensible link defaults and show the right tips first." },
      { note: "You can change the workspace name any time from Settings → Workspace." },
    ], related: ["upload-content", "invite-your-team", "create-a-secure-link"], keywords: "signup sign up onboarding workspace name" },
  { slug: "upload-content", cat: "getting-started", title: "Upload content", plan: "All plans", updated: "Nov 2, 2026", read: 2,
    summary: "Drop in PDFs, decks and documents — Dozzier counts pages and gets them ready to share.",
    body: [
      { p: "Open Content and click Upload, or drag files anywhere onto the Content page. PDFs up to 50 MB are supported today, and each file’s pages are counted automatically so you get page-by-page analytics." },
      { h: "Organise with folders" },
      { p: "Create folders from the left of the Content page and move documents between them. Folders are private to your workspace — visitors only ever see what you share." },
      { h: "Replace a file without breaking links" },
      { p: "Upload a new version from the document’s page. Existing links keep working and start showing the new file immediately." },
    ], related: ["create-a-secure-link", "page-by-page-time"], keywords: "upload pdf deck file folder version" },
  { slug: "invite-your-team", cat: "getting-started", title: "Invite your team", plan: "Standard and above", updated: "Oct 30, 2026", read: 2,
    summary: "Add teammates as Admin, Editor or Viewer, or share an invite link restricted to your domain.",
    body: [
      { p: "Teammates can share content, see shared analytics and co-manage data rooms." },
      { h: "Roles" },
      { list: ["Admin — billing, security and everything Editors can do", "Editor — upload, share and manage links and Spaces", "Viewer — see content and analytics, can’t share"] },
      { h: "Invite link" },
      { p: "Turn on the invite link to let anyone with your company email domain join as a Viewer. Turn it off at any time to stop new joins." },
    ], related: ["create-your-workspace", "plans-and-seats"], keywords: "team invite member role admin editor viewer" },
  { slug: "send-your-first-link", cat: "getting-started", title: "Send your first link in 2 minutes", plan: "All plans", updated: "Nov 10, 2026", read: 3,
    summary: "Upload a deck, create a link with an email gate and watch the first visit arrive live.",
    body: [
      { steps: ["Upload your deck from Content → Upload.", "Click Create link and give it the recipient’s name, e.g. “Acme Ventures”.", "Keep Require email to view on — it’s on by default.", "Copy the link and paste it into your email.", "Open Dashboard: the visit appears the moment they open it."] },
      { note: "Tip: send the link to yourself first to see exactly what visitors see." },
    ], related: ["create-a-secure-link", "require-an-email", "visitor-activity"], keywords: "first link quick start tutorial" },

  // ---------- Sharing & links ----------
  { slug: "create-a-secure-link", cat: "sharing", title: "Create a secure link", plan: "All plans", updated: "Nov 8, 2026", read: 3,
    summary: "Every link has its own access rules and analytics. Create one per recipient to know exactly who read what.",
    body: [
      { p: "A link is how a visitor opens your document or Space. Each link has its own settings and its own analytics, so we recommend one link per recipient or company." },
      { h: "1. Open the document" },
      { p: "From Content, open any document and click Create link." },
      { figure: "link-settings" },
      { h: "2. Choose your settings" },
      { p: "Require email, set a passcode or expiry, turn on watermarks and decide whether downloads are allowed. Settings you don’t change use your workspace link defaults." },
      { h: "3. Copy and share" },
      { p: "Click Create link and copy the URL. You can change any setting later — it applies instantly, even to people who already have the link." },
    ], related: ["require-an-email", "passcodes-and-expiry", "dynamic-watermarks"], keywords: "create link share url" },
  { slug: "require-an-email", cat: "sharing", title: "Require an email before someone views your document", plan: "All plans", updated: "Nov 10, 2026", read: 3,
    summary: "An email gate asks visitors to confirm who they are before the document opens.",
    body: [
      { p: "An email gate asks visitors to confirm who they are before the document opens. Every visit is then tied to a real person, so your analytics and alerts name names." },
      { h: "1. Open link settings" },
      { p: "From any document, click Create link (or ••• → Link settings on an existing link)." },
      { figure: "link-settings" },
      { h: "2. Turn on “Require email to view”" },
      { p: "Optionally verify the address with a one-time code — recommended for data rooms." },
      { h: "Verify with a code" },
      { p: "With verification on, visitors receive a 6-digit code by email and must enter it before viewing. This stops people typing someone else’s address." },
    ],
    faq: [["Do visitors need a Dozzier account?", "No. They enter their email once per link and can view straight away."], ["Can I see who forwarded the link?", "Yes — a new email on the same link shows up as a separate visitor, so forwards are easy to spot."]],
    related: ["allow-and-block-lists", "passcodes-and-expiry", "send-an-nda-first"], keywords: "email gate verify visitor identify" },
  { slug: "passcodes-and-expiry", cat: "sharing", title: "Passcodes & expiry", plan: "All plans", updated: "Oct 28, 2026", read: 2,
    summary: "Add a passcode you share separately, and switch links off automatically on a date.",
    body: [
      { h: "Passcodes" },
      { p: "Turn on Require passcode in link settings and type a passcode. Share it through a different channel (a call or text) for extra protection." },
      { h: "Expiry" },
      { p: "Set Link expiration to a date and time. After that, visitors see a “This link isn’t available” page and you can re-enable the link at any time." },
    ], related: ["create-a-secure-link", "require-an-email"], keywords: "password passcode expire expiry date disable" },
  { slug: "dynamic-watermarks", cat: "sharing", title: "Dynamic watermarks", plan: "Standard and above", updated: "Oct 21, 2026", read: 2,
    summary: "Stamp every page with the viewer’s email, time and IP to discourage screenshots and leaks.",
    body: [
      { p: "Dynamic watermarks overlay each page with the visitor’s email address and the time they viewed it. Combined with screenshot protection, they make leaks traceable." },
      { h: "Turn it on" },
      { p: "In link settings, switch on Dynamic watermark. It applies to the web viewer and to downloaded PDFs." },
    ], related: ["create-a-secure-link", "turn-off-downloads"], keywords: "watermark leak screenshot protection" },
  { slug: "turn-off-downloads", cat: "sharing", title: "Turn off downloads for a link", plan: "All plans", updated: "Nov 1, 2026", read: 1,
    summary: "Stop visitors downloading a copy — they can still read it in the browser.",
    body: [
      { p: "Open the link’s settings and turn off Allow downloads. For extra protection add a dynamic watermark and screenshot protection. Existing links update instantly." },
    ], related: ["dynamic-watermarks", "create-a-secure-link"], keywords: "download stop prevent deck pdf copy" },
  { slug: "allow-and-block-lists", cat: "sharing", title: "Allow & block lists", plan: "Standard and above", updated: "Oct 18, 2026", read: 2,
    summary: "Only let people from certain domains or addresses open a link — or block specific ones.",
    body: [
      { p: "Allow lists restrict a link to specific email addresses or whole domains (e.g. @acmevc.com). Block lists do the opposite. Both require the email gate to be on." },
    ], related: ["require-an-email", "create-a-secure-link"], keywords: "allow block domain restrict whitelist" },

  // ---------- Analytics ----------
  { slug: "visitor-activity", cat: "analytics", title: "Visitor activity", plan: "All plans", updated: "Nov 6, 2026", read: 2,
    summary: "See who opened your links, when, from where and for how long.",
    body: [
      { p: "Dashboard → Visitor activity lists everyone who viewed your content in the selected period, with visits, downloads, time spent and an intent score." },
      { figure: "visitor-timeline" },
      { p: "Click a visitor to see every session and the pages they spent time on." },
    ], related: ["page-by-page-time", "intent-score"], keywords: "visitors activity who opened dashboard" },
  { slug: "page-by-page-time", cat: "analytics", title: "Page-by-page time", plan: "All plans", updated: "Nov 3, 2026", read: 2,
    summary: "Find the pages that held attention — and the ones people skipped.",
    body: [
      { p: "Open a document to see time spent on each page across all visits. The highest bar is highlighted so you know what resonated." },
      { p: "Open a single visit to see that person’s page-by-page breakdown." },
    ], related: ["visitor-activity", "intent-score"], keywords: "page time heatmap engagement" },
  { slug: "intent-score", cat: "analytics", title: "Intent score", plan: "All plans", updated: "Oct 25, 2026", read: 2,
    summary: "A 0–100 score from time spent, revisits, forwards and downloads.",
    body: [
      { p: "Each visitor and account gets an intent score between 0 and 100. It rises with time spent, repeat visits, downloads and forwards, and with dwell on pricing or terms pages." },
      { list: ["Hot (70+) — follow up today", "Warm (40–69) — keep warm", "Cold (under 40) — early interest"] },
    ], related: ["visitor-activity"], keywords: "intent score hot warm cold" },

  // ---------- Data rooms ----------
  { slug: "create-a-space", cat: "data-rooms", title: "Create a Space", plan: "Data Rooms", updated: "Nov 5, 2026", read: 3,
    summary: "Bundle many documents into one branded data room with a single link.",
    body: [
      { p: "Spaces are data rooms: a set of documents and folders shared through one link. Go to Spaces → New Space, choose a template and add documents." },
    ], related: ["folder-permissions", "data-room-qa"], keywords: "space data room create" },
  { slug: "folder-permissions", cat: "data-rooms", title: "Set folder-level permissions in a data room", plan: "Data Rooms", updated: "Nov 7, 2026", read: 3,
    summary: "Give each group of visitors access to only the folders they need.",
    body: [
      { p: "Create visitor groups (for example “Lead investors” and “Legal”) and choose which folders each group can see, and whether they can download." },
      { figure: "space-permissions" },
    ], related: ["create-a-space", "data-room-qa"], keywords: "permission folder group access data room" },
  { slug: "data-room-qa", cat: "data-rooms", title: "Q&A in data rooms", plan: "Data Rooms", updated: "Oct 15, 2026", read: 2,
    summary: "Let visitors ask questions on any page and answer them in one place.",
    body: [{ p: "Visitors can ask a question pinned to a page. You answer by email or in-app, and answers can be shared with everyone in the Space." }],
    related: ["create-a-space"], keywords: "question answer q&a" },

  // ---------- eSign ----------
  { slug: "send-an-nda-first", cat: "esign", title: "Send an NDA before granting access", plan: "Standard and above", updated: "Nov 9, 2026", read: 2,
    summary: "Require visitors to sign your NDA before they can open a link or Space.",
    body: [{ p: "In link settings, turn on Require NDA and pick an agreement from Agreements. Visitors sign in the browser before the content opens, and you get a signed copy with a certificate." }],
    related: ["prepare-an-agreement", "require-an-email"], keywords: "nda agreement sign before access" },
  { slug: "prepare-an-agreement", cat: "esign", title: "Prepare an agreement", plan: "All plans", updated: "Oct 29, 2026", read: 3,
    summary: "Upload a contract, add signers in order and place signature fields.",
    body: [{ p: "Go to Agreements → New agreement, upload a PDF, add signers and place fields. Each signer gets an email when it’s their turn, and everyone receives a certified copy when it’s done." }],
    related: ["send-an-nda-first"], keywords: "esign signature contract signer" },

  // ---------- File requests ----------
  { slug: "collect-files", cat: "file-requests", title: "Collect files with a request link", plan: "Standard and above", updated: "Oct 20, 2026", read: 2,
    summary: "Send a link anyone can upload to — no account needed.",
    body: [{ p: "Go to File requests → New request, describe what you need and copy the link. Uploads land in your workspace and you’re notified as they arrive." }],
    related: ["create-a-space"], keywords: "file request upload collect" },

  // ---------- Integrations ----------
  { slug: "connect-hubspot", cat: "integrations", title: "Connect HubSpot or Salesforce", plan: "Standard and above", updated: "Oct 12, 2026", read: 2,
    summary: "Sync visits and intent to contacts and deals in your CRM.",
    body: [{ p: "CRM sync is in early access. Request access from the Getting started checklist and we’ll switch it on for your workspace." }],
    related: ["slack-alerts"], keywords: "hubspot salesforce crm sync pipedrive" },
  { slug: "slack-alerts", cat: "integrations", title: "Live alerts in Slack", plan: "Standard and above", updated: "Oct 10, 2026", read: 1,
    summary: "Get a Slack message the moment someone opens your link.",
    body: [{ p: "Slack alerts are in early access. Today, live alerts appear in the Dozzier app as soon as a visit starts." }],
    related: ["connect-hubspot"], keywords: "slack alert notification" },

  // ---------- Account ----------
  { slug: "plans-and-seats", cat: "account", title: "Plans & seats", plan: "All plans", updated: "Nov 1, 2026", read: 2,
    summary: "Compare Personal, Standard and Data Rooms, and add seats.",
    body: [{ list: ["Personal — $5 per user per month", "Standard — $25 per user per month", "Data Rooms — $140 per month, 3 users included"] }, { p: "Every plan starts with a 14-day free trial. Change plans from Settings → Billing." }],
    related: ["invite-your-team"], keywords: "plan price billing seats invoice" },
  { slug: "custom-domain", cat: "account", title: "Connect a custom domain (docs.yourcompany.com)", plan: "Standard and above", updated: "Nov 2, 2026", read: 3,
    summary: "Serve your links from your own domain.",
    body: [{ steps: ["Go to Settings → Custom domains and enter a subdomain such as docs.yourcompany.com.", "Add a CNAME record pointing to links.dozzier.io at your DNS provider.", "Wait for verification — we issue SSL automatically."] }],
    related: ["create-a-secure-link"], keywords: "domain cname dns custom branding" },
  { slug: "two-factor", cat: "account", title: "Turn on two-factor authentication", plan: "All plans", updated: "Nov 12, 2026", read: 2,
    summary: "Protect your account with an authenticator app.",
    body: [{ steps: ["Open Settings → Two-factor authentication.", "Scan the QR code with Google Authenticator, 1Password or Authy.", "Enter the 6-digit code to turn it on."] }, { note: "Next time you log in you’ll be asked for a code from your app." }],
    related: ["plans-and-seats"], keywords: "2fa two factor security mfa authenticator" },
];

export const POPULAR = ["require-an-email", "folder-permissions", "page-by-page-time", "custom-domain", "send-an-nda-first"];

export const article = (slug: string) => ARTICLES.find((a) => a.slug === slug);
export const inCat = (cat: string) => ARTICLES.filter((a) => a.cat === cat);
export const category = (id: string) => CATEGORIES.find((c) => c.id === id);

/** Plain keyword search across titles, summaries and bodies. */
export function searchDocs(q: string) {
  const words = q.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2 && !["how", "the", "can", "what", "does", "for", "and", "you", "my", "stop"].includes(w));
  if (!words.length) return [];
  return ARTICLES.map((a) => {
    const hay = `${a.title} ${a.summary} ${a.keywords || ""}`.toLowerCase();
    const body = a.body.map((b) => ("p" in b ? b.p : "h" in b ? b.h : "")).join(" ").toLowerCase();
    let s = 0;
    for (const w of words) { const stem = w.replace(/(ing|ed|s)$/, ""); if (hay.includes(stem)) s += 3; if (body.includes(stem)) s += 1; }
    return { a, s };
  }).filter((x) => x.s > 0).sort((x, y) => y.s - x.s).map((x) => x.a);
}

export type Param = { name: string; type: string; required?: boolean; desc: string };
export type Endpoint = { id: string; group: string; method: "GET" | "POST" | "PATCH" | "DEL"; path: string; title: string; desc: string; params: Param[]; body?: Record<string, unknown>; response: Record<string, unknown>; status: string };

export const API_INTRO = [
  { id: "authentication", title: "Authentication", body: "Authenticate with a secret key in the Authorization header: Bearer dz_live_… Create keys in Settings → API & webhooks. Keep keys server-side; they carry your workspace’s permissions." },
  { id: "rate-limits", title: "Rate limits", body: "Each key can make 100 requests per 10 seconds. Over the limit you get 429 Too Many Requests with a Retry-After header." },
  { id: "errors", title: "Errors", body: "Errors return a JSON body { error: { code, message } } with 4xx for request problems and 5xx for ours. Codes: invalid_request, not_found, unauthorized, rate_limited." },
];

export const ENDPOINTS: Endpoint[] = [
  { id: "list-links", group: "Links", method: "GET", path: "/v1/links", title: "List links", desc: "Returns links in your workspace, newest first. Paginate with limit and starting_after.", status: "200 OK",
    params: [{ name: "limit", type: "integer", desc: "1–100, default 20." }, { name: "starting_after", type: "string", desc: "Cursor from the previous page." }, { name: "document_id", type: "string", desc: "Only links for this document." }],
    response: { data: [{ id: "lnk_2xut37i4", name: "Acme Ventures", visits: 12 }], has_more: false } },
  { id: "create-link", group: "Links", method: "POST", path: "/v1/links", title: "Create a link", desc: "Creates a tracked link for a document or Space. Settings you omit fall back to your workspace link defaults.", status: "201 Created",
    params: [
      { name: "document_id", type: "string", required: true, desc: "ID of the document or Space to share." },
      { name: "name", type: "string", desc: "Label shown in your dashboard, e.g. the recipient company." },
      { name: "require_email", type: "boolean", desc: "Ask visitors to verify their email. Default: workspace setting." },
      { name: "allow_download", type: "boolean", desc: "Let visitors download a PDF copy." },
      { name: "expires_at", type: "timestamp", desc: "ISO 8601. The link is disabled after this time." },
      { name: "watermark", type: "boolean", desc: "Stamp viewer email, time and IP on each page." },
    ],
    body: { document_id: "doc_8f2c91", name: "Acme Ventures", require_email: true, expires_at: "2026-12-31T23:59:00Z" },
    response: { id: "lnk_2xut37i4", url: "https://docs.randombase.com/acme", require_email: true, allow_download: false, visits: 0, created_at: "2026-11-13T21:20:00Z" } },
  { id: "update-link", group: "Links", method: "PATCH", path: "/v1/links/{id}", title: "Update a link", desc: "Updates any link setting. Changes apply instantly, including for visitors who already have the URL.", status: "200 OK",
    params: [{ name: "allow_download", type: "boolean", desc: "Let visitors download a PDF copy." }, { name: "enabled", type: "boolean", desc: "Turn the link off or on." }, { name: "expires_at", type: "timestamp", desc: "ISO 8601 expiry, or null to remove." }],
    body: { allow_download: false }, response: { id: "lnk_2xut37i4", allow_download: false } },
  { id: "delete-link", group: "Links", method: "DEL", path: "/v1/links/{id}", title: "Delete a link", desc: "Permanently disables and deletes a link. Analytics for past visits are kept.", status: "200 OK", params: [], response: { id: "lnk_2xut37i4", deleted: true } },
  { id: "list-visits", group: "Visits", method: "GET", path: "/v1/visits", title: "List visits", desc: "Returns visits across your links, newest first.", status: "200 OK",
    params: [{ name: "link_id", type: "string", desc: "Only visits for this link." }, { name: "since", type: "timestamp", desc: "Only visits that started after this time." }],
    response: { data: [{ id: "vis_91ka", visitor_email: "paul@randombase.com", duration_seconds: 111, pages_viewed: 7 }], has_more: false } },
  { id: "retrieve-visit", group: "Visits", method: "GET", path: "/v1/visits/{id}", title: "Retrieve a visit", desc: "Returns one visit with page-by-page time.", status: "200 OK", params: [],
    response: { id: "vis_91ka", visitor_email: "paul@randombase.com", pages: [{ page: 1, seconds: 12 }, { page: 2, seconds: 48 }] } },
  { id: "events", group: "Webhooks", method: "POST", path: "/your-endpoint", title: "Events", desc: "We POST a JSON event to your endpoint when something happens: visit.started, visit.ended, link.created, agreement.signed, file_request.uploaded.", status: "200 OK",
    params: [{ name: "type", type: "string", required: true, desc: "Event type, e.g. visit.started." }, { name: "data", type: "object", required: true, desc: "The object the event is about." }],
    body: { type: "visit.started", data: { id: "vis_91ka", link_id: "lnk_2xut37i4" } }, response: { received: true } },
  { id: "verify-signatures", group: "Webhooks", method: "POST", path: "/your-endpoint", title: "Verify signatures", desc: "Each webhook includes a Dozzier-Signature header: an HMAC-SHA256 of the raw body using your endpoint secret. Compare it in constant time and reject mismatches.", status: "200 OK", params: [], response: { verified: true } },
];

export const CHANGELOG = [
  { date: "Nov 12, 2026", tag: "New", title: "Ask Dozzier — AI answers across your deals", body: "Ask natural-language questions about content and visitors. Answers cite pages and sessions, with one-click follow-ups.", icon: "sparkles", guide: "visitor-activity" },
  { date: "Nov 3, 2026", tag: "New", title: "Version compare", body: "See exactly which pages changed between versions and notify past visitors in one click.", icon: "history", guide: "upload-content" },
  { date: "Oct 21, 2026", tag: "Improved", title: "Faster data rooms", body: "Spaces with 1,000+ files now open 3× faster, and folder permissions apply instantly.", guide: "folder-permissions" },
  { date: "Oct 9, 2026", tag: "New", title: "Two-factor authentication", body: "Protect your account with an authenticator app. Turn it on from Settings.", guide: "two-factor" },
  { date: "Sep 28, 2026", tag: "Improved", title: "Live “viewing now” alerts", body: "Alerts now appear within a second of a visit starting, with the page they’re on.", guide: "visitor-activity" },
];

/** Help-panel context: articles relevant to the current app page. */
export function articlesFor(path: string): string[] {
  if (path.startsWith("/app/content") || path.startsWith("/app/links")) return ["create-a-secure-link", "require-an-email", "turn-off-downloads"];
  if (path.startsWith("/app/spaces")) return ["create-a-space", "folder-permissions", "data-room-qa"];
  if (path.startsWith("/app/agreements")) return ["prepare-an-agreement", "send-an-nda-first"];
  if (path.startsWith("/app/file-requests")) return ["collect-files"];
  if (path.startsWith("/app/contacts") || path.startsWith("/app/accounts")) return ["visitor-activity", "intent-score"];
  if (path.startsWith("/app/settings")) return ["two-factor", "custom-domain", "invite-your-team"];
  return ["visitor-activity", "page-by-page-time", "intent-score"];
}
