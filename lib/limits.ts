/** Plan limits shared by billing, uploads and data rooms. Storage is per workspace. */
export const PLAN_LIMITS: Record<string, { name: string; price: string; seats: number; rooms: number; esign: number; gb: number }> = {
  trial: { name: "Free trial", price: "14 days free · no card needed", seats: 3, rooms: 10, esign: 100, gb: 100 },
  personal: { name: "Personal", price: "$5 / user / month", seats: 1, rooms: 0, esign: 4, gb: 10 },
  standard: { name: "Standard", price: "$25 / user / month", seats: 5, rooms: 3, esign: 1000, gb: 50 },
  datarooms: { name: "Data Rooms", price: "$140 / month", seats: 3, rooms: 10, esign: 1000, gb: 100 },
  canceled: { name: "No active plan", price: "Choose a plan to keep sharing", seats: 1, rooms: 0, esign: 0, gb: 1 },
};
export const MAX_FILE_BYTES = 2 * 1024 ** 3; // 2 GB per file
export const limitsFor = (plan: string | null | undefined) => PLAN_LIMITS[plan || "trial"] || PLAN_LIMITS.trial;
export const fmtBytes = (n: number) => (n >= 1e9 ? `${(n / 1e9).toFixed(1)} GB` : n >= 1e6 ? `${Math.round(n / 1e6)} MB` : `${Math.max(1, Math.round(n / 1e3))} KB`);
