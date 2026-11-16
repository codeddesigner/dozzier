/** Turns a cloud-storage share link into a direct download URL. Shared by the import route and the upload dialog. */
export type Provider = "Google Drive" | "Dropbox" | "OneDrive" | "SharePoint" | "Box";

export const PROVIDER_HINT: Record<Provider, { example: string; how: string }> = {
  "Google Drive": { example: "https://drive.google.com/file/d/…/view", how: "In Drive, click Share → General access → “Anyone with the link”, then Copy link. Google Docs, Slides and Sheets come in as PDF." },
  Dropbox: { example: "https://www.dropbox.com/scl/fi/…", how: "In Dropbox, click Share → Copy link (anyone with the link can view)." },
  OneDrive: { example: "https://1drv.ms/…", how: "In OneDrive, click Share → “Anyone with the link can view” → Copy link." },
  SharePoint: { example: "https://yourcompany.sharepoint.com/:b:/…", how: "Click Share → “Anyone with the link” → Copy link. If your company blocks public links, download the file and upload it instead." },
  Box: { example: "https://app.box.com/s/…", how: "In Box, click Share → enable “People with the link” → Copy link." },
};

/** Hosts we will contact (the share host and the CDNs they redirect downloads to). Anything else is refused. */
const ALLOWED = [
  "drive.google.com", "docs.google.com", "drive.usercontent.google.com", "googleusercontent.com",
  "dropbox.com", "dropboxusercontent.com",
  "1drv.ms", "onedrive.live.com", "api.onedrive.com", "my.microsoftpersonalcontent.com", "microsoftpersonalcontent.com", "sharepoint.com", "svc.ms", "livefilestore.com",
  "box.com", "boxcloud.com", "box.net",
];
export const hostAllowed = (h: string) => ALLOWED.some((a) => h === a || h.endsWith(`.${a}`));

export function detectProvider(u: URL): Provider | null {
  const h = u.hostname;
  if (/(^|\.)drive\.google\.com$|(^|\.)docs\.google\.com$/.test(h)) return "Google Drive";
  if (/(^|\.)dropbox\.com$/.test(h)) return "Dropbox";
  if (/(^|\.)sharepoint\.com$/.test(h)) return "SharePoint";
  if (h === "1drv.ms" || /(^|\.)onedrive\.live\.com$/.test(h)) return "OneDrive";
  if (/(^|\.)box\.com$/.test(h)) return "Box";
  return null;
}

const b64url = (s: string) => btoa(unescape(encodeURIComponent(s))).replace(/=+$/, "").replace(/\//g, "_").replace(/\+/g, "-");

/** Candidate direct-download URLs, best first. */
export function downloadUrls(raw: string): { provider: Provider; urls: string[] } | null {
  let u: URL;
  try { u = new URL(raw.trim()); } catch { return null; }
  if (u.protocol !== "https:") return null;
  const provider = detectProvider(u);
  if (!provider) return null;
  const urls: string[] = [];
  if (provider === "Google Drive") {
    const doc = u.pathname.match(/\/(document|presentation|spreadsheets|drawings)\/d\/([\w-]+)/);
    const id = doc?.[2] || u.pathname.match(/\/file\/d\/([\w-]+)/)?.[1] || u.searchParams.get("id");
    if (doc) {
      const kind = doc[1];
      const fmt = kind === "spreadsheets" ? "xlsx" : "pdf";
      urls.push(`https://docs.google.com/${kind}/d/${doc[2]}/export?format=${fmt}`);
    } else if (id) {
      urls.push(`https://drive.usercontent.google.com/download?id=${id}&export=download&confirm=t`, `https://drive.google.com/uc?export=download&id=${id}&confirm=t`);
    }
  } else if (provider === "Dropbox") {
    u.searchParams.set("dl", "1");
    urls.push(u.toString());
  } else if (provider === "OneDrive" || provider === "SharePoint") {
    const d = new URL(u.toString()); d.searchParams.set("download", "1");
    urls.push(d.toString(), `https://api.onedrive.com/v1.0/shares/u!${b64url(u.toString())}/root/content`);
  } else if (provider === "Box") {
    const hash = u.pathname.match(/\/s\/([\w]+)/)?.[1];
    if (hash) urls.push(`https://app.box.com/shared/static/${hash}`, `https://app.box.com/index.php?rm=box_download_shared_file&shared_name=${hash}`);
    else urls.push(u.toString());
  }
  return urls.length ? { provider, urls } : null;
}
