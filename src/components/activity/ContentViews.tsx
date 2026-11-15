"use client";
import { useState } from "react";
import { ChevronLeft, ChevronRight, Loader2, PlayCircle } from "lucide-react";
import { useT } from "@/i18n/client";
import { Markdown } from "../Markdown";
import type { ViewProps } from "./types";

/** Converts a YouTube/Vimeo link into a privacy-friendly embed URL; anything else is ignored. */
function embedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (/(^|\.)youtube\.com$/.test(u.hostname) && u.searchParams.get("v")) return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(u.searchParams.get("v")!)}`;
    if (u.hostname === "youtu.be") return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(u.pathname.slice(1))}`;
    if (/(^|\.)vimeo\.com$/.test(u.hostname) && /^\/\d+/.test(u.pathname)) return `https://player.vimeo.com/video${u.pathname}`;
  } catch {}
  return null;
}

function DoneButton({ activity, submit, onContinue, isLast }: ViewProps) {
  const t = useT();
  const [busy, setBusy] = useState(false);
  if (activity.completed)
    return isLast ? null : (
      <button className="btn-primary" onClick={onContinue}>
        {t("player.next")} →
      </button>
    );
  return (
    <button
      className="btn-primary"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        const r = await submit({});
        setBusy(false);
        if (r.completed && !isLast) onContinue();
      }}
    >
      {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />} {t("player.markDone")}
    </button>
  );
}

export function VideoView(props: ViewProps) {
  const t = useT();
  const { url, body } = props.activity.content as { url: string; body: string };
  const src = url ? embedUrl(url) : null;
  return (
    <div className="space-y-5">
      {src ? (
        <div className="lite-hide aspect-video overflow-hidden rounded-2xl border border-line bg-black">
          <iframe src={src} title={props.activity.title} className="h-full w-full" allow="encrypted-media; picture-in-picture" allowFullScreen loading="lazy" />
        </div>
      ) : (
        <div className="card flex items-center gap-3 p-4 text-sm text-muted">
          <PlayCircle className="h-5 w-5 text-brand" aria-hidden /> {t("player.videoMissing")}
        </div>
      )}
      <div className="card p-6 text-[17px] leading-relaxed">
        <Markdown text={body} />
      </div>
      <DoneButton {...props} />
    </div>
  );
}

export function SlidesView(props: ViewProps) {
  const { slides } = props.activity.content as { slides: { title: string; body: string }[] };
  const [i, setI] = useState(0);
  const last = i === slides.length - 1;
  return (
    <div className="space-y-5">
      <div className="card relative min-h-[300px] overflow-hidden p-8" aria-roledescription="slide" aria-label={`${i + 1} / ${slides.length}`}>
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand to-accent" />
        <p className="text-xs font-semibold text-muted">
          {i + 1} / {slides.length}
        </p>
        <h3 className="h-display mt-2 text-2xl">{slides[i].title}</h3>
        <div className="mt-4 text-lg">
          <Markdown text={slides[i].body} codeLike />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button className="btn-ghost" disabled={i === 0} onClick={() => setI(i - 1)} aria-label="Previous slide">
          <ChevronLeft className="h-4 w-4 rtl:rotate-180" aria-hidden />
        </button>
        <div className="flex gap-1.5" aria-hidden>
          {slides.map((_, n) => (
            <span key={n} className={`h-2 rounded-full transition-all ${n === i ? "w-6 bg-brand" : "w-2 bg-line"}`} />
          ))}
        </div>
        {!last ? (
          <button className="btn-ghost" onClick={() => setI(i + 1)} aria-label="Next slide">
            <ChevronRight className="h-4 w-4 rtl:rotate-180" aria-hidden />
          </button>
        ) : (
          <DoneButton {...props} />
        )}
      </div>
    </div>
  );
}
