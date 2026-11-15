"use client";
import { animate, motion, useInView, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Lightbulb, XCircle } from "lucide-react";

export function Reveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.55, delay, ease: [0.2, 0.7, 0.2, 1] }}
    >
      {children}
    </motion.div>
  );
}

export function CountUp({ to }: { to: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const [v, setV] = useState(to); // server/no-JS render shows the real number
  useEffect(() => {
    if (!inView) return;
    const c = animate(0, to, { duration: 1.4, ease: "easeOut", onUpdate: (x) => setV(Math.round(x)) });
    return () => c.stop();
  }, [inView, to]);
  return <span ref={ref}>{v}</span>;
}

/** The hero animation: a student's code fails, asks for a hint, fixes it, passes, module unlocks. */
const FRAMES = [
  { code: ["total = 0", "for n in [5, 10, 15]:", "    total = 0", "    total = total + n"], state: "fail" },
  { code: ["total = 0", "for n in [5, 10, 15]:", "    total = 0", "    total = total + n"], state: "hint" },
  { code: ["total = 0", "for n in [5, 10, 15]:", "    total = total + n", "print(total)  # 30"], state: "pass" },
] as const;

export function HeroCode({ students }: { students: number }) {
  const reduce = useReducedMotion();
  const [i, setI] = useState(reduce ? 2 : 0);
  useEffect(() => {
    if (reduce) return;
    const id = setInterval(() => setI((x) => (x + 1) % FRAMES.length), 2600);
    return () => clearInterval(id);
  }, [reduce]);
  const f = FRAMES[i];
  return (
    <div className="relative" aria-label="Animated example: a student fixes a loop with a hint" role="img">
      <motion.div
        className="card overflow-hidden"
        initial={reduce ? false : { opacity: 0, rotate: -2, y: 30 }}
        animate={{ opacity: 1, rotate: 0, y: 0 }}
        transition={{ duration: 0.8, ease: [0.2, 0.7, 0.2, 1] }}
      >
        <div className="flex items-center gap-1.5 border-b border-line bg-raised px-4 py-2.5">
          <span className="h-3 w-3 rounded-full bg-bad/70" />
          <span className="h-3 w-3 rounded-full bg-warn/70" />
          <span className="h-3 w-3 rounded-full bg-good/70" />
          <span className="ms-3 font-mono text-xs text-muted">loops.py · Module 3</span>
        </div>
        <pre className="min-h-[150px] p-5 font-mono text-sm leading-7" dir="ltr">
          {f.code.map((line, n) => (
            <motion.div
              key={line + n}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: n * 0.05 }}
              className={f.state !== "pass" && n === 2 ? "rounded bg-bad/10" : ""}
            >
              <span className="me-4 select-none text-muted/60">{n + 1}</span>
              {line}
            </motion.div>
          ))}
        </pre>
        <div className="border-t border-line p-4">
          {f.state === "fail" && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 text-sm font-semibold text-bad">
              <XCircle className="h-4 w-4" /> total_of([5, 10, 15]) should be 30
            </motion.p>
          )}
          {f.state === "hint" && (
            <motion.p initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex items-start gap-2 text-sm">
              <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
              <span>
                <b>Hint:</b> What happens to <code className="font-mono">total</code> at the start of every trip around the loop?
              </span>
            </motion.p>
          )}
          {f.state === "pass" && (
            <motion.p initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex items-center gap-2 text-sm font-semibold text-good">
              <CheckCircle2 className="h-4 w-4" /> All tests passed · Module 4 unlocked 🎉
            </motion.p>
          )}
        </div>
      </motion.div>
      <motion.div
        className="card absolute -bottom-16 end-4 hidden px-4 py-3 sm:block"
        initial={reduce ? false : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <p className="text-xs text-muted">Teacher dashboard</p>
        <p className="text-sm font-bold">
          🔴 Reteach <span className="text-brand">loops</span> tomorrow · {students} students tracked
        </p>
      </motion.div>
    </div>
  );
}
