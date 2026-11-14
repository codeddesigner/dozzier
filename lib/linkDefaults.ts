export type LinkDefault = { on: boolean; locked: boolean };
export type Preset = Record<string, LinkDefault>;
export const LINK_DEFAULT_KEYS = ["require_email", "allow_download", "watermark", "expiry", "require_nda", "notify"] as const;
const base = (o: Partial<Record<string, boolean>>, locked: string[] = []): Preset =>
  Object.fromEntries(LINK_DEFAULT_KEYS.map((k) => [k, { on: !!o[k], locked: locked.includes(k) }]));
export const DEFAULT_PRESETS: Record<string, Preset> = {
  Standard: base({ require_email: true, watermark: true, expiry: true, notify: true }, ["require_email", "watermark"]),
  Fundraising: base({ require_email: true, watermark: true, notify: true }, ["require_email"]),
  Sales: base({ require_email: true, allow_download: true, notify: true }),
  "Legal & M&A": base({ require_email: true, watermark: true, require_nda: true, expiry: true, notify: true }, ["require_email", "watermark", "require_nda"]),
};
/** The Standard preset from a profile's settings (falls back to built-in defaults). */
export function standardPreset(settings?: Record<string, unknown>): Preset {
  const saved = (settings?.link_defaults as Record<string, Preset> | undefined)?.Standard;
  return { ...DEFAULT_PRESETS.Standard, ...(saved || {}) };
}
