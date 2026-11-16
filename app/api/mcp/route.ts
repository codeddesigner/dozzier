import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { RESOURCE_METADATA } from "@/lib/oauthServer";

/**
 * Dozzier MCP server (Streamable HTTP, stateless JSON responses).
 * Auth: "Authorization: Bearer dz_…" (or ?key=dz_… for clients that only accept a URL).
 * Every tool runs inside the database, scoped to the key's workspace.
 */
export const dynamic = "force-dynamic";
const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://hxgcoekovalkmdwcabll.supabase.co";
const SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_D1l_C12Kv_Y-yhzzALG6oA_rL3T1WQ1";
const VERSIONS = ["2025-11-25", "2025-06-18", "2025-03-26", "2024-11-05"];

type Json = Record<string, unknown>;
const str = (description: string) => ({ type: "string", description });
const int = (description: string) => ({ type: "integer", description });
const bool = (description: string) => ({ type: "boolean", description });
const TOOLS: { name: string; title: string; description: string; inputSchema: Json; annotations: Json }[] = [
  { name: "get_workspace_summary", title: "Workspace summary", description: "Totals for the workspace: documents, links, data rooms, visits and unique visitors in the last 7/30 days, and the most-viewed documents.",
    inputSchema: { type: "object", properties: {} }, annotations: { readOnlyHint: true } },
  { name: "list_documents", title: "List documents", description: "Documents in the content library, newest first, with link and visit counts. Optionally filter by name.",
    inputSchema: { type: "object", properties: { query: str("Text to match in the document name"), limit: int("Max results (1–100, default 20)") } }, annotations: { readOnlyHint: true } },
  { name: "search_documents", title: "Search documents", description: "Full-text search across document names and their contents (PDF, Word, PowerPoint, Excel). Returns matching snippets.",
    inputSchema: { type: "object", properties: { query: str("Words to search for"), limit: int("Max results (1–100, default 20)") }, required: ["query"] }, annotations: { readOnlyHint: true } },
  { name: "get_document_analytics", title: "Document analytics", description: "Engagement for one document: visits, unique visitors, downloads, average time, completion rate, seconds per page and the top visitors.",
    inputSchema: { type: "object", properties: { document_id: str("Document id from list_documents"), days: int("Look-back window in days (default 30)") }, required: ["document_id"] }, annotations: { readOnlyHint: true } },
  { name: "list_links", title: "List links", description: "Tracked links with their URL, protection settings and visit counts. Optionally for one document.",
    inputSchema: { type: "object", properties: { document_id: str("Only links to this document"), limit: int("Max results (1–100, default 20)") } }, annotations: { readOnlyHint: true } },
  { name: "list_recent_visits", title: "Recent visits", description: "Who opened what, newest first: visitor, company, document, time spent, pages viewed, download and location.",
    inputSchema: { type: "object", properties: { days: int("Look-back window in days (default 30)"), document_id: str("Only visits to this document"), limit: int("Max results (1–100, default 20)") } }, annotations: { readOnlyHint: true } },
  { name: "get_contact", title: "Contact activity", description: "Everything one visitor has done: their details, total time, each document they read and their recent visits.",
    inputSchema: { type: "object", properties: { email: str("The visitor’s email address") }, required: ["email"] }, annotations: { readOnlyHint: true } },
  { name: "list_data_rooms", title: "List data rooms", description: "Data rooms (Spaces) with document and visitor counts and their latest link.",
    inputSchema: { type: "object", properties: { limit: int("Max results (1–100, default 20)") } }, annotations: { readOnlyHint: true } },
  { name: "list_companies", title: "List companies", description: "Companies (accounts) ranked by recent engagement: people who visited, visits, total time, last visit and which documents they read. Use this for questions like “which investors read the deck this week?”.",
    inputSchema: { type: "object", properties: { query: str("Text to match in the company name or domain"), days: int("Look-back window in days (default 30)"), limit: int("Max results (1–100, default 20)") } }, annotations: { readOnlyHint: true } },
  { name: "get_company", title: "Company activity", description: "Everything one company has done: the people who visited, time spent per document, and their recent visits. Also returns deal stage and value.",
    inputSchema: { type: "object", properties: { company: str("Company name or domain, e.g. “Acme” or acme.com"), company_id: str("Company id from list_companies"), days: int("Look-back window in days (default 30)") } }, annotations: { readOnlyHint: true } },
  { name: "get_data_room", title: "Data room activity", description: "One data room (Space): its link, each document with viewers, time and downloads, and every visitor with how much they read.",
    inputSchema: { type: "object", properties: { data_room_id: str("Data room id from list_data_rooms"), name: str("Or the data room’s name"), limit: int("Max visitors (1–100, default 20)") } }, annotations: { readOnlyHint: true } },
  { name: "list_signature_requests", title: "List eSign requests", description: "Documents sent for signature, newest first, with status and who has viewed or signed.",
    inputSchema: { type: "object", properties: { status: str("Only this status, e.g. sent, completed, voided"), query: str("Text to match in the document name"), limit: int("Max results (1–100, default 20)") } }, annotations: { readOnlyHint: true } },
  { name: "list_file_requests", title: "List file requests", description: "File requests with their status, due date, number of uploads and the latest files received.",
    inputSchema: { type: "object", properties: { query: str("Text to match in the request title"), limit: int("Max results (1–100, default 20)") } }, annotations: { readOnlyHint: true } },
  { name: "update_link", title: "Update tracked link", description: "Changes a link: turn it off or on, set or clear an expiry, add or remove a passcode, and change download, email and watermark settings. Only the fields you pass change. Requires a key with write access.",
    inputSchema: { type: "object", properties: {
      link_id: str("Link id from list_links"), enabled: bool("false turns the link off immediately; true turns it back on"), name: str("New link name"),
      expires_in_days: int("Turn the link off after this many days from now; 0 removes the expiry"), passcode: str("Require this passcode; empty string removes it"),
      allow_download: bool("Allow downloading the file"), require_email: bool("Ask for an email before viewing"), verify_email: bool("Email the visitor a 6-digit code first"),
      watermark: bool("Watermark pages with the visitor’s email") }, required: ["link_id"] },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true } },
  { name: "create_link", title: "Create tracked link", description: "Creates a new tracked link for a document and returns its URL. Requires a key with write access.",
    inputSchema: { type: "object", properties: {
      document_id: str("Document id from list_documents"), name: str("Link name, usually the recipient or company"),
      require_email: bool("Ask for an email before viewing (default true)"), verify_email: bool("Email the visitor a 6-digit code first"),
      allow_download: bool("Allow downloading the file (default false)"), watermark: bool("Watermark pages with the visitor’s email"),
      expires_in_days: int("Turn the link off after this many days"), passcode: str("Require this passcode") }, required: ["document_id"] },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false } },
];

