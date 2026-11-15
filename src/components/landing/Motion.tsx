"use client";
import { animate, motion, useInView } from "framer-motion";
import { useCalm } from "@/components/motion/MotionProvider";
import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Lightbulb, XCircle } from "lucide-react";

export function Reveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const reduce = useCalm();
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

/**
 * Code demo: four tracks, one per Python Foundations module. Each plays a real beginner bug:
 * the code fails, a Socratic hint asks a question, the student fixes it, tests pass, the next
 * module unlocks, and the teacher dashboard updates. Tabs jump between tracks.
 */
type Track = { file: string; module: number; concept: string; bug: string[]; fixed: string[]; badLine: number; fail: string; hint: React.ReactNode };
const TRACKS: Track[] = [
  {
    file: "variables.py",
    module: 1,
    concept: "variables",
    bug: ['age = "15"', "next_year = age + 1", "print(next_year)"],
    fixed: ["age = 15", "next_year = age + 1", "print(next_year)  # 16"],
    badLine: 0,
    fail: 'TypeError: can only concatenate str (not "int") to str',
    hint: <>Is <code className="font-mono">&quot;15&quot;</code> a number or text? What changes if you drop the quotes?</>,
  },
  {
    file: "decisions.py",
    module: 2,
    concept: "conditions",
    bug: ["def grade(score):", "    if score > 90:", '        return "A"', '    return "B"'],
    fixed: ["def grade(score):", "    if score >= 90:", '        return "A"', '    return "B"'],
    badLine: 1,
    fail: "grade(90) should be \"A\"",
    hint: <>Is 90 <i>greater than</i> 90? Which comparison includes the number itself?</>,
  },
  {
    file: "loops.py",
    module: 3,
    concept: "loops",
    bug: ["total = 0", "for n in [5, 10, 15]:", "    total = 0", "    total = total + n"],
    fixed: ["total = 0", "for n in [5, 10, 15]:", "    total = total + n", "print(total)  # 30"],
    badLine: 2,
    fail: "total_of([5, 10, 15]) should be 30",
    hint: <>What happens to <code className="font-mono">total</code> at the start of every trip around the loop?</>,
  },
  {
    file: "functions.py",
    module: 4,
    concept: "functions",
    bug: ["def double(n):", "    print(n * 2)", "", "result = double(4)"],
    fixed: ["def double(n):", "    return n * 2", "", "result = double(4)  # 8"],
    badLine: 1,
    fail: "double(4) should be 8, got None",
    hint: <>Your function shows the answer, but what does it <i>give back</i> to the line that called it?</>,
  },
];
const STEPS = ["fail", "hint", "pass"] as const;

/** Two editors side by side; each lane cycles its own files through fail → hint → pass. */
const LANES = [
  [0, 2], // variables.py → loops.py
  [1, 3], // decisions.py → functions.py
] as const;

function useLane(files: readonly number[], offset: number, reduce: boolean) {
  const [pos, setPos] = useState({ f: 0, step: reduce ? 2 : offset });
  useEffect(() => {
    if (reduce) return;
    const id = setInterval(() => setPos(({ f, step }) => (step < 2 ? { f, step: step + 1 } : { f: (f + 1) % files.length, step: 0 })), 2600);
    return () => clearInterval(id);
  }, [reduce, files.length]);
  return { track: TRACKS[files[pos.f]], step: pos.step };
}

