"use client";
import { useEffect, useState } from "react";
import { Loader2, WifiOff } from "lucide-react";
import { useT } from "@/i18n/client";
import { lastSaved, offlineModeOn, readOutbox, turnOfflineOff, turnOfflineOn } from "@/lib/client/offline";

const REFRESH_MS = 6 * 60 * 60 * 1000; // keep the saved copy fresh: re-save at most every 6 hours

/**
 * Offline mode ON/OFF switch. ON saves this visitor's pages + the Python runtime on the device
 * (and refreshes them); OFF removes them. The header and the journey card share the same state.
 */
export function OfflineToggle({ urls, variant = "header" }: { urls: string[]; variant?: "header" | "card" }) {
  const t = useT();
  const [on, setOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pct, setPct] = useState(0);
  const [offline, setOffline] = useState(false);
  const [pending, setPending] = useState(0);
  const [note, setNote] = useState("");

  useEffect(() => {
    const sync = () => setOn(offlineModeOn());
    const net = () => setOffline(!navigator.onLine);
    const box = () => setPending(readOutbox().length);
    sync();
    net();
    box();
    window.addEventListener("cic-offline-mode", sync);
    window.addEventListener("online", net);
    window.addEventListener("offline", net);
    window.addEventListener("cic-outbox", box);
    // Quietly refresh the saved copy when offline mode is on and it's getting old.
    if (offlineModeOn() && navigator.onLine && Date.now() - lastSaved() > REFRESH_MS && variant === "header") {
      turnOfflineOn(urls, () => {}).catch(() => {});
    }
    return () => {
      window.removeEventListener("cic-offline-mode", sync);
      window.removeEventListener("online", net);
      window.removeEventListener("offline", net);
      window.removeEventListener("cic-outbox", box);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggle = async () => {
    if (busy) return;
    setNote("");
    if (on) {
      setBusy(true);
      await turnOfflineOff();
      setOn(false);
      setBusy(false);
      setNote(t("offline.turnedOff"));
      return;
    }
    if (offline) return; // can't download while already offline
    setBusy(true);
    setPct(0);
    const ok = await turnOfflineOn(urls, (d, total) => setPct(Math.round((100 * d) / total)));
    setBusy(false);
    setOn(ok);
    if (!ok) setNote(t("offline.unsupported"));
  };

  const stateText = busy ? (on ? "…" : `${t("offline.saving")} ${pct}%`) : on ? t("offline.on") : t("offline.off");
  const Switch = (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={`${t("offline.mode")}: ${on ? t("offline.on") : t("offline.off")}`}
      onClick={toggle}
      disabled={busy || (offline && !on)}
      title={on ? t("offline.updateHint") : t("offline.help")}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors disabled:opacity-60 ${on ? "border-brand bg-leaf" : "border-line bg-raised"}`}
    >
      <span className={`absolute top-0.5 grid h-[18px] w-[18px] place-items-center rounded-full bg-surface shadow transition-all ${on ? "start-[22px]" : "start-0.5"}`}>
        {busy && <Loader2 className="h-3 w-3 animate-spin text-brand" aria-hidden />}
      </span>
    </button>
  );

  if (variant === "card")
    return (
      <div className="card p-5" aria-live="polite">
        <div className="flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 font-bold">
            <WifiOff className="h-4 w-4 text-brand" aria-hidden /> {t("offline.mode")}
          </h2>
          <div className="flex items-center gap-2 text-sm font-semibold">
            <span className={on ? "text-good" : "text-muted"}>{stateText}</span>
            {Switch}
          </div>
        </div>
        <p className="mt-2 text-xs text-muted">{t("offline.help")}</p>
        {offline && <p className="mt-2 text-xs font-semibold text-warn">📴 {t("offline.youreOffline")}</p>}
        {pending > 0 && <p className="mt-1 text-xs font-medium text-warn">{t("offline.pending", { n: pending })}</p>}
        {note && <p className="mt-2 text-xs text-muted">{note}</p>}
      </div>
    );

  return (
    <div className={`relative flex min-h-[40px] items-center gap-2 rounded-xl border px-2.5 ${offline ? "border-warn/60 bg-warn/10" : "border-line bg-surface"}`} aria-live="polite">
      {offline ? <WifiOff className="h-4 w-4 text-warn" aria-hidden /> : null}
      <span className="hidden text-sm font-medium lg:inline">{offline ? t("offline.youreOffline") : t("offline.mode")}</span>
      <span className={`hidden text-xs font-semibold sm:inline ${on ? "text-good" : "text-muted"}`}>{stateText}</span>
      {Switch}
      {pending > 0 && (
        <span className="absolute -end-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-warn px-1 text-[10px] font-bold text-white" aria-label={t("offline.pending", { n: pending })}>
          {pending}
        </span>
      )}
    </div>
  );
}
