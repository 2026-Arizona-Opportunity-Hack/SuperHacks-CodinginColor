"use client";
import { animate, motion, useInView, useMotionValue, useScroll, useSpring, useTransform } from "framer-motion";
import { Fragment, useEffect, useRef, useState } from "react";
import { useCalm } from "./MotionProvider";

/** Thin gradient bar at the top of the page that fills as you scroll. */
export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 24, restDelta: 0.001 });
  return <motion.div aria-hidden className="no-print fixed inset-x-0 top-0 z-[60] h-1 origin-left bg-gradient-to-r from-brand via-accent to-brand" style={{ scaleX }} />;
}

/** Reveals a line of text word by word. Screen readers get the plain sentence. */
/** `whenVisible` waits until the text scrolls into view instead of animating on page load. */
export function SplitWords({ text, className = "", delay = 0, whenVisible = false }: { text: string; className?: string; delay?: number; whenVisible?: boolean }) {
  const calm = useCalm();
  const words = text.split(" ");
  return (
    <span className={className}>
      <span className="sr-only">{text}</span>
      <span aria-hidden>
        {words.map((w, i) => (
          <Fragment key={i}>
            <span className="inline-block overflow-hidden pb-[0.08em] align-bottom">
              <motion.span
                className="inline-block"
                initial={calm ? false : { y: "110%", rotate: 4, opacity: 0 }}
                {...(whenVisible
                  ? { whileInView: { y: "0%", rotate: 0, opacity: 1 }, viewport: { once: true, margin: "-60px" } }
                  : { animate: { y: "0%", rotate: 0, opacity: 1 } })}
                transition={{ duration: 0.7, delay: delay + i * 0.08, ease: [0.2, 0.7, 0.2, 1] }}
              >
                {w}
              </motion.span>
            </span>
            {/* The space sits outside the inline-block so it isn't collapsed. */}
            {i < words.length - 1 ? " " : null}
          </Fragment>
        ))}
      </span>
    </span>
  );
}

/** A soft glow that follows the pointer inside its parent (pointer devices only). */
export function Spotlight({ className = "" }: { className?: string }) {
  const calm = useCalm();
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(-999);
  const y = useMotionValue(-999);
  const sx = useSpring(x, { stiffness: 140, damping: 22 });
  const sy = useSpring(y, { stiffness: 140, damping: 22 });
  const bg = useTransform([sx, sy], ([a, b]) => `radial-gradient(420px circle at ${a}px ${b}px, rgb(var(--brand) / .18), transparent 70%)`);
  useEffect(() => {
    const parent = ref.current?.parentElement;
    if (!parent || calm || !window.matchMedia("(pointer: fine)").matches) return;
    const move = (e: PointerEvent) => {
      const r = parent.getBoundingClientRect();
      x.set(e.clientX - r.left);
      y.set(e.clientY - r.top);
    };
    parent.addEventListener("pointermove", move);
    return () => parent.removeEventListener("pointermove", move);
  }, [calm, x, y]);
  if (calm) return null;
  return <motion.div ref={ref} aria-hidden className={`lite-hide pointer-events-none absolute inset-0 -z-10 ${className}`} style={{ background: bg }} />;
}

/** Python snippets drifting slowly behind the hero. Pure decoration. */
const SNIPPETS = ["print('hi')", "for i in range(3):", "if score >= 90:", "def greet(name):", "total += n", "return total", "[x * 2 for x in nums]", "while True:", "name = 'Ana'", "len(words)"];
export function FloatingCode() {
  const calm = useCalm();
  if (calm) return null;
  return (
    <div aria-hidden className="lite-hide pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      {SNIPPETS.map((s, i) => (
        <span
          key={s}
          className="float-code absolute whitespace-nowrap rounded-lg border border-brand/10 px-2 py-1 font-mono text-[11px] text-brand/40"
          style={{ left: `${(i * 37) % 92}%`, top: `${8 + ((i * 53) % 80)}%`, animationDelay: `${-i * 2.3}s`, animationDuration: `${14 + (i % 4) * 3}s` }}
        >
          {s}
        </span>
      ))}
    </div>
  );
}

