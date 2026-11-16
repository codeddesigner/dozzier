import { LayoutGrid, Folder, House, FileSignature, FileInput, CircleUserRound, Building2, Share2, Sparkles, Settings, FolderLock } from "lucide-react";

export const NAV_GROUPS = [
  { label: "Overview", items: [{ href: "/app", label: "Dashboard", icon: LayoutGrid }] },
  {
    label: "Share",
    items: [
      { href: "/app/content", label: "Content", icon: Folder },
      { href: "/app/spaces", label: "Spaces", icon: House },
      { href: "/app/agreements", label: "Agreements", icon: FileSignature },
      { href: "/app/file-requests", label: "File requests", icon: FileInput },
    ],
  },
  {
    label: "Leads",
    items: [
      { href: "/app/contacts", label: "Contacts", icon: CircleUserRound },
      { href: "/app/accounts", label: "Accounts", icon: Building2 },
      { href: "/app/shared", label: "Shared with me", icon: Share2 },
    ],
  },
  {
    label: "Manage",
    items: [
      { href: "/app/settings", label: "Settings", icon: Settings },
    ],
  },
];

export const NAV_ALL = NAV_GROUPS.flatMap((g) => g.items);
export const NAV_MAIN = NAV_ALL;
export const NAV_BOTTOM: typeof NAV_ALL = [];

/** App switcher tiles in the Nav Rail. */
export const APPS = [
  { href: "/app", label: "Share", icon: LayoutGrid, match: (p: string) => !p.startsWith("/app/spaces") && !p.startsWith("/app/agreements") },
  { href: "/app/spaces", label: "Data rooms", icon: FolderLock, match: (p: string) => p.startsWith("/app/spaces") },
  { href: "/app/agreements", label: "eSign", icon: FileSignature, match: (p: string) => p.startsWith("/app/agreements") },
];

/** Flat sidebar list (Figma: Sidebar / Mode=Expanded). Search and Activity are rendered by the layout. */
export const NAV_SIDE = NAV_ALL;
