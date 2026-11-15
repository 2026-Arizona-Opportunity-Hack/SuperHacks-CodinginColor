"use client";
import { motion, useReducedMotion } from "framer-motion";

/** Animated globe for the landing page. Every number comes from the database; nothing is invented. */
export function ImpactGlobe({ stats, schools, languages }: { stats: { label: string; value: number }[]; schools: string[]; languages: string[] }) {
  const reduce = useReducedMotion();
  const meridians = [0, 1, 2, 3, 4, 5];
  return (
    <div className="grid items-center gap-10 lg:grid-cols-[1fr_1.1fr]">
      <div className="relative mx-auto aspect-square w-full max-w-[380px]" aria-hidden>
        <svg viewBox="-110 -110 220 220" className="h-full w-full">
          <defs>
            <radialGradient id="globe" cx="35%" cy="30%" r="80%">
              <stop offset="0" stopColor="rgb(var(--brand) / .35)" />
              <stop offset="1" stopColor="rgb(var(--brand) / .08)" />
            </radialGradient>
          </defs>
          <circle r="100" fill="url(#globe)" stroke="rgb(var(--brand) / .35)" strokeWidth="1" />
          {[-60, -30, 0, 30, 60].map((lat) => {
            const y = 100 * Math.sin((lat * Math.PI) / 180);
            const rx = 100 * Math.cos((lat * Math.PI) / 180);
            return <ellipse key={lat} cx="0" cy={y} rx={rx} ry={rx * 0.18} fill="none" stroke="rgb(var(--brand) / .25)" strokeWidth=".8" />;
          })}
          {meridians.map((i) => (
            <motion.ellipse
              key={i}
              cx="0"
              cy="0"
              ry="100"
              fill="none"
              stroke="rgb(var(--brand) / .3)"
              strokeWidth=".8"
              initial={{ rx: Math.abs(Math.cos((i / meridians.length) * Math.PI)) * 100 }}
              animate={reduce ? undefined : { rx: [0, 100, 0] }}
              transition={{ duration: 12, repeat: Infinity, ease: "linear", delay: -(i * 12) / meridians.length }}
            />
          ))}
          {/* Phoenix, AZ (roughly where it sits on this projection) */}
          <g transform="translate(-48,-24)">
            <motion.circle r="12" fill="rgb(var(--accent) / .25)" animate={reduce ? undefined : { r: [6, 16, 6], opacity: [0.8, 0, 0.8] }} transition={{ duration: 2.4, repeat: Infinity }} />
            <circle r="4.5" fill="rgb(var(--accent))" stroke="white" strokeWidth="1.5" />
          </g>
        </svg>
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
