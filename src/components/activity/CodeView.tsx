"use client";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Circle, Lightbulb, Loader2, Play, RotateCcw, Share2, ShieldCheck, Volume2, XCircle } from "lucide-react";
import { useT } from "@/i18n/client";
import { Markdown } from "../Markdown";
import { CodeEditor } from "../CodeEditor";
import { VoiceButton, speak } from "../Voice";
import { PairPanel } from "./PairPanel";
import { preloadPython, runPython, type RunResult } from "@/lib/client/python";
import type { ViewProps } from "./types";

type Content = { prompt: string; starter: string; tests: { name: string; code: string }[] };

export function CodeView({ activity, submit, onContinue, isLast }: ViewProps) {
  const t = useT();
  const content = activity.content as Content;
  const draftKey = `cic_code_${activity.id}`;
  const [code, setCode] = useState<string>(activity.answer?.code ?? content.starter);
  const [result, setResult] = useState<RunResult | null>(null);
  const [running, setRunning] = useState<"run" | "check" | null>(null);
  const [passed, setPassed] = useState(activity.completed);
  const [hint, setHint] = useState("");
  const [hintBusy, setHintBusy] = useState(false);
  const [question, setQuestion] = useState("");
  const [copied, setCopied] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    preloadPython();
    try {
      const d = localStorage.getItem(draftKey);
      if (d && !activity.completed) setCode(d);
    } catch {}
  }, [draftKey, activity.completed]);

  const onChange = (v: string) => {
    setCode(v);
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      try {
        localStorage.setItem(draftKey, v);
      } catch {}
    }, 400);
  };

  async function run(withTests: boolean) {
    setRunning(withTests ? "check" : "run");
    const r = await runPython(code, withTests ? content.tests : []);
    setResult(r);
    setRunning(null);
    if (!withTests) return;
    const failed = r.tests.find((x) => !x.passed);
    const allPassed = !r.error && !r.timedOut && r.tests.length > 0 && !failed;
    const res = await submit({ code, passed: allPassed, failedTest: failed?.name, error: r.error ?? (r.timedOut ? "timeout" : undefined) });
    if (allPassed && res.completed) setPassed(true);
  }

  async function getHint() {
    setHintBusy(true);
    setHint("");
    const failed = result?.tests.find((x) => !x.passed);
    try {
      const res = await fetch("/api/hint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activityId: activity.id, code, failedTest: failed ? `${failed.name}: ${failed.message}` : undefined, error: result?.error ?? undefined, question: question || undefined }),
      });
      const data = await res.json();
      setHint(data.hint ?? data.error ?? t("common.error"));
    } catch {
      setHint(t("common.error"));
    }
    setHintBusy(false);
  }

  const shareLink = () => {
    const url = `${location.origin}/play#code=${encodeURIComponent(btoa(unescape(encodeURIComponent(code))))}`;
    navigator.clipboard?.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };

  return (
    <div className="space-y-4">
      <div className="card p-5 text-[17px]">
        <Markdown text={content.prompt} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-3">
          <CodeEditor value={code} onChange={onChange} label={activity.title} />
          <div className="flex flex-wrap gap-2">
            <button className="btn-ghost" onClick={() => run(false)} disabled={!!running}>
              {running === "run" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Play className="h-4 w-4" aria-hidden />} {t("code.run")}
            </button>
            <button className="btn-primary" onClick={() => run(true)} disabled={!!running}>
              {running === "check" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <ShieldCheck className="h-4 w-4" aria-hidden />} {t("code.check")}
            </button>
            <button className="btn-ghost" onClick={() => onChange(content.starter)} title={t("code.reset")} aria-label={t("code.reset")}>
              <RotateCcw className="h-4 w-4" aria-hidden />
            </button>
            <button className="btn-ghost" onClick={shareLink} aria-live="polite">
              <Share2 className="h-4 w-4" aria-hidden /> {copied ? t("code.copied") : t("code.share")}
            </button>
          </div>

          <div className="card overflow-hidden" aria-live="polite">
            <p className="border-b border-line bg-raised px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted">{t("code.output")}</p>
            <pre className="max-h-64 min-h-[80px] overflow-auto whitespace-pre-wrap p-4 font-mono text-sm" dir="ltr">
              {running ? <span className="text-muted">{t("code.running")}</span> : null}
              {!running && result?.stdout}
              {!running && result?.error && <span className="text-bad">{result.error}</span>}
              {!running && result?.timedOut && <span className="text-bad">{t("code.timeout")}</span>}
            </pre>
          </div>
        </div>

        <div className="space-y-4">
          <div className="card p-4">
            <h3 className="text-sm font-bold">{t("code.tests")}</h3>
            <ul className="mt-2 space-y-2">
              {content.tests.map((tc) => {
                const r = result?.tests.find((x) => x.name === tc.name);
                return (
                  <motion.li key={tc.name} layout className="flex items-start gap-2 text-sm">
                    {r ? r.passed ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-good" aria-label="passed" /> : <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-bad" aria-label="failed" /> : <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-label="not run" />}
                    <span>
                      {tc.name}
                      {r && !r.passed && <span className="block text-xs text-bad">{r.message}</span>}
                    </span>
                  </motion.li>
                );
              })}
            </ul>
            {passed && (
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="mt-4 rounded-xl bg-good/10 p-3 text-sm font-bold text-good">
                🎉 {t("code.allPassed")}
                {!isLast && (
                  <button className="btn-primary mt-3 w-full" onClick={onContinue}>
                    {t("player.next")} →
                  </button>
                )}
              </motion.div>
            )}
          </div>

          <div className="card border-accent/30 p-4">
            <h3 className="flex items-center gap-2 text-sm font-bold">
              <Lightbulb className="h-4 w-4 text-accent" aria-hidden /> {t("code.hint")}
            </h3>
            <p className="mt-1 text-xs text-muted">{t("code.hintNote")}</p>
            <label className="sr-only" htmlFor={`q-${activity.id}`}>
              {t("code.hintAsk")}
            </label>
            <div className="mt-3 flex gap-2">
              <input id={`q-${activity.id}`} className="input !min-h-[40px] text-sm" placeholder={t("code.hintAsk")} maxLength={500} value={question} onChange={(e) => setQuestion(e.target.value)} />
              <VoiceButton onText={(s) => setQuestion(s)} label={t("code.voice")} listeningLabel={t("code.listening")} />
            </div>
            <button className="btn-accent mt-2 w-full" onClick={getHint} disabled={hintBusy}>
              {hintBusy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Lightbulb className="h-4 w-4" aria-hidden />} {hintBusy ? t("code.hintThinking") : t("code.hint")}
            </button>
            {hint && (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-3 rounded-xl bg-accent/10 p-3 text-sm" role="status">
                <Markdown text={hint} />
                <button className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-accent" onClick={() => speak(hint, t.locale)}>
                  <Volume2 className="h-3.5 w-3.5" aria-hidden /> {t("code.listen")}
                </button>
              </motion.div>
            )}
          </div>

          <PairPanel activityId={activity.id} code={code} onRemoteCode={(c) => setCode(c)} />
        </div>
      </div>
    </div>
  );
}
