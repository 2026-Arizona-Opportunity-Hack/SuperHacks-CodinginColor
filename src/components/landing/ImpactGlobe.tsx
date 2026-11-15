"use client";
import { motion, useReducedMotion } from "framer-motion";
import { WorldGlobe } from "./WorldGlobe";

/** Animated globe for the landing page. Every number comes from the database; nothing is invented. */
export function ImpactGlobe({ stats, schools, languages }: { stats: { label: string; value: number }[]; schools: string[]; languages: string[] }) {
  const reduce = useReducedMotion();
  return (
    <div className="grid items-center gap-10 lg:grid-cols-[1fr_1.1fr]">
      <div className="relative mx-auto aspect-square w-full max-w-[420px]">
        <WorldGlobe label="Rotating world map with Phoenix, Arizona highlighted" />
        {languages.map((l, i) => (
          <motion.span
            key={l}
            className="chip absolute bg-surface text-ink shadow-card"
            style={{ top: `${18 + i * 26}%`, [i % 2 ? "left" : "right"]: "-4%" } as React.CSSProperties}
            animate={reduce ? undefined : { y: [0, -6, 0] }}
            transition={{ duration: 3 + i, repeat: Infinity, ease: "easeInOut" }}
          >
            {l}
          </motion.span>
        ))}
      </div>
      <div>
        <h2 className="h-display text-3xl">Built in Phoenix. Ready for any classroom.</h2>
        <p className="mt-3 text-muted">
          One link works on any Chromebook or phone, in {languages.length} languages, even on slow Wi-Fi. A partner teacher anywhere can sign up and run Coding in Color&apos;s
          curriculum with their own class, with no training on the slide decks.
        </p>
        <dl className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="card p-4">
              <dd className="text-2xl font-extrabold">{s.value}</dd>
              <dt className="text-xs text-muted">{s.label}</dt>
            </div>
          ))}
        </dl>
        {schools.length > 0 && (
          <p className="mt-4 text-sm text-muted">
            <span className="font-semibold text-ink">Classrooms today:</span> {schools.join(" · ")}
          </p>
        )}
      </div>
    </div>
  );
}
