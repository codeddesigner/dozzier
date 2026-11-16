import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Dozzier MCP server (Streamable HTTP, stateless JSON responses).
 * Auth: "Authorization: Bearer dz_…" (or ?key=dz_… for clients that only accept a URL).
 * Every tool runs inside the database, scoped to the key's workspace.
 */
export const dynamic = "force-dynamic";
const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://hxgcoekovalkmdwcabll.supabase.co";
const SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_D1l_C12Kv_Y-yhzzALG6oA_rL3T1WQ1";
const VERSIONS = ["2025-06-18", "2025-03-26", "2024-11-05"];

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
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Authorization, Content-Type, Mcp-Session-Id, Mcp-Protocol-Version", "Access-Control-Allow-Methods": "POST, GET, OPTIONS" };

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
      instructions: "Dozzier is a secure document-sharing and data-room product. Use list_documents or search_documents to find documents, get_document_analytics and list_recent_visits for engagement, get_contact for one person's activity, and create_link to share a document. Times are in seconds; dates are ISO 8601 UTC.",
    });
  }
  if (method === "ping") return rpcOk(id, {});
  if (method === "tools/list") return rpcOk(id, { tools: TOOLS });
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
    return NextResponse.json(rpcErr(null, -32001, "Missing or malformed API key. Create one in Dozzier → Settings → API & MCP and send it as “Authorization: Bearer dz_…”."),
      { status: 401, headers: { ...cors, "WWW-Authenticate": 'Bearer realm="dozzier"' } });
  }
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json(rpcErr(null, -32700, "Parse error"), { status: 400, headers: cors }); }
  // Check the key once up front so a bad key fails clearly, even on initialize.
  const sb = createClient(SB_URL, SB_KEY, { auth: { persistSession: false } });
  const probe = await sb.rpc("mcp_tool", { p_key: key, p_tool: "__auth__", p_args: {} });
  if (probe.error && !/Unknown tool/.test(probe.error.message)) {
    return NextResponse.json(rpcErr(null, -32001, probe.error.message), { status: 401, headers: { ...cors, "WWW-Authenticate": 'Bearer realm="dozzier"' } });
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
