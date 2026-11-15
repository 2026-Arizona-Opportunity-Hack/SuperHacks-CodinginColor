"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useT } from "@/i18n/client";
import { submitPlacement } from "@/app/actions/placement";

type Set = { moduleId: string; title: string; questions: { id: string; prompt: string; choices: string[] }[] };

export function CatchUp({ sets }: { sets: Set[] }) {
  const t = useT();
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<{ title: string; score: number; skipped: boolean }[] | null>(null);

  if (results)
    return (
      <div className="card mx-auto max-w-xl p-8 text-center">
        <p className="text-5xl" aria-hidden>
          🚀
        </p>
        <h1 className="h-display mt-3 text-2xl">{results.length ? `You skipped ${results.length} module${results.length > 1 ? "s" : ""}!` : "Let's start from the beginning"}</h1>
        <ul className="mt-4 space-y-1 text-start">
          {results.map((r) => (
            <li key={r.title} className="flex items-center gap-2 text-good">
              <CheckCircle2 className="h-4 w-4" aria-hidden /> {r.title} ({r.score}%)
            </li>
          ))}
        </ul>
        <Link href="/learn" className="btn-primary mt-6" onClick={() => router.refresh()}>
          {t("player.backToJourney")}
        </Link>
      </div>
    );

  return (
    <form
      className="mx-auto max-w-2xl space-y-6"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        const r = await submitPlacement(answers);
        setBusy(false);
        if (r.ok) setResults(r.results);
      }}
    >
      <div>
        <h1 className="h-display text-3xl">{t("learn.catchUpTitle")}</h1>
        <p className="mt-2 text-muted">Answer what you can. Skip anything you don't know: you'll learn it in the module.</p>
      </div>
      {sets.map((s) => (
        <section key={s.moduleId} className="space-y-3" aria-labelledby={`m-${s.moduleId}`}>
          <h2 id={`m-${s.moduleId}`} className="font-display text-lg font-bold">
            {s.title}
          </h2>
          {s.questions.map((q) => {
            const key = `${s.moduleId}:${q.id}`;
            return (
              <fieldset key={key} className="card p-5">
                <legend className="font-semibold">{q.prompt}</legend>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {q.choices.map((c, ci) => (
                    <label key={ci} className={`flex min-h-[48px] cursor-pointer items-center gap-3 rounded-xl border px-3 text-sm ${answers[key] === ci ? "border-brand bg-brand/10" : "border-line hover:bg-raised"}`}>
                      <input type="radio" name={key} className="h-4 w-4" checked={answers[key] === ci} onChange={() => setAnswers((a) => ({ ...a, [key]: ci }))} />
                      <span className="font-mono">{c}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            );
          })}
        </section>
      ))}
      <button className="btn-primary" disabled={busy}>
        {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />} {t("player.submit")}
      </button>
    </form>
  );
}
