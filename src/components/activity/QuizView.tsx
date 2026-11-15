"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { useT } from "@/i18n/client";
import { Markdown } from "../Markdown";
import type { ViewProps } from "./types";

type Graded = { score: number; perQuestion: { id: string; correct: boolean; explanation: string; answer: number }[] };

export function QuizView({ activity, submit, onContinue, isLast }: ViewProps) {
  const t = useT();
  const { intro, questions } = activity.content as { intro: string; questions: { id: string; prompt: string; choices: string[] }[] };
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [graded, setGraded] = useState<Graded | null>(null);
  const [score, setScore] = useState<number | null>(activity.completed ? activity.score : null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const isAssessment = activity.kind === "pretest" || activity.kind === "posttest";
  const showResult = graded || (activity.completed && isAssessment);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (questions.some((q) => answers[q.id] === undefined)) {
      setError(t("player.answerRequired"));
      return;
    }
    setBusy(true);
    setError("");
    const r = await submit({ answers });
    setBusy(false);
    if (r.error) return setError(r.error);
    setScore(r.score);
    if (r.result) setGraded(r.result);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {intro && <p className="text-muted">{intro}</p>}
      {questions.map((q, qi) => {
        // Pre/post tests share questions, so they never reveal which answers were right.
        const g = isAssessment ? undefined : graded?.perQuestion?.find((p) => p.id === q.id);
        return (
          <fieldset key={q.id} className="card p-5" disabled={!!showResult}>
            <legend className="sr-only">Question {qi + 1}</legend>
            <div className="font-semibold">
              <span className="me-2 text-muted">{qi + 1}.</span>
              <Markdown text={q.prompt} />
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {q.choices.map((c, ci) => {
                const chosen = answers[q.id] === ci;
                const isRight = g && g.answer === ci;
                const isWrongPick = g && chosen && !g.correct;
                return (
                  <label
                    key={ci}
                    className={`flex min-h-[48px] cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 text-sm transition ${
                      isRight ? "border-good bg-good/10" : isWrongPick ? "border-bad bg-bad/10" : chosen ? "border-brand bg-brand/10" : "border-line hover:bg-raised"
                    }`}
                  >
                    <input type="radio" name={q.id} className="h-4 w-4 accent-[rgb(var(--brand))]" checked={chosen} onChange={() => setAnswers((a) => ({ ...a, [q.id]: ci }))} />
                    <span dir="auto" className="font-mono">
                      {c}
                    </span>
                  </label>
                );
              })}
            </div>
            {g && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`mt-3 flex items-start gap-2 text-sm ${g.correct ? "text-good" : "text-bad"}`}>
                {g.correct ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> : <XCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />}
                <span>
                  <b>{g.correct ? t("player.correct") : t("player.incorrect")}</b> {!isAssessment && g.explanation}
                </span>
              </motion.p>
            )}
          </fieldset>
        );
      })}
      {error && (
        <p role="alert" className="text-sm font-medium text-bad">
          {error}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-3" aria-live="polite">
        {!showResult ? (
          <button className="btn-primary" disabled={busy}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />} {t("player.submit")}
          </button>
        ) : (
          <>
            {score != null && <p className="font-bold">{t("player.score", { score: Math.round(score) })}</p>}
            {!isAssessment && graded && graded.score < 100 && (
              <button type="button" className="btn-ghost" onClick={() => (setGraded(null), setAnswers({}))}>
                {t("player.tryAgain")}
              </button>
            )}
            {!isLast && (
              <button type="button" className="btn-primary" onClick={onContinue}>
                {t("player.next")} →
              </button>
            )}
          </>
        )}
      </div>
    </form>
  );
}
