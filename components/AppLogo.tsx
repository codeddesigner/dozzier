/** Integration logo tile from the Figma "App Logo" component. Official assets where supplied, monogram slot otherwise. */
const LOGOS: Record<string, { src: string; w: number; h: number } | { mono: string }> = {
  HubSpot: { src: "/logos/hubspot.svg", w: 28, h: 28.8 },
  Salesforce: { src: "/logos/salesforce.png", w: 38.4, h: 26.88 },
  Pipedrive: { mono: "Pd" },
  Slack: { src: "/logos/slack.png", w: 28.8, h: 28.8 },
  Teams: { mono: "Mt" },
  Gmail: { src: "/logos/gmail.png", w: 31.2, h: 23.4 },
  Outlook: { mono: "Ol" },
  Zoom: { mono: "Zm" },
  Zapier: { src: "/logos/zapier.png", w: 40.8, h: 11.16 },
  Notion: { mono: "No" },
  "Google Drive": { src: "/logos/google-drive.png", w: 31.2, h: 28.08 },
  Dropbox: { mono: "Db" },
  Box: { mono: "Bx" },
  OneDrive: { mono: "Od" },
  SharePoint: { mono: "Sp" },
};

export const INTEGRATIONS = Object.keys(LOGOS);

export function AppLogo({ name, size = 48 }: { name: string; size?: number }) {
  const l = LOGOS[name] || { mono: name.slice(0, 2) };
  const s = size / 48;
  if ("mono" in l) {
    return <span className="app-logo mono" style={{ width: size, height: size, fontSize: 15.6 * s, borderRadius: 12 * s }}>{l.mono}</span>;
  }
  return (
    <span className="app-logo" style={{ width: size, height: size, borderRadius: 12 * s }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={l.src} alt={`${name} logo`} width={l.w * s} height={l.h * s} style={{ objectFit: "contain" }} />
    </span>
  );
}