const rpcOk = (id: unknown, result: unknown) => ({ jsonrpc: "2.0", id, result });
const rpcErr = (id: unknown, code: number, message: string) => ({ jsonrpc: "2.0", id: id ?? null, error: { code, message } });
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Authorization, Content-Type, Mcp-Session-Id, Mcp-Protocol-Version", "Access-Control-Allow-Methods": "POST, GET, OPTIONS", "Access-Control-Expose-Headers": "WWW-Authenticate" };
// Points MCP clients at Dozzier's sign-in (OAuth) when they arrive without a key.
const CHALLENGE = `Bearer realm="dozzier", resource_metadata="${RESOURCE_METADATA}"`;

function keyFrom(req: NextRequest) {
  return req.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() || req.nextUrl.searchParams.get("key") || "";
}

async function handle(msg: Json, key: string) {
  const id = msg.id, method = msg.method as string, params = (msg.params || {}) as Json;
  if (method?.startsWith("notifications/")) return null;
  if (method === "initialize") {
    const want = String(params.protocolVersion || "");
    return rpcOk(id, {
      protocolVersion: VERSIONS.includes(want) ? want : VERSIONS[0],
      capabilities: { tools: { listChanged: false } },
      serverInfo: { name: "dozzier", title: "Dozzier", version: "1.0.0" },
      instructions: "Dozzier is a secure document-sharing and data-room product. Use list_documents or search_documents to find documents, get_document_analytics and list_recent_visits for engagement, list_companies and get_company for account-level questions, get_contact for one person's activity, get_data_room for a data room, list_signature_requests and list_file_requests for eSign and file requests, create_link to share a document and update_link to change or turn off a link. Ids come from the list tools. Times are in seconds; dates are ISO 8601 UTC.",
    });
  }
  if (method === "ping") return rpcOk(id, {});
  if (method === "tools/list") return rpcOk(id, { tools: TOOLS });
  // Some clients probe these even when not advertised; answer with empty lists rather than errors.
  if (method === "resources/list") return rpcOk(id, { resources: [] });
  if (method === "resources/templates/list") return rpcOk(id, { resourceTemplates: [] });
  if (method === "prompts/list") return rpcOk(id, { prompts: [] });
  if (method === "tools/call") {
    const name = String(params.name || "");
    if (!TOOLS.some((t) => t.name === name)) return rpcErr(id, -32602, `Unknown tool: ${name}`);
    const sb = createClient(SB_URL, SB_KEY, { auth: { persistSession: false } });
    const { data, error } = await sb.rpc("mcp_tool", { p_key: key, p_tool: name, p_args: (params.arguments as Json) || {} });
    if (error) return rpcOk(id, { content: [{ type: "text", text: error.message }], isError: true });
    const structured = Array.isArray(data) ? { items: data } : (data as Json);
    return rpcOk(id, { content: [{ type: "text", text: JSON.stringify(data, null, 2) }], structuredContent: structured, isError: false });
  }
  return rpcErr(id, -32601, `Method not found: ${method}`);
}

