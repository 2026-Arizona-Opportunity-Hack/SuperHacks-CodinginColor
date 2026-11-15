"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, MessageCircle, Send, X } from "lucide-react";
import { useT } from "@/i18n/client";
import { Markdown } from "./Markdown";

type Msg = { role: "user" | "assistant"; content: string };

/** Floating "CIC Helper" button + chat panel. Answers how-to questions; never does students' work. */
export function HelperChat() {
  const t = useT();
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, busy]);
  useEffect(() => {
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [open]);

  async function send(content: string) {
    const q = content.trim().slice(0, 1000);
    if (!q || busy) return;
    const next = [...msgs, { role: "user" as const, content: q }].slice(-12);
    setMsgs(next);
    setText("");
    setBusy(true);
    try {
      const r = await fetch("/api/assistant", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: next, path }) });
      const d = await r.json();
      setMsgs((m) => [...m, { role: "assistant", content: d.reply ?? d.error ?? t("helper.error") }]);
    } catch {
      setMsgs((m) => [...m, { role: "assistant", content: navigator.onLine ? t("helper.error") : t("helper.offline") }]);
    }
    setBusy(false);
  }

  const suggestions = [t("helper.s1"), t("helper.s2"), t("helper.s3")];

  return (
    <div className="no-print fixed bottom-5 end-5 z-50 flex flex-col items-end gap-3">
      <AnimatePresence>
        {open && (
          <motion.section
            role="dialog"
            aria-label={t("helper.title")}
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97 }}
            transition={{ duration: 0.2 }}
            className="card flex h-[min(560px,calc(100dvh-120px))] w-[min(380px,calc(100vw-40px))] flex-col overflow-hidden shadow-2xl"
          >
            <header className="flex items-center gap-3 border-b border-line bg-leaf/60 px-4 py-3">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-leaf text-leaf-ink" aria-hidden>
                <MessageCircle className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-bold leading-tight">{t("helper.title")}</p>
                <p className="truncate text-xs text-muted">{t("helper.subtitle")}</p>
              </div>
              <button className="grid h-9 w-9 place-items-center rounded-lg hover:bg-raised" aria-label={t("helper.close")} onClick={() => (setOpen(false), buttonRef.current?.focus())}>
                <X className="h-4 w-4" aria-hidden />
              </button>
            </header>

            <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto p-4" aria-live="polite">
              <div className="max-w-[85%] rounded-2xl rounded-ss-sm bg-raised px-3 py-2 text-sm">{t("helper.greeting")}</div>
              {msgs.length === 0 && (
                <div className="flex flex-wrap gap-2">
                  {suggestions.map((s) => (
                    <button key={s} className="rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-medium hover:border-brand/50 hover:bg-leaf/30" onClick={() => send(s)}>
                      {s}
                    </button>
                  ))}
                </div>
              )}
              {msgs.map((m, i) =>
                m.role === "user" ? (
                  <div key={i} className="ms-auto max-w-[85%] rounded-2xl rounded-se-sm bg-leaf px-3 py-2 text-sm text-leaf-ink">
                    {m.content}
                  </div>
                ) : (
                  <div key={i} className="max-w-[85%] rounded-2xl rounded-ss-sm bg-raised px-3 py-2 text-sm">
                    <Markdown text={m.content} />
                  </div>
                )
              )}
              {busy && (
                <div className="flex w-fit items-center gap-2 rounded-2xl bg-raised px-3 py-2 text-sm text-muted">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> {t("helper.thinking")}
                </div>
              )}
            </div>

            <form
              className="flex gap-2 border-t border-line p-3"
              onSubmit={(e) => {
                e.preventDefault();
                send(text);
              }}
            >
              <label className="sr-only" htmlFor="helper-input">
                {t("helper.placeholder")}
              </label>
              <input ref={inputRef} id="helper-input" className="input !min-h-[42px] text-sm" maxLength={1000} placeholder={t("helper.placeholder")} value={text} onChange={(e) => setText(e.target.value)} autoComplete="off" />
              <button className="btn-primary !min-h-[42px] shrink-0 !px-3" disabled={busy || !text.trim()} aria-label={t("helper.send")}>
                <Send className="h-4 w-4 rtl:-scale-x-100" aria-hidden />
              </button>
            </form>
          </motion.section>
        )}
      </AnimatePresence>

      <motion.button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={open ? t("helper.close") : t("helper.open")}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.94 }}
        className="relative grid h-14 w-14 place-items-center rounded-full bg-leaf text-leaf-ink shadow-[0_12px_30px_-10px_rgb(var(--brand)/.7)] ring-4 ring-surface"
      >
        {!open && <span className="absolute inset-0 animate-ping rounded-full bg-leaf/50 [animation-duration:3s]" aria-hidden />}
        {open ? <X className="relative h-6 w-6" aria-hidden /> : <MessageCircle className="relative h-6 w-6" aria-hidden />}
      </motion.button>
    </div>
  );
}
