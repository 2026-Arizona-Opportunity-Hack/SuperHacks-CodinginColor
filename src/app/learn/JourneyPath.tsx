"use client";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { Check, Clock, Lock, Play, SkipForward } from "lucide-react";
import type { JourneyModule } from "@/lib/progress";

type Labels = Record<"startHere" | "continue" | "review" | "locked" | "lockedHelp" | "notAssigned" | "notAssignedHelp" | "completed" | "testedOut" | "module", string>;

/** The module map: a winding path where finished modules glow and the next one pulses. */
export function JourneyPath({ modules, labels, currentId }: { modules: JourneyModule[]; labels: Labels; currentId?: string }) {
  const reduce = useReducedMotion();
  return (
    <ol className="relative mt-6 space-y-5">
      <span className="absolute bottom-6 start-[27px] top-6 w-1 rounded-full bg-line" aria-hidden />
      {modules.map((m, i) => {
        const open = m.state === "current" || m.state === "done" || m.state === "tested_out";
        const pct = m.total ? Math.round((100 * m.completed) / m.total) : 0;
        const isCurrent = m.id === currentId;
        const Icon = m.state === "done" ? Check : m.state === "tested_out" ? SkipForward : m.state === "locked" ? Lock : m.state === "not_assigned" ? Clock : Play;
        const status =
          m.state === "done" ? labels.completed : m.state === "tested_out" ? labels.testedOut : m.state === "locked" ? labels.locked : m.state === "not_assigned" ? labels.notAssigned : m.completed ? labels.continue : labels.startHere;
        const body = (
          <div className={`card flex items-center gap-4 p-4 transition ${open ? "hover:-translate-y-0.5 hover:border-brand/50" : "opacity-70"} ${isCurrent ? "border-brand ring-4 ring-brand/15" : ""}`}>
            <span
              className={`relative grid h-14 w-14 shrink-0 place-items-center rounded-2xl text-white ${
                m.state === "done" ? "bg-good" : m.state === "tested_out" ? "bg-good/70" : isCurrent ? "bg-brand" : "bg-muted/40"
              }`}
            >
              {isCurrent && !reduce && <span className="absolute inset-0 animate-ping rounded-2xl bg-brand/40" aria-hidden />}
              <Icon className="relative h-6 w-6" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                {labels.module} {m.position}
                {m.gain != null && <span className="ms-2 chip bg-good/15 text-good normal-case">+{m.gain} pts</span>}
              </p>
              <h3 className="truncate font-display text-lg font-bold">{m.title}</h3>
              <p className="truncate text-sm text-muted">{m.state === "locked" ? labels.lockedHelp : m.state === "not_assigned" ? labels.notAssignedHelp : m.summary}</p>
              {open && (
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-raised" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${m.title} progress`}>
                  <motion.div className="h-full rounded-full bg-gradient-to-r from-brand to-accent" initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, delay: i * 0.1 }} />
                </div>
              )}
            </div>
            <span className={`chip hidden shrink-0 sm:inline-flex ${isCurrent ? "bg-brand text-brand-ink" : "bg-raised text-muted"}`}>{status}</span>
          </div>
        );
        return (
          <motion.li key={m.id} className="relative" initial={reduce ? false : { opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.07 }}>
            {open ? (
              <Link href={`/learn/m/${m.id}`} className="block rounded-2xl" aria-label={`${labels.module} ${m.position}: ${m.title}, ${status}`}>
                {body}
              </Link>
            ) : (
              <div aria-label={`${labels.module} ${m.position}: ${m.title}, ${status}`}>{body}</div>
            )}
          </motion.li>
        );
      })}
    </ol>
  );
}
