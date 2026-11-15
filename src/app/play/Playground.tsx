"use client";
import { useEffect, useState } from "react";
import { Lightbulb, Loader2, Play, Share2, Volume2 } from "lucide-react";
import { useT } from "@/i18n/client";
import { CodeEditor } from "@/components/CodeEditor";
import { Markdown } from "@/components/Markdown";
import { VoiceButton, speak } from "@/components/Voice";
import { preloadPython, runPython, type RunResult } from "@/lib/client/python";

const STARTER = `# Welcome to the CIC playground: no account needed.
# Write any Python, press Run, and share your code with a link.

name = "Phoenix"
for i in range(3):
    print("Hello,", name, i + 1)
`;

const encode = (s: string) => btoa(unescape(encodeURIComponent(s)));
const decode = (s: string) => decodeURIComponent(escape(atob(s)));

export function Playground() {
  const t = useT();
  const [code, setCode] = useState(STARTER);
  const [result, setResult] = useState<RunResult | null>(null);
  const [running, setRunning] = useState(false);
  const [hint, setHint] = useState("");
  const [question, setQuestion] = useState("");
  const [hinting, setHinting] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    preloadPython();
    // Shared code lives in the URL fragment, which is never sent to the server.
    const m = location.hash.match(/code=([^&]+)/);
    if (m) {
      try {
        setCode(decode(decodeURIComponent(m[1])).slice(0, 20000));
        return;
      } catch {}
    }
    try {
      const d = localStorage.getItem("cic_play");
      if (d) setCode(d);
    } catch {}
  }, []);

  const change = (v: string) => {
    setCode(v);
    try {
      localStorage.setItem("cic_play", v);
    } catch {}
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="h-display text-3xl">Python playground</h1>
          <p className="text-muted">Free, no login, runs entirely in your browser. Hints ask questions; they never give the answer.</p>
        </div>
        <div className="flex gap-2">
          <button
            className="btn-ghost"
            onClick={() => {
              const url = `${location.origin}/play#code=${encodeURIComponent(encode(code))}`;
              navigator.clipboard?.writeText(url).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 1800);
              });
            }}
          >
            <Share2 className="h-4 w-4" aria-hidden /> {copied ? t("code.copied") : t("code.share")}
          </button>
          <button
            className="btn-primary"
            disabled={running}
            onClick={async () => {
              setRunning(true);
              setResult(await runPython(code));
              setRunning(false);
            }}
          >
            {running ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Play className="h-4 w-4" aria-hidden />} {t("code.run")}
          </button>
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="min-w-0 space-y-3">
          <CodeEditor value={code} onChange={change} label="playground" minHeight="360px" />
          <div className="card overflow-hidden" aria-live="polite">
            <p className="border-b border-line bg-raised px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted">{t("code.output")}</p>
            <pre className="max-h-72 min-h-[100px] overflow-auto whitespace-pre-wrap p-4 font-mono text-sm" dir="ltr">
              {running ? t("code.running") : result?.stdout}
              {!running && result?.error && <span className="text-bad">{result.error}</span>}
              {!running && result?.timedOut && <span className="text-bad">{t("code.timeout")}</span>}
            </pre>
          </div>
        </div>
        <div className="card h-fit border-accent/30 p-4">
          <h2 className="flex items-center gap-2 font-bold"><Lightbulb className="h-4 w-4 text-accent" aria-hidden /> {t("code.hint")}</h2>
          <p className="mt-1 text-xs text-muted">{t("code.hintNote")}</p>
          <div className="mt-3 flex gap-2">
            <label className="sr-only" htmlFor="pq">{t("code.hintAsk")}</label>
            <input id="pq" className="input !min-h-[40px] text-sm" maxLength={500} placeholder={t("code.hintAsk")} value={question} onChange={(e) => setQuestion(e.target.value)} />
            <VoiceButton onText={setQuestion} label={t("code.voice")} listeningLabel={t("code.listening")} />
          </div>
          <button
            className="btn-accent mt-2 w-full"
            disabled={hinting}
            onClick={async () => {
              setHinting(true);
              setHint("");
              const r = await fetch("/api/play-hint", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code, error: result?.error ?? undefined, question: question || undefined }) });
              const d = await r.json();
              setHint(d.hint ?? d.error ?? t("common.error"));
              setHinting(false);
            }}
          >
            {hinting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Lightbulb className="h-4 w-4" aria-hidden />} {hinting ? t("code.hintThinking") : t("code.hint")}
          </button>
          {hint && (
            <div className="mt-3 rounded-xl bg-accent/10 p-3 text-sm" role="status">
              <Markdown text={hint} />
              <button className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-accent" onClick={() => speak(hint, t.locale)}>
                <Volume2 className="h-3.5 w-3.5" aria-hidden /> {t("code.listen")}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
