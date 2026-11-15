"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import confetti from "canvas-confetti";
import { ArrowLeft, Check, Hand, Lock } from "lucide-react";
import { useT } from "@/i18n/client";
import { raiseHand } from "@/app/actions/student";
import { queueSubmission } from "@/lib/client/offline";
import { QuizView } from "./QuizView";
import { VideoView, SlidesView } from "./ContentViews";
import { WorksheetView } from "./WorksheetView";
import { CodeView } from "./CodeView";

export type PlayerActivity = {
  id: string;
  kind: string;
  title: string;
  lesson: string;
  concept: string;
  content: any;
  completed: boolean;
  open: boolean;
  score: number | null;
  answer: any;
};

export type SubmitResponse = {
  completed: boolean;
  score: number | null;
  result?: any;
  xpGained?: number;
  nextActivityId: string | null;
  moduleComplete: boolean;
  gain: number | null;
  alreadyDone?: boolean;
  /** Saved offline; will be sent (and graded) when the device reconnects. */
  queued?: boolean;
  error?: string;
};

export function Player({
  module,
  activities: initial,
  startId,
  nextModuleId,
  studentId,
}: {
  module: { id: string; title: string; position: number };
  activities: PlayerActivity[];
  startId: string;
  nextModuleId: string | null;
  /** Owner of any work queued offline, so a shared device never sends it as someone else. */
  studentId: string;
}) {
  const t = useT();
  const router = useRouter();
  const [acts, setActs] = useState(initial);
  const [currentId, setCurrentId] = useState(startId);
  const [done, setDone] = useState<{ gain: number | null } | null>(null);
  const [xpToast, setXpToast] = useState(0);
  const [hand, setHand] = useState(false);
  const shownAt = useRef(Date.now());
  const idx = acts.findIndex((a) => a.id === currentId);
  const current = acts[idx];

  useEffect(() => {
    shownAt.current = Date.now();
    if (current && !current.completed) {
      fetch(`/api/activity/${current.id}/start`, { method: "POST" }).catch(() => {});
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [currentId]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = useCallback(
    async (payload: Record<string, unknown>): Promise<SubmitResponse> => {
      const seconds = Math.round((Date.now() - shownAt.current) / 1000);
      shownAt.current = Date.now();
      let res: Response;
      try {
        res = await fetch(`/api/activity/${current.id}/submit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, seconds }),
        });
      } catch {
        // Offline: keep the work in the outbox (sent automatically when back online) and let the
        // student carry on. The server re-checks order and grades quizzes when it arrives.
        queueSubmission(current.id, { ...payload, seconds }, studentId);
        const idx = acts.findIndex((a) => a.id === current.id);
        setActs((list) => {
          let open = true;
          return list.map((a) => {
            const done = a.id === current.id ? true : a.completed;
            const r = { ...a, completed: done, open };
            if (!done) open = false;
            return r;
          });
        });
        return { completed: true, queued: true, score: null, nextActivityId: acts[idx + 1]?.id ?? null, moduleComplete: false, gain: null };
      }
      const data = (await res.json().catch(() => ({ error: "Something went wrong. Please try again." }))) as SubmitResponse;
      if (!res.ok) return { ...data, completed: false } as SubmitResponse;
      if (data.completed || data.alreadyDone) {
        setActs((list) => {
          const next = list.map((a) => (a.id === current.id ? { ...a, completed: true, score: data.score ?? a.score } : a));
          // re-open the following activity
          let open = true;
          return next.map((a) => {
            const r = { ...a, open };
            if (!a.completed) open = false;
            return r;
          });
        });
        if (data.xpGained) {
          setXpToast(data.xpGained);
          setTimeout(() => setXpToast(0), 1800);
        }
        if (data.moduleComplete) {
          setDone({ gain: data.gain });
          const reduce = document.documentElement.dataset.motion === "reduce" || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
          if (!reduce) confetti({ particleCount: 160, spread: 80, origin: { y: 0.6 } });
          router.refresh();
        }
      }
      return data;
    },
    [current, router, acts]
  );

  const goNext = () => {
    const next = acts[idx + 1];
    if (next) setCurrentId(next.id);
  };

  const lessons = acts.reduce<{ title: string; items: PlayerActivity[] }[]>((acc, a) => {
    const last = acc[acc.length - 1];
    if (last && last.title === a.lesson) last.items.push(a);
    else acc.push({ title: a.lesson, items: [a] });
    return acc;
  }, []);

  // A plain function (not a component defined in render) so views keep their state across re-renders.
  const renderView = () => {
    const common = { activity: current, submit, onContinue: goNext, isLast: idx === acts.length - 1 };
    switch (current.kind) {
      case "pretest":
      case "posttest":
      case "check":
      case "exit":
        return <QuizView key={current.id} {...common} />;
      case "video":
        return <VideoView key={current.id} {...common} />;
      case "slides":
        return <SlidesView key={current.id} {...common} />;
      case "worksheet":
        return <WorksheetView key={current.id} {...common} />;
      case "code":
        return <CodeView key={current.id} {...common} />;
      default:
        return null;
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
      <aside className="lg:sticky lg:top-20 lg:self-start">
        <Link href="/learn" className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
          <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden /> {t("player.backToJourney")}
        </Link>
        <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-muted">
          {t("common.module")} {module.position}
        </p>
        <h1 className="font-display text-xl font-extrabold">{module.title}</h1>
        <nav aria-label="Module steps" className="mt-4 space-y-4">
          {lessons.map((l) => (
            <div key={l.title}>
              <p className="mb-1 text-xs font-semibold text-muted">{l.title}</p>
              <ol className="space-y-1">
                {l.items.map((a) => {
                  const active = a.id === currentId;
                  return (
                    <li key={a.id}>
                      <button
                        type="button"
                        disabled={!a.open}
                        onClick={() => setCurrentId(a.id)}
                        aria-current={active ? "step" : undefined}
                        className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-start text-sm transition ${
                          active ? "bg-brand text-brand-ink" : a.open ? "hover:bg-raised" : "cursor-not-allowed text-muted"
                        }`}
                      >
                        <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] ${a.completed ? "bg-good text-white" : active ? "bg-brand-ink/20" : "bg-raised"}`}>
                          {a.completed ? <Check className="h-3 w-3" aria-hidden /> : !a.open ? <Lock className="h-3 w-3" aria-hidden /> : null}
                        </span>
                        <span className="truncate">{a.title}</span>
                        <span className="sr-only">{a.completed ? `, ${t("learn.completed")}` : !a.open ? `, ${t("learn.locked")}` : ""}</span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            </div>
          ))}
        </nav>
        <button
          type="button"
          className={`btn-ghost mt-5 w-full ${hand ? "!border-warn !text-warn" : ""}`}
          onClick={async () => {
            await raiseHand(current.id);
            setHand(true);
          }}
          aria-live="polite"
        >
          <Hand className="h-4 w-4" aria-hidden /> {hand ? t("learn.handRaised") : t("learn.raiseHand")}
        </button>
      </aside>

      <section aria-labelledby="activity-title" className="min-w-0">
        <p className="text-sm text-muted">{t("player.step", { i: idx + 1, n: acts.length })}</p>
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-raised">
          <motion.div className="h-full bg-gradient-to-r from-brand to-accent" animate={{ width: `${(100 * acts.filter((a) => a.completed).length) / acts.length}%` }} />
        </div>
        <AnimatePresence mode="wait">
          <motion.div key={current.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.25 }} className="mt-4">
            <h2 id="activity-title" className="h-display text-2xl sm:text-3xl">
              {current.title}
            </h2>
            <div className="mt-5">{current.open ? renderView() : <p className="text-muted">{t("player.lockedActivity")}</p>}</div>
          </motion.div>
        </AnimatePresence>
      </section>

      <AnimatePresence>
        {xpToast > 0 && (
          <motion.div
            role="status"
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed bottom-24 end-6 z-50 rounded-full bg-brand px-5 py-3 font-bold text-brand-ink shadow-card"
          >
            +{xpToast} XP ⚡
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {done && (
          <motion.div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div role="dialog" aria-modal="true" aria-labelledby="done-title" className="card max-w-md p-8 text-center" initial={{ scale: 0.85, y: 20 }} animate={{ scale: 1, y: 0 }}>
              <p className="text-5xl" aria-hidden>
                🎉
              </p>
              <h2 id="done-title" className="h-display mt-3 text-3xl">
                {t("player.moduleDone")}
              </h2>
              <p className="mt-2 text-muted">{t("player.moduleDoneBody", { gain: done.gain != null ? (done.gain >= 0 ? `+${done.gain}` : done.gain) : "—" })}</p>
              <div className="mt-6 flex flex-col gap-2">
                {nextModuleId && (
                  <Link href={`/learn/m/${nextModuleId}`} className="btn-primary">
                    {t("learn.continue")} →
                  </Link>
                )}
                <Link href="/learn" className="btn-ghost" autoFocus>
                  {t("player.backToJourney")}
                </Link>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
