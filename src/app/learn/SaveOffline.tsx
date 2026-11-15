"use client";
import { useEffect, useState } from "react";
import { CheckCircle2, CloudDownload, Loader2, WifiOff } from "lucide-react";
import { useT } from "@/i18n/client";
import { readOutbox, saveForOffline } from "@/lib/client/offline";

/** "Save for offline": downloads this student's open modules and Python so class can continue without Wi-Fi. */
export function SaveOffline({ moduleIds }: { moduleIds: string[] }) {
  const t = useT();
  const [state, setState] = useState<"idle" | "saving" | "ready" | "unsupported">("idle");
  const [progress, setProgress] = useState(0);
  const [pending, setPending] = useState(0);
  useEffect(() => {
    try {
      if (localStorage.getItem("cic_offline_ready")) setState("ready");
    } catch {}
    const update = () => setPending(readOutbox().length);
    update();
    window.addEventListener("cic-outbox", update);
    return () => window.removeEventListener("cic-outbox", update);
  }, []);
  const save = async () => {
    setState("saving");
    const urls = ["/learn", "/play", "/offline", ...moduleIds.map((id) => `/learn/m/${id}`)];
    const ok = await saveForOffline(urls, (d, total) => setProgress(Math.round((100 * d) / total)));
    setState(ok ? "ready" : "unsupported");
  };
  return (
    <div className="card p-5">
      <h2 className="flex items-center gap-2 font-bold">
        <WifiOff className="h-4 w-4 text-brand" aria-hidden /> {t("offline.title")}
        {state === "ready" && <span className="chip bg-good/15 text-good"><CheckCircle2 className="h-3 w-3" aria-hidden /> {t("offline.ready")}</span>}
      </h2>
      <p className="mt-1 text-xs text-muted">{t("offline.help")}</p>
      {pending > 0 && <p className="mt-2 text-xs font-medium text-warn" role="status">{t("offline.pending", { n: pending })}</p>}
      <button className="btn-ghost mt-3 w-full" onClick={save} disabled={state === "saving"} aria-live="polite">
        {state === "saving" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <CloudDownload className="h-4 w-4" aria-hidden />}
        {state === "saving" ? `${t("offline.saving")} ${progress}%` : state === "ready" ? t("offline.update") : t("offline.save")}
      </button>
      {state === "unsupported" && <p className="mt-2 text-xs text-muted">{t("offline.unsupported")}</p>}
    </div>
  );
}
