"use client";
import { useRef } from "react";

/** 6-digit code input: paste-to-fill, auto-advance, auto-submit on the 6th digit. */
export function OtpInput({ value, onChange, onComplete, disabled }: { value: string; onChange: (v: string) => void; onComplete?: (v: string) => void; disabled?: boolean }) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length: 6 }, (_, i) => value[i] || "");
  const set = (v: string) => {
    const clean = v.replace(/\D/g, "").slice(0, 6);
    onChange(clean);
    if (clean.length === 6) onComplete?.(clean);
    refs.current[Math.min(clean.length, 5)]?.focus();
  };
  return (
    <div className="otp" onPaste={(e) => { e.preventDefault(); set(e.clipboardData.getData("text")); }}>
      {digits.map((d, i) => (
        <span key={i} className="row" style={{ gap: 8 }}>
          {i === 3 && <span className="otp-dash">–</span>}
          <input
            ref={(el) => { refs.current[i] = el; }}
            className="otp-cell" inputMode="numeric" autoComplete={i === 0 ? "one-time-code" : "off"} maxLength={1} value={d} disabled={disabled}
            aria-label={`Digit ${i + 1}`} autoFocus={i === 0}
            onChange={(e) => {
              const ch = e.target.value.replace(/\D/g, "").slice(-1);
              const next = (value.slice(0, i) + ch + value.slice(i + 1)).slice(0, 6);
              if (!ch) return;
              onChange(next);
              if (next.length === 6) onComplete?.(next); else refs.current[i + 1]?.focus();
            }}
            onKeyDown={(e) => {
              if (e.key === "Backspace" && !d && i > 0) { onChange(value.slice(0, i - 1)); refs.current[i - 1]?.focus(); }
            }}
          />
        </span>
      ))}
    </div>
  );
}
