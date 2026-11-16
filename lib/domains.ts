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
/** What each plan may add: Standard gets subdomains, Data Rooms gets subdomains and full domains. */
export function domainRule(plan: string | null | undefined): "none" | "subdomain" | "any" {
  if (plan === "datarooms") return "any";
  if (plan === "standard") return "subdomain";
  return "none";
}
/** The DNS "name" field for a record: "docs" for docs.acme.com, "@" for acme.com. */
export function hostLabel(domain: string) {
  const parts = domain.toLowerCase().split(".");
  const keep = TWO_PART.has(parts.slice(-2).join(".")) ? 3 : 2;
  return parts.length <= keep ? "@" : parts.slice(0, parts.length - keep).join(".");
}
