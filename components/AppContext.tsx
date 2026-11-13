"use client";
import { createContext, useContext } from "react";

export type Profile = { id: string; full_name: string | null; workspace_name: string | null; plan: string; created_at: string };
export type AppCtx = { userId: string; email: string; profile: Profile; refreshProfile: () => Promise<void> };

export const Ctx = createContext<AppCtx | null>(null);
export function useApp(): AppCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("useApp outside AppShell");
  return c;
}
