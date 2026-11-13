import { LayoutGrid, Folder, House, FileSignature, FileInput, CircleUserRound, Building2, Share2, Sparkles, Settings, CircleHelp } from "lucide-react";

export const NAV_MAIN = [
  { href: "/app", label: "Dashboard", icon: LayoutGrid },
  { href: "/app/content", label: "Content", icon: Folder },
  { href: "/app/spaces", label: "Spaces", icon: House },
  { href: "/app/agreements", label: "Agreements", icon: FileSignature },
  { href: "/app/file-requests", label: "File requests", icon: FileInput },
  { href: "/app/contacts", label: "Contacts", icon: CircleUserRound },
  { href: "/app/accounts", label: "Accounts", icon: Building2 },
  { href: "/app/shared", label: "Shared with me", icon: Share2 },
];
export const NAV_BOTTOM = [
  { href: "/app/ask", label: "Ask Dozzier", icon: Sparkles },
  { href: "/app/settings", label: "Settings", icon: Settings },
  { href: "/app/help", label: "Help", icon: CircleHelp },
];
