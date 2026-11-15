"use client";
import { useEffect, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useT } from "@/i18n/client";
import type { ViewProps } from "./types";

/** A printed worksheet, made digital. Drafts are kept on this device until submitted. */
export function WorksheetView({ activity, submit, onContinue, isLast }: ViewProps) {
  const t = useT();
  const { intro, prompts } = activity.content as { intro: string; prompts: { id: string; prompt: string; long: boolean }[] };
  const draftKey = `cic_ws_${activity.id}`;
  const [responses, setResponses] = useState<Record<string, string>>(activity.answer ?? {});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(activity.completed);

  useEffect(() => {
    if (activity.completed) return;
    try {
      const d = localStorage.getItem(draftKey);
      if (d) setResponses(JSON.parse(d));
    } catch {}
  }, [activity.completed, draftKey]);
  const update = (id: string, v: string) => {
    const next = { ...responses, [id]: v };
    setResponses(next);
    try {
      localStorage.setItem(draftKey, JSON.stringify(next));
    } catch {}
  };

  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        if (prompts.some((p) => !responses[p.id]?.trim())) return setError(t("player.answerRequired"));
        setBusy(true);
        setError("");
        const r = await submit({ responses });
        setBusy(false);
        if (r.error) return setError(r.error);
        if (r.completed) {
          setSaved(true);
          try {
            localStorage.removeItem(draftKey);
          } catch {}
        }
      }}
    >
      {intro && <p className="text-sm text-muted">{intro}</p>}
      {prompts.map((p, i) => (
        <div key={p.id} className="card p-5">
          <label htmlFor={p.id} className="font-semibold">
            <span className="me-2 text-muted">{i + 1}.</span>
            {p.prompt}
          </label>
          {p.long ? (
            <textarea id={p.id} className="input mt-3 min-h-[120px]" maxLength={4000} value={responses[p.id] ?? ""} onChange={(e) => update(p.id, e.target.value)} />
          ) : (
            <input id={p.id} className="input mt-3" maxLength={4000} value={responses[p.id] ?? ""} onChange={(e) => update(p.id, e.target.value)} />
          )}
        </div>
      ))}
      {error && (
        <p role="alert" className="text-sm font-medium text-bad">
          {error}
        </p>
      )}
      <div className="flex items-center gap-3" aria-live="polite">
        <button className="btn-primary" disabled={busy}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />} {t("player.submit")}
        </button>
        {saved && (
          <>
            <span className="flex items-center gap-1 text-sm font-semibold text-good">
              <CheckCircle2 className="h-4 w-4" aria-hidden /> {t("player.worksheetSaved")}
            </span>
            {!isLast && (
              <button type="button" className="btn-ghost" onClick={onContinue}>
                {t("player.next")} →
              </button>
            )}
          </>
        )}
      </div>
    </form>
  );
}
