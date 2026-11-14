"use client";
import { useEffect, useRef, useState } from "react";
import { DocRenderer } from "@/components/DocRenderer";

/** Renders every page of an agreement PDF at a fixed width, with an overlay layer per page (coords in 0–1). */
export function Pages({ url, count, width = 640, overlay, onDrop, onPageDown }: {
  url: string; count: number; width?: number;
  overlay: (page: number) => React.ReactNode;
  onDrop?: (page: number, x: number, y: number, e: React.DragEvent) => void;
  onPageDown?: (page: number) => void;
}) {
  const refs = useRef<(HTMLDivElement | null)[]>([]);
  const box = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(width);
  useEffect(() => {
    const fit = () => { const cw = box.current?.parentElement?.clientWidth || width; setW(Math.max(260, Math.min(width, cw - 24))); };
    fit(); window.addEventListener("resize", fit); return () => window.removeEventListener("resize", fit);
  }, [width]);
  return (
    <div className="es-pages" ref={box}>
      {Array.from({ length: Math.min(count, 30) }, (_, i) => (
        <div key={i} className="es-page" data-page={i + 1} ref={(el) => { refs.current[i] = el; }}
          onPointerDown={() => onPageDown?.(i + 1)}
          onDragOver={(e) => onDrop && e.preventDefault()}
          onDrop={(e) => { if (!onDrop) return; e.preventDefault(); const r = refs.current[i]!.getBoundingClientRect(); onDrop(i + 1, (e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height, e); }}>
          <DocRenderer source={{ kind: "pdf", url }} page={i} maxW={w} maxH={w * 3} />
          <div className="es-overlay">{overlay(i + 1)}</div>
          <span className="es-pnum">{i + 1}</span>
        </div>
      ))}
    </div>
  );
}

/** Pointer-drag helper for moving a field inside its page (values clamped to 0–1). */
export function startDrag(e: React.PointerEvent, f: { x: number; y: number; w: number; h: number }, onMove: (x: number, y: number) => void, onEnd: (x: number, y: number) => void) {
  const page = (e.currentTarget as HTMLElement).closest(".es-page") as HTMLElement | null;
  if (!page) return;
  e.preventDefault(); e.stopPropagation();
  const r = page.getBoundingClientRect();
  const sx = e.clientX, sy = e.clientY;
  let nx = f.x, ny = f.y;
  const move = (ev: PointerEvent) => {
    nx = Math.min(1 - f.w, Math.max(0, f.x + (ev.clientX - sx) / r.width));
    ny = Math.min(1 - f.h, Math.max(0, f.y + (ev.clientY - sy) / r.height));
    onMove(nx, ny);
  };
  const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); onEnd(nx, ny); };
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", up);
}
