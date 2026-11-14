"use client";
import { useEffect, useState } from "react";
import { Copy, Check } from "lucide-react";
import { API_INTRO, ENDPOINTS, type Endpoint } from "@/lib/docs";

const METHOD_CLASS: Record<string, string> = { GET: "m-get", POST: "m-post", PATCH: "m-patch", DEL: "m-del" };

function code(e: Endpoint, lang: "curl" | "node" | "python") {
  const url = `https://api.dozzier.io${e.path.replace("{id}", "lnk_2xut37i4")}`;
  const m = e.method === "DEL" ? "DELETE" : e.method;
  const body = e.body ? JSON.stringify(e.body, null, 2) : "";
  if (lang === "curl") return [`curl ${m === "GET" ? "" : `-X ${m} `}${url} \\`, `  -H "Authorization: Bearer dz_live_…" \\`, ...(body ? [`  -H "Content-Type: application/json" \\`, `  -d '${body.replace(/\n/g, "\n  ")}'`] : [])].join("\n").replace(/ \\$/, "");
  if (lang === "node") return `const res = await fetch("${url}", {\n  method: "${m}",\n  headers: {\n    Authorization: "Bearer " + process.env.DOZZIER_KEY,${body ? '\n    "Content-Type": "application/json",' : ""}\n  },${body ? `\n  body: JSON.stringify(${body.replace(/\n/g, "\n  ")}),` : ""}\n});\nconst data = await res.json();`;
  return `import os, requests\n\nres = requests.${m.toLowerCase()}(\n    "${url}",\n    headers={"Authorization": f"Bearer {os.environ['DOZZIER_KEY']}"},${body ? `\n    json=${body.replace(/true/g, "True").replace(/false/g, "False").replace(/\n/g, "\n    ")},` : ""}\n)\ndata = res.json()`;
}

/** Light JSON/shell highlighting: strings green, keys blue-ish. */
function Hl({ text }: { text: string }) {
  const parts = text.split(/("(?:[^"\\]|\\.)*")/g);
  return <>{parts.map((p, i) => (p.startsWith('"') ? <span key={i} className={parts[i + 1]?.trimStart().startsWith(":") ? "tok-key" : "tok-str"}>{p}</span> : <span key={i}>{p}</span>))}</>;
}

export default function ApiReference() {
  const [id, setId] = useState("create-link");
  const [lang, setLang] = useState<"curl" | "node" | "python">("curl");
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    const read = () => { const h = window.location.hash.slice(1); if (h) setId(h); };
    read(); window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);
  const ep = ENDPOINTS.find((e) => e.id === id);
  const intro = API_INTRO.find((x) => x.id === id);
  const groups = Array.from(new Set(ENDPOINTS.map((e) => e.group)));
  const snippet = ep ? code(ep, lang) : "";

  return (
    <div className="api-shell">
      <aside className="doc-side">
        <div className="doc-side-group"><div className="doc-side-label">Introduction</div>
          {API_INTRO.map((x) => <a key={x.id} href={`#${x.id}`} className={`doc-side-link ${id === x.id ? "on" : ""}`}>{x.title}</a>)}</div>
        {groups.map((g) => (
          <div key={g} className="doc-side-group"><div className="doc-side-label">{g}</div>
            {ENDPOINTS.filter((e) => e.group === g).map((e) => (
              <a key={e.id} href={`#${e.id}`} className={`doc-side-link row gap-8 ${id === e.id ? "on" : ""}`}>
                {g !== "Webhooks" && <span className={`method ${METHOD_CLASS[e.method]}`}>{e.method}</span>}{e.title}
              </a>
            ))}
          </div>
        ))}
      </aside>
      <main className="api-main" key={id}>
        <div className="notice info" style={{ marginBottom: 24 }}>The Dozzier API is in private beta. <a className="link" href="/docs/contact">Request access</a> and we’ll enable keys for your workspace.</div>
        {intro ? (
          <>
            <h1 className="doc-title">{intro.title}</h1>
            <p className="doc-p">{intro.body}</p>
            {intro.id === "authentication" && <pre className="api-inline">Authorization: Bearer dz_live_…</pre>}
          </>
        ) : ep && (
          <>
            <div className="row gap-8"><span className={`method ${METHOD_CLASS[ep.method]}`}>{ep.method}</span><code className="medium">{ep.path}</code></div>
            <h1 className="doc-title" style={{ marginTop: 12 }}>{ep.title}</h1>
            <p className="doc-p">{ep.desc}</p>
            {ep.params.length > 0 && (
              <>
                <h2 className="h3" style={{ margin: "28px 0 14px" }}>{ep.method === "GET" ? "Query parameters" : "Body parameters"}</h2>
                <div className="api-params">
                  {ep.params.map((p, i) => (
                    <div key={p.name} className="api-param" style={{ ["--i" as string]: i }}>
                      <div><code className="medium">{p.name}</code><div className="caption faint">{p.type} {p.required ? <span style={{ color: "var(--dz-text-danger)" }}>required</span> : "optional"}</div></div>
                      <div className="muted">{p.desc}</div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </main>
      <aside className="api-code">
        {ep && !intro ? (
          <>
            <div className="row gap-16 api-tabs">{(["curl", "node", "python"] as const).map((l) => <button key={l} className={lang === l ? "on" : ""} onClick={() => setLang(l)}>{l === "curl" ? "cURL" : l === "node" ? "Node" : "Python"}</button>)}
              <span className="spacer" /><button aria-label="Copy" onClick={() => { navigator.clipboard?.writeText(snippet); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>{copied ? <Check size={14} /> : <Copy size={14} />}</button></div>
            <pre className="api-pre" key={lang + id}><Hl text={snippet} /></pre>
            <div className="api-resp-label">Response · {ep.status}</div>
            <pre className="api-pre" key={"r" + id}><Hl text={JSON.stringify(ep.response, null, 2)} /></pre>
          </>
        ) : (
          <pre className="api-pre"><Hl text={`{\n  "error": {\n    "code": "unauthorized",\n    "message": "Invalid API key"\n  }\n}`} /></pre>
        )}
      </aside>
    </div>
  );
}