function Editor({ track, step, reduce, delay }: { track: Track; step: number; reduce: boolean; delay: number }) {
  const state = STEPS[step];
  const code = state === "pass" ? track.fixed : track.bug;
  return (
    <motion.div
      className="card flex flex-col overflow-hidden"
      initial={reduce ? false : { opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.7, delay, ease: [0.2, 0.7, 0.2, 1] }}
    >
      <div className="flex items-center gap-1.5 border-b border-line bg-raised px-4 py-2.5">
        <span className="h-3 w-3 rounded-full bg-bad/70" />
        <span className="h-3 w-3 rounded-full bg-warn/70" />
        <span className="h-3 w-3 rounded-full bg-good/70" />
        <span className="ms-3 font-mono text-xs text-muted">
          {track.file} · Module {track.module}
        </span>
        <span className="ms-auto flex gap-1" aria-hidden>
          {STEPS.map((st, i) => (
            <span key={st} className={`h-1.5 w-5 rounded-full transition-colors ${i <= step ? (st === "fail" ? "bg-bad/70" : st === "hint" ? "bg-accent" : "bg-good") : "bg-line"}`} />
          ))}
        </span>
      </div>
      <pre className="min-h-[150px] flex-1 overflow-x-auto p-4 font-mono text-[13px] leading-7" dir="ltr">
        {code.map((line, n) => (
          <motion.div
            key={`${track.file}-${state === "pass"}-${n}`}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: n * 0.05 }}
            className={state !== "pass" && n === track.badLine ? "rounded bg-bad/10" : state === "pass" && n === track.badLine ? "rounded bg-good/10" : ""}
          >
            <span className="me-3 select-none text-muted/60">{n + 1}</span>
            {line || " "}
          </motion.div>
        ))}
      </pre>
      <div className="min-h-[64px] border-t border-line p-4">
        {state === "fail" && (
          <motion.p key={`f-${track.file}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-start gap-2 text-sm font-semibold text-bad">
            <XCircle className="mt-0.5 h-4 w-4 shrink-0" /> {track.fail}
          </motion.p>
        )}
        {state === "hint" && (
          <motion.p key={`h-${track.file}`} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex items-start gap-2 text-sm">
            <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
            <span>
              <b>Hint:</b> {track.hint}
            </span>
          </motion.p>
        )}
        {state === "pass" && (
          <motion.p key={`p-${track.file}`} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex items-center gap-2 text-sm font-semibold text-good">
            <CheckCircle2 className="h-4 w-4 shrink-0" /> All tests passed · {track.module < 4 ? `Module ${track.module + 1} unlocked 🎉` : "Course complete 🎓"}
          </motion.p>
        )}
      </div>
    </motion.div>
  );
}

export function HeroCode({ students }: { students: number }) {
  const reduce = useCalm();
  const left = useLane(LANES[0], 0, reduce);
  const right = useLane(LANES[1], 1, reduce); // one step behind, so the two editors aren't in lockstep
  const lanes = [left, right];
  // Modules done: every module whose file has passed in either editor, plus everything before it.
  const furthest = Math.max(...lanes.map((l) => l.track.module - 1 + (STEPS[l.step] === "pass" ? 1 : 0)));
  const current = Math.min(furthest + 1, 4);

  return (
    <div className="relative" aria-label="Animated example: students fix beginner Python bugs with hints while the teacher dashboard updates" role="img">
      <div className="grid gap-4 md:grid-cols-2">
        <Editor track={left.track} step={left.step} reduce={reduce} delay={0} />
        <Editor track={right.track} step={right.step} reduce={reduce} delay={0.12} />
      </div>

      {/* the two interfaces: what the student and the teacher each see */}
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="card px-4 py-3">
          <p className="text-xs text-muted">Student path</p>
          <div className="mt-2 flex items-center gap-1.5" aria-hidden>
            {[1, 2, 3, 4].map((m) => (
              <span key={m} className={`grid h-7 flex-1 place-items-center rounded-lg text-xs font-bold transition-colors ${m <= furthest ? "bg-good/20 text-good" : m === current ? "bg-brand text-white" : "bg-line/60 text-muted"}`}>
                {m <= furthest ? "✓" : `M${m}`}
              </span>
            ))}
          </div>
        </div>
        <div className="card px-4 py-3">
          <p className="text-xs text-muted">Teacher dashboard · {students} students tracked</p>
          <ul className="mt-1 space-y-0.5 text-sm font-bold">
            {lanes.map((l) => (
              <li key={l.track.file}>
                {STEPS[l.step] === "pass" ? "🟢 Back on track:" : "🔴 Reteach"} <span className="text-brand">{l.track.concept}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