/** Child drifts a few pixels toward the cursor; springs back on leave. */
export function Magnetic({ children, strength = 0.25 }: { children: React.ReactNode; strength?: number }) {
  const calm = useCalm();
  const ref = useRef<HTMLDivElement>(null);
  const x = useSpring(0, { stiffness: 200, damping: 15 });
  const y = useSpring(0, { stiffness: 200, damping: 15 });
  return (
    <motion.div
      ref={ref}
      className="inline-block"
      style={{ x, y }}
      onPointerMove={(e) => {
        if (calm || e.pointerType !== "mouse" || !ref.current) return;
        const r = ref.current.getBoundingClientRect();
        x.set((e.clientX - (r.left + r.width / 2)) * strength);
        y.set((e.clientY - (r.top + r.height / 2)) * strength);
      }}
      onPointerLeave={() => {
        x.set(0);
        y.set(0);
      }}
    >
      {children}
    </motion.div>
  );
}

/** Card that tilts in 3D toward the cursor and shows a moving sheen. */
export function TiltCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const calm = useCalm();
  const rx = useSpring(0, { stiffness: 180, damping: 18 });
  const ry = useSpring(0, { stiffness: 180, damping: 18 });
  const [glare, setGlare] = useState({ x: 50, y: 50, o: 0 });
  return (
    <motion.div
      className={`relative [transform-style:preserve-3d] ${className}`}
      style={{ rotateX: rx, rotateY: ry, transformPerspective: 900 }}
      onPointerMove={(e) => {
        if (calm || e.pointerType !== "mouse") return;
        const r = e.currentTarget.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width;
        const py = (e.clientY - r.top) / r.height;
        ry.set((px - 0.5) * 12);
        rx.set(-(py - 0.5) * 12);
        setGlare({ x: px * 100, y: py * 100, o: 1 });
      }}
      onPointerLeave={() => {
        rx.set(0);
        ry.set(0);
        setGlare((g) => ({ ...g, o: 0 }));
      }}
    >
      {children}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-2xl transition-opacity duration-300"
        style={{ opacity: glare.o, background: `radial-gradient(260px circle at ${glare.x}% ${glare.y}%, rgb(255 255 255 / .14), transparent 60%)` }}
      />
    </motion.div>
  );
}

/** Number that counts up when it scrolls into view. Server-rendered value is the real number. */
export function Counter({ value, decimals = 0, prefix = "", suffix = "" }: { value: number; decimals?: number; prefix?: string; suffix?: string }) {
  const calm = useCalm();
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-20px" });
  const [shown, setShown] = useState(value);
  useEffect(() => {
    if (!inView || calm) return;
    const c = animate(0, value, { duration: 1.2, ease: [0.2, 0.7, 0.2, 1], onUpdate: setShown });
    return () => c.stop();
  }, [inView, calm, value]);
  return (
    <span ref={ref}>
      {prefix}
      {shown.toFixed(decimals)}
      {suffix}
    </span>
  );
}

/** Horizontal bar that grows to its width when visible. */
export function GrowBar({ pct, className = "", delay = 0 }: { pct: number; className?: string; delay?: number }) {
  const calm = useCalm();
  return (
    <motion.div
      className={`h-full ${className}`}
      initial={calm ? false : { width: 0 }}
      whileInView={{ width: `${pct}%` }}
      viewport={{ once: true }}
      style={calm ? { width: `${pct}%` } : undefined}
      transition={{ duration: 1, delay, ease: [0.2, 0.7, 0.2, 1] }}
    />
  );
}

/** A line that draws itself as the section scrolls through the viewport. */
export function ScrollLine({ className = "" }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 85%", "end 45%"] });
  const scaleX = useSpring(scrollYProgress, { stiffness: 90, damping: 22 });
  return (
    <div ref={ref} aria-hidden className={`relative h-1 overflow-hidden rounded-full bg-line ${className}`}>
      <motion.div className="absolute inset-0 origin-left rounded-full bg-gradient-to-r from-brand to-accent" style={{ scaleX }} />
    </div>
  );
}
