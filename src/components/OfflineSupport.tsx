"use client";
import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

/** Registers the service worker (production only) and shows a banner while offline. */
export function OfflineSupport() {
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  if (!offline) return null;
  return (
    <div role="status" className="no-print fixed inset-x-0 bottom-0 z-50 flex items-center justify-center gap-2 bg-ink px-4 py-2 text-sm font-medium text-bg">
      <WifiOff className="h-4 w-4" aria-hidden /> You&apos;re offline. Python and saved lessons still work; your answers will sync when you&apos;re back online.
    </div>
  );
}

/** Wipes cached lesson pages (used when a student switches on a shared machine). */
export function clearPersonalCache() {
  navigator.serviceWorker?.controller?.postMessage("clear-personal");
}
