"use client";
import { useEffect, useRef, useState } from "react";
import { Mic, MicOff } from "lucide-react";

const SPEECH_LANG: Record<string, string> = { en: "en-US", es: "es-US", ar: "ar-SA" };

/** Reads text aloud in the student's language (built into the browser; nothing leaves the device). */
export function speak(text: string, locale: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text.replace(/[`*]/g, ""));
  u.lang = SPEECH_LANG[locale] ?? "en-US";
  u.rate = 0.95;
  window.speechSynthesis.speak(u);
}

type Recognition = { lang: string; interimResults: boolean; onresult: (e: any) => void; onend: () => void; onerror: () => void; start: () => void; stop: () => void };

/** Push-to-talk: speak your question instead of typing it (browser speech recognition). */
export function VoiceButton({ onText, label, listeningLabel }: { onText: (s: string) => void; label: string; listeningLabel: string }) {
  const [listening, setListening] = useState(false);
  const rec = useRef<Recognition | null>(null);
  // Detect support after mount so the server and first client render match.
  const [Ctor, setCtor] = useState<any>(null);
  useEffect(() => setCtor(() => (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null), []);
  if (!Ctor) return null; // not supported (e.g. Firefox): typing still works

  const toggle = () => {
    if (listening) {
      rec.current?.stop();
      return;
    }
    const r: Recognition = new Ctor();
    r.lang = SPEECH_LANG[document.documentElement.lang] ?? "en-US";
    r.interimResults = true;
    r.onresult = (e: any) => onText(Array.from(e.results).map((x: any) => x[0].transcript).join(" "));
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    rec.current = r;
    setListening(true);
    r.start();
  };
  return (
    <button type="button" onClick={toggle} className={`btn-ghost !min-h-[40px] shrink-0 !px-2.5 ${listening ? "!border-bad !text-bad" : ""}`} aria-pressed={listening} aria-label={listening ? listeningLabel : label} title={label}>
      {listening ? <MicOff className="h-4 w-4 animate-pulse" aria-hidden /> : <Mic className="h-4 w-4" aria-hidden />}
    </button>
  );
}
