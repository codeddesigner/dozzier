"use client";
import { createContext, useContext } from "react";

export type Profile = {
  id: string; full_name: string | null; workspace_name: string | null; plan: string; created_at: string;
  team_size?: string | null; job_role?: string | null; use_cases?: string[]; brand_color?: string | null; brand_logo_path?: string | null;
  custom_domain?: string | null; hide_branding?: boolean; invite_link_enabled?: boolean; notify_visits?: boolean; crm_connected?: boolean;
  checklist_dismissed?: boolean; onboarded_at?: string | null;
};
export type AppCtx = { userId: string; email: string; profile: Profile; refreshProfile: () => Promise<void> };

export const Ctx = createContext<AppCtx | null>(null);
export function useApp(): AppCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("useApp outside AppShell");
  return c;
}
