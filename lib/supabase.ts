import { createClient } from "@supabase/supabase-js";

// Publishable (client-safe) values. Overridable via Vercel env vars.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://hxgcoekovalkmdwcabll.supabase.co";
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_D1l_C12Kv_Y-yhzzALG6oA_rL3T1WQ1";

export const supabase = createClient(url, key, {
  auth: { persistSession: true, autoRefreshToken: true, storageKey: "dozzier-auth" },
});

export const BUCKET = "documents";
export const SUPABASE_URL = url;
export const SUPABASE_KEY = key;

export type Doc = {
  id: string; owner_id: string; folder_id: string | null; name: string; note: string | null;
  file_path: string | null; file_type: string; mime_type: string | null; size_bytes: number | null;
  page_count: number; is_sample: boolean; deleted_at: string | null; created_at: string; updated_at: string;
};
export type Link = {
  id: string; document_id: string | null; space_id: string | null; name: string; slug: string; enabled: boolean;
  require_email: boolean; allow_download: boolean; passcode: string | null; expires_at: string | null;
  watermark: boolean; require_nda: boolean; allowed_domains: string | null; screenshot_protection: boolean;
  notify: boolean; created_at: string;
};
export type Visit = {
  id: string; link_id: string | null; document_id: string | null; contact_id: string | null; account_id: string | null;
  visitor_email: string | null; location: string | null; duration_seconds: number; pages_viewed: number;
  downloaded: boolean; is_sample: boolean; started_at: string; last_seen_at: string;
};
export type Contact = {
  id: string; account_id: string | null; name: string | null; email: string; title: string | null; tags: string[];
  scope: string; archived: boolean; is_sample: boolean; created_at: string;
};
export type Account = { id: string; name: string; domain: string | null; archived: boolean; is_sample: boolean; created_at: string };
export type Folder = { id: string; name: string; kind: "personal" | "team"; created_at: string };
export type Space = { id: string; name: string; subtitle: string | null; template: string | null; status: string; banner: string; created_at: string; updated_at: string; require_nda?: boolean; watermark?: boolean; allow_download?: boolean };
export type SpaceItem = { id: string; space_id: string; parent_id: string | null; kind: "folder" | "document"; name: string; document_id: string | null; position: number; created_at: string };
