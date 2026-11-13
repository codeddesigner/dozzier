"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Modal, toast } from "@/components/ui";
import { SPACE_TEMPLATES } from "@/components/templates";

export async function createSpace(t: (typeof SPACE_TEMPLATES)[number] | null, name: string) {
  const { data, error } = await supabase.from("spaces").insert({ name, subtitle: t?.name || "Data room", template: t?.name || null, banner: t?.banner || "linear-gradient(120deg,#0061fe,#8ab2ff)" }).select("id").single();
  if (error) throw error;
  if (t) await supabase.from("space_items").insert(t.folders.map((f, i) => ({ space_id: data.id, kind: "folder", name: f, position: i })));
  return data.id as string;
}

export function TemplatePicker({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [pick, setPick] = useState(2);
  const [busy, setBusy] = useState(false);
  const go = async () => {
    setBusy(true);
    try { const id = await createSpace(pick >= 0 ? SPACE_TEMPLATES[pick] : null, name.trim() || (pick >= 0 ? SPACE_TEMPLATES[pick].name : "New data room")); router.push(`/app/spaces/${id}`); }
    catch (e: unknown) { toast(e instanceof Error ? e.message : "Couldn’t create space"); setBusy(false); }
  };
  return (
    <Modal title="New data room" onClose={onClose} width={720} footer={<><span className="grow" /><button className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-dark" disabled={busy} onClick={go}>{busy ? "Creating…" : "Create Space"}</button></>}>
      <label className="field"><span className="label">Name</span><input className="input" autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Series A — Acme Ventures" /></label>
      <div className="label mt-16" style={{ marginBottom: 8 }}>Template</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {SPACE_TEMPLATES.map((t, i) => (
          <button key={t.name} className="template-card" style={{ textAlign: "left", outline: pick === i ? "2px solid var(--dz-border-brand)" : "none" }} onClick={() => setPick(i)}>
            <div style={{ background: t.banner }} />
            <div style={{ padding: 12 }}><div className="semibold">{t.name}</div><div className="caption muted mt-8">{t.desc}</div></div>
          </button>
        ))}
        <button className="template-card" style={{ textAlign: "left", outline: pick === -1 ? "2px solid var(--dz-border-brand)" : "none" }} onClick={() => setPick(-1)}>
          <div style={{ background: "var(--dz-bg-emphasis)", display: "flex", alignItems: "center", justifyContent: "center" }}><Plus /></div>
          <div style={{ padding: 12 }}><div className="semibold">Blank Space</div><div className="caption muted mt-8">Start from scratch.</div></div>
        </button>
      </div>
    </Modal>
  );
}

