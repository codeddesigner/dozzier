/** Hosts that serve the Dozzier app itself. Anything else reaching us is a customer's custom domain. */
export const APP_HOSTS = ["dozzier.co", "www.dozzier.co", "dozzier.vercel.app", "localhost"];
export function isAppHost(host: string) {
  const h = host.toLowerCase().split(":")[0];
  return APP_HOSTS.includes(h) || h.endsWith(".vercel.app") || h.endsWith(".vercel.run") || h === "127.0.0.1";
}

// Second-level suffixes where the registrable domain has three labels (acme.co.uk).
const TWO_PART = new Set(["co.uk", "org.uk", "ac.uk", "gov.uk", "com.au", "net.au", "org.au", "co.nz", "co.za", "com.ng", "org.ng", "edu.ng", "gov.ng", "com.br", "com.mx", "co.jp", "co.in", "com.sg", "com.hk", "co.ke", "com.gh", "co.il", "com.tr", "com.cn", "com.ar", "co.id"]);
/** true for a bare domain like acme.com or acme.co.uk; false for docs.acme.com. */
export function isApex(domain: string) {
  const parts = domain.toLowerCase().split(".");
  return parts.length <= (TWO_PART.has(parts.slice(-2).join(".")) ? 3 : 2);
}
export function normalizeDomain(input: string) {
  return input.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/\.$/, "");
}
/** Every workspace on Standard can claim <name>.dozzier.co, like DocSend’s company subdomain. */
export const VANITY_ROOT = "dozzier.co";
const RESERVED = new Set(["www", "app", "api", "admin", "docs", "doc", "help", "support", "status", "blog", "mail", "email", "smtp", "ftp", "cdn", "static", "assets", "img", "images", "files", "auth", "login", "signup", "account", "billing", "pay", "dashboard", "dev", "staging", "test", "beta", "demo", "news", "security", "legal", "dozzier", "team", "sales", "hello", "info", "m", "mobile", "ns1", "ns2", "mx", "webmail", "vercel"]);
/** "acme" → null if usable, else the reason it isn’t. */
export function vanityProblem(label: string): string | null {
  if (!/^[a-z0-9]([a-z0-9-]{1,30}[a-z0-9])$/.test(label)) return "Use 3–32 letters, numbers or hyphens (not at the start or end)";
  if (label.includes("--")) return "Avoid double hyphens";
  if (RESERVED.has(label)) return "That name is reserved — try another";
  return null;
}
/** true for acme.dozzier.co */
export function isVanity(domain: string) {
  const d = domain.toLowerCase();
  return d.endsWith(`.${VANITY_ROOT}`) && d.slice(0, -VANITY_ROOT.length - 1).split(".").length === 1;
}
/** Suggests a vanity name from the workspace name: "Ssurce Ltd" → "ssurce-ltd". */
export function suggestVanity(name: string) {
  return name.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 32) || "";
}
/** What each plan may add: Standard (and the trial) gets a name.dozzier.co address; Data Rooms also gets its own domains. */
export function domainRule(plan: string | null | undefined): "none" | "vanity" | "any" {
  if (plan === "datarooms") return "any";
  if (plan === "standard" || plan === "trial") return "vanity";
  return "none";
}
/** The DNS "name" field for a record: "docs" for docs.acme.com, "@" for acme.com. */
export function hostLabel(domain: string) {
  const parts = domain.toLowerCase().split(".");
  const keep = TWO_PART.has(parts.slice(-2).join(".")) ? 3 : 2;
  return parts.length <= keep ? "@" : parts.slice(0, parts.length - keep).join(".");
}
