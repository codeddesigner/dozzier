"use client";
import { createContext, useContext } from "react";

export type Profile = { billing_subscription?: string | null; subscription_status?: string | null; billing_seats?: number | null;
  id: string; full_name: string | null; workspace_name: string | null; plan: string; created_at: string;
  team_size?: string | null; job_role?: string | null; use_cases?: string[]; brand_color?: string | null; brand_logo_path?: string | null;
  custom_domain?: string | null; hide_branding?: boolean; invite_link_enabled?: boolean; notify_visits?: boolean; crm_connected?: boolean;
  checklist_dismissed?: boolean; onboarded_at?: string | null;
  settings?: Record<string, any>; avatar_path?: string | null; job_title?: string | null; bio?: string | null; booking_url?: string | null;
};
/** wsId: the workspace the user works in (their own id, or the owner who invited them). role: Owner | Admin | Editor | Viewer. */
export type AppCtx = { userId: string; wsId: string; role: string; email: string; profile: Profile; refreshProfile: () => Promise<void> };

export const Ctx = createContext<AppCtx | null>(null);
export function useApp(): AppCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("useApp outside AppShell");
  return c;
}
