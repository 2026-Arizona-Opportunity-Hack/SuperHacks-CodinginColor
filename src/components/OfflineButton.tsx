"use client";
import { useEffect, useState } from "react";
import { CheckCircle2, CloudDownload, Loader2, WifiOff } from "lucide-react";
import { useT } from "@/i18n/client";
import { readOutbox, saveForOffline } from "@/lib/client/offline";

/**
 * Header "Offline" button: one tap downloads what this visitor needs to keep working without
 * internet (a student's open lessons, the playground and the Python runtime).
 */
export function OfflineButton({ urls }: { urls: string[] }) {
  const t = useT();
  const [state, setState] = useState<"idle" | "saving" | "ready" | "unsupported">("idle");
  const [pct, setPct] = useState(0);
  const [offline, setOffline] = useState(false);
  const [pending, setPending] = useState(0);

  useEffect(() => {
    try {
      if (localStorage.getItem("cic_offline_ready")) setState("ready");
    } catch {}
    const net = () => setOffline(!navigator.onLine);
    const box = () => setPending(readOutbox().length);
    net();
    box();
    window.addEventListener("online", net);
    window.addEventListener("offline", net);
    window.addEventListener("cic-outbox", box);
    return () => {
      window.removeEventListener("online", net);
      window.removeEventListener("offline", net);
      window.removeEventListener("cic-outbox", box);
    };
  }, []);

  const save = async () => {
    if (offline || state === "saving") return;
    setState("saving");
    setPct(0);
    const ok = await saveForOffline(urls, (d, total) => setPct(Math.round((100 * d) / total)));
    setState(ok ? "ready" : "unsupported");
    if (!ok) setTimeout(() => setState("idle"), 4000);
  };

  const label = offline
    ? t("offline.youreOffline")
    : state === "saving"
      ? `${t("offline.saving")} ${pct}%`
      : state === "ready"
        ? t("offline.buttonReady")
        : state === "unsupported"
          ? t("offline.unsupportedShort")
          : t("offline.button");
  const Icon = offline ? WifiOff : state === "saving" ? Loader2 : state === "ready" ? CheckCircle2 : CloudDownload;
  const tone = offline ? "!border-warn !text-warn" : state === "ready" ? "!border-good/50 !text-good" : "";

  return (
    <button
      type="button"
      onClick={save}
      className={`btn-ghost relative !min-h-[40px] !px-2.5 ${tone}`}
      aria-live="polite"
      title={state === "ready" ? t("offline.updateHint") : t("offline.help")}
      aria-label={label}
    >
      <Icon className={`h-4 w-4 ${state === "saving" ? "animate-spin" : ""}`} aria-hidden />
      <span className="hidden lg:inline">{label}</span>
      {pending > 0 && (
        <span className="absolute -end-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-warn px-1 text-[10px] font-bold text-white" aria-label={t("offline.pending", { n: pending })}>
          {pending}
        </span>
      )}
    </button>
  );
}
