/** The workspace's active custom domain, set once the app loads. Links show on it instead of dozzier.co. */
let base: string | null = null;
export function setLinkDomain(domain: string | null) { base = domain; }
export function linkUrlFor(slug: string) {
  if (base) return `https://${base}/${slug}`;
  return `${typeof window !== "undefined" ? window.location.origin : "https://dozzier.co"}/v/${slug}`;
}
