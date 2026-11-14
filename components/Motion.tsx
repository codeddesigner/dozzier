"use client";
import { Fragment, ReactNode, useEffect, useRef, useState } from "react";

/**
 * Global motion engine (mounted once in the root layout).
 * - [data-reveal]      → gets `.in` when scrolled into view (variants: up | scale | left | right | blur)
 * - [data-stagger]     → children get --i and reveal one after another
 * - [data-tilt-scroll] → --p (0→1) as it scrolls toward the viewport centre (hero product shot)
 * - .spotlight         → --mx/--my follow the pointer for a soft glow
 * - html.scrolled      → set once the page leaves the top (nav shadow)
 */
export function MotionRoot() {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("motion");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
      }
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });

    const prep = (scope: ParentNode) => {
      scope.querySelectorAll<HTMLElement>("[data-stagger]").forEach((p) => {
        if (p.dataset.staggerReady) return;
        p.dataset.staggerReady = "1";
        const step = Number(p.dataset.stagger) || 70;
        Array.from(p.children).forEach((c, i) => {
          const el = c as HTMLElement;
          if (!el.hasAttribute("data-reveal")) el.setAttribute("data-reveal", p.dataset.staggerVariant || "up");
          el.style.setProperty("--delay", `${i * step}ms`);
        });
      });
      scope.querySelectorAll<HTMLElement>("[data-reveal]:not(.in)").forEach((el) => {
        if (reduce) el.classList.add("in"); else io.observe(el);
      });
    };
    prep(document);
    const mo = new MutationObserver((muts) => {
      for (const m of muts) m.addedNodes.forEach((n) => { if (n.nodeType === 1) prep(n.parentNode || document); });
    });
    mo.observe(document.body, { childList: true, subtree: true });

    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        root.classList.toggle("scrolled", window.scrollY > 8);
        const vh = window.innerHeight;
        document.querySelectorAll<HTMLElement>("[data-tilt-scroll]").forEach((el) => {
          const r = el.getBoundingClientRect();
          const p = Math.min(1, Math.max(0, 1 - (r.top - vh * 0.18) / (vh * 0.62)));
          el.style.setProperty("--p", p.toFixed(3));
        });
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    const onMove = (e: PointerEvent) => {
      const t = (e.target as Element | null)?.closest?.(".spotlight") as HTMLElement | null;
      if (!t) return;
      const r = t.getBoundingClientRect();
      t.style.setProperty("--mx", `${e.clientX - r.left}px`);
      t.style.setProperty("--my", `${e.clientY - r.top}px`);
    };
    document.addEventListener("pointermove", onMove, { passive: true });

    return () => { io.disconnect(); mo.disconnect(); window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); document.removeEventListener("pointermove", onMove); };
  }, []);
  return null;
}

export function useInView<T extends Element>(once = true, margin = "0px 0px -10% 0px") {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setInView(true); if (once) io.disconnect(); } else if (!once) setInView(false);
    }, { rootMargin: margin });
    io.observe(el);
    return () => io.disconnect();
  }, [once, margin]);
  return [ref, inView] as const;
}

const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const easeOut = (t: number) => 1 - Math.pow(1 - t, 4);

/** Counts up to `to` once visible (and re-animates when `to` changes). */
export function CountUp({ to, duration = 1200, format = (n: number) => Math.round(n).toLocaleString(), className }: { to: number; duration?: number; format?: (n: number) => string; className?: string }) {
  const [ref, inView] = useInView<HTMLSpanElement>();
  const [val, setVal] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    if (!inView) return;
    if (reduced()) { setVal(to); return; }
    const start = performance.now(), a = from.current;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const v = a + (to - a) * easeOut(t);
      setVal(v);
      if (t < 1) raf = requestAnimationFrame(tick); else from.current = to;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, inView, duration]);
  return <span ref={ref} className={className} style={{ fontVariantNumeric: "tabular-nums" }}>{format(val)}</span>;
}

/** Types text out once visible, with a blinking caret while typing. */
export function TypeText({ text, speed = 18, delay = 300 }: { text: string; speed?: number; delay?: number }) {
  const [ref, inView] = useInView<HTMLSpanElement>();
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!inView) return;
    if (reduced()) { setN(text.length); return; }
    let i = 0, iv: ReturnType<typeof setInterval> | undefined;
    const t = setTimeout(() => { iv = setInterval(() => { i += 1; setN(i); if (i >= text.length) clearInterval(iv); }, speed); }, delay);
    return () => { clearTimeout(t); if (iv) clearInterval(iv); };
  }, [inView, text, speed, delay]);
  return (
    <span ref={ref} aria-label={text}>
      <span aria-hidden="true">{text.slice(0, n)}</span>
      {n < text.length && <span className="caret" aria-hidden="true" />}
      <span aria-hidden="true" style={{ visibility: "hidden" }}>{text.slice(n)}</span>
    </span>
  );
}

/** Cycles through `items` every `every` ms while visible; renders the current one with a keyed swap animation. */
export function Cycle<T>({ items, every = 3000, render }: { items: T[]; every?: number; render: (item: T, i: number) => ReactNode }) {
  const [ref, inView] = useInView<HTMLDivElement>(false);
  const [i, setI] = useState(0);
  useEffect(() => {
    if (!inView || reduced()) return;
    const t = setInterval(() => setI((x) => (x + 1) % items.length), every);
    return () => clearInterval(t);
  }, [inView, items.length, every]);
  return <div ref={ref} className="cycle"><div key={i} className="cycle-item">{render(items[i], i)}</div></div>;
}

/** Splits a headline into words that rise in one after another. */
export function WordReveal({ text, className, delay = 0, step = 55 }: { text: string; className?: string; delay?: number; step?: number }) {
  return (
    <span className={className} aria-label={text}>
      {text.split(" ").map((w, i, all) => (
        <Fragment key={i}>
          <span className="word" aria-hidden="true"><span style={{ animationDelay: `${delay + i * step}ms` }}>{w}</span></span>
          {i < all.length - 1 ? " " : null}
        </Fragment>
      ))}
    </span>
  );
}