export async function POST(req: NextRequest) {
  const key = keyFrom(req);
  if (!/^dz_[0-9a-f]{48}$/.test(key)) {
    return NextResponse.json(rpcErr(null, -32001, "Sign in to Dozzier to continue, or send an API key from Settings → API & MCP as “Authorization: Bearer dz_…”."),
      { status: 401, headers: { ...cors, "WWW-Authenticate": CHALLENGE } });
  }
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json(rpcErr(null, -32700, "Parse error"), { status: 400, headers: cors }); }
  // Check the key once up front so a bad key fails clearly, even on initialize.
  const sb = createClient(SB_URL, SB_KEY, { auth: { persistSession: false } });
  const probe = await sb.rpc("mcp_tool", { p_key: key, p_tool: "__auth__", p_args: {} });
  if (probe.error && !/Unknown tool/.test(probe.error.message)) {
    return NextResponse.json(rpcErr(null, -32001, probe.error.message), { status: 401, headers: { ...cors, "WWW-Authenticate": `${CHALLENGE}, error="invalid_token"` } });
  }
  const msgs = Array.isArray(body) ? body : [body];
  const out = (await Promise.all(msgs.map((m) => handle((m || {}) as Json, key)))).filter(Boolean);
  if (!out.length) return new NextResponse(null, { status: 202, headers: cors });
  return NextResponse.json(Array.isArray(body) ? out : out[0], { headers: cors });
}

export async function GET() {
  // No server-initiated stream; clients use POST.
  return new NextResponse("Dozzier MCP server. Connect with an MCP client using POST and your API key.", { status: 405, headers: { ...cors, Allow: "POST, OPTIONS" } });
}
export async function OPTIONS() { return new NextResponse(null, { status: 204, headers: cors }); }
