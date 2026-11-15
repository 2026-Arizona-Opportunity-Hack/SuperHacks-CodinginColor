"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Radio } from "lucide-react";

/** Live class mode: re-fetches the dashboard every 5 seconds while switched on. */
export function LiveRefresh() {
  const router = useRouter();
  const [live, setLive] = useState(false);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!live) return;
    const id = setInterval(() => {
      if (document.visibilityState === "visible") {
        router.refresh();
        setTick((t) => t + 1);
      }
    }, 5000);
    return () => clearInterval(id);
  }, [live, router]);
  return (
    <button type="button" className={`btn-ghost ${live ? "!border-good !text-good" : ""}`} aria-pressed={live} onClick={() => setLive((l) => !l)}>
      <Radio className={`h-4 w-4 ${live ? "animate-pulse" : ""}`} aria-hidden />
      {live ? `Live · updated ${tick ? "5s ago" : "now"}` : "Live class mode"}
    </button>
  );
}
