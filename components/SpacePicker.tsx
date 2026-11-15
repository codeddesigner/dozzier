"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Check } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Modal, Toggle, toast } from "@/components/ui";
import { SPACE_TEMPLATES } from "@/components/templates";

type Tpl = (typeof SPACE_TEMPLATES)[number];
type Opts = { subtitle?: string; require_nda?: boolean; watermark?: boolean; allow_download?: boolean; verify_email?: boolean };

export async function createSpace(t: Tpl | null, name: string, o: Opts = {}) {
  const { data, error } = await supabase.from("spaces").insert({
    name, subtitle: o.subtitle?.trim() || t?.name || "Data room", template: t?.name || null, banner: t?.banner || "linear-gradient(120deg,#4D94F7,#8ab2ff)",
    require_nda: !!o.require_nda, watermark: o.watermark ?? true, allow_download: !!o.allow_download, verify_email: !!o.verify_email,
  }).select("id").single();
  if (error) throw error;
  if (t) await supabase.from("space_items").insert(t.folders.map((f, i) => ({ space_id: data.id, kind: "folder", name: f, position: i })));
  await supabase.from("space_groups").insert((t?.groups || ["Viewers"]).map((g, i) => ({ space_id: data.id, name: g, position: i })));
  return data.id as string;
}

/** Figma "Create a Space" modal. */
export function TemplatePicker({ onClose, initial = 0 }: { onClose: () => void; initial?: number }) {
  const router = useRouter();
  const order = [2, 1, 0]; // Investor DD, M&A, Simple — as in the design
  const [name, setName] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [pick, setPick] = useState(order[initial] ?? 2);
  const [o, setO] = useState({ require_nda: true, verify_email: true, watermark: true, allow_download: false });
  const [busy, setBusy] = useState(false);
  const go = async () => {
    setBusy(true);
    const t = pick >= 0 ? SPACE_TEMPLATES[pick] : null;
    try { const id = await createSpace(t, name.trim() || t?.name || "New data room", { ...o, subtitle }); router.push(`/app/spaces/${id}`); }
    catch (e: unknown) { toast(e instanceof Error ? e.message : "Couldn’t create space"); setBusy(false); }
  };
  return (
    <Modal title="Create a Space" onClose={onClose} width={720} footer={<><span className="grow" /><button className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-brand" disabled={busy} onClick={go}>{busy ? "Creating…" : "Create Space"}</button></>}>
      <div className="cs-grid">
        <div className="col gap-16">
          <label className="field"><span className="label">Space name</span><input className="input" autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Acme — Series A diligence" onKeyDown={(e) => e.key === "Enter" && go()} /></label>
          <label className="field"><span className="label">Subtitle (optional)</span><input className="input" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="Confidential · for Acme Ventures only" /></label>
          {([["require_nda", "Require NDA before entry"], ["verify_email", "Verify visitor email with a code"], ["watermark", "Watermark all pages"], ["allow_download", "Allow downloads"]] as const).map(([k, l]) => (
            <div className="row" key={k}><span className="grow" style={{ fontSize: 14 }}>{l}</span><Toggle on={o[k]} onChange={(v) => setO((x) => ({ ...x, [k]: v }))} /></div>
          ))}
          {pick >= 0 && <div className="cs-folders"><span className="caption muted">Starts with {SPACE_TEMPLATES[pick].folders.length} folders and groups for {SPACE_TEMPLATES[pick].groups.join(", ")}</span>
            <div className="row gap-6 wrap mt-8">{SPACE_TEMPLATES[pick].folders.slice(0, 6).map((f) => <span key={f} className="tag">{f}</span>)}{SPACE_TEMPLATES[pick].folders.length > 6 && <span className="tag">+{SPACE_TEMPLATES[pick].folders.length - 6}</span>}</div></div>}
        </div>
        <div className="col gap-8">
          <span className="label">Start from</span>
          {order.map((i) => { const t = SPACE_TEMPLATES[i]; return (
            <button key={t.name} className={`cs-tpl ${pick === i ? "on" : ""}`} onClick={() => setPick(i)}>
              <span className="cs-tpl-art"><span style={{ background: t.banner }} />{[70, 55, 64, 40].map((w, k) => <i key={k} style={{ width: `${w}%` }} />)}</span>
              <span className="col gap-4" style={{ padding: 10, minWidth: 0 }}><span className="medium" style={{ fontSize: 13 }}>{t.name}</span><span className="micro muted">{t.desc}</span>
                <span className={`btn btn-s ${pick === i ? "btn-primary" : "btn-dark"}`} style={{ alignSelf: "flex-start", height: 24, fontSize: 11, marginTop: "auto" }}>{pick === i ? <><Check size={12} />Selected</> : "Use template"}</span></span>
            </button>
          ); })}
          <button className={`cs-blank ${pick === -1 ? "on" : ""}`} onClick={() => setPick(-1)}><Plus size={18} /><span className="medium" style={{ fontSize: 13 }}>Blank Space</span></button>
        </div>
      </div>
    </Modal>
  );
}
