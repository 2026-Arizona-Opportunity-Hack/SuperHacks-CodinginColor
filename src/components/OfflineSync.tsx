"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { CloudUpload } from "lucide-react";
import { useT } from "@/i18n/client";
import { flushOutbox, readOutbox } from "@/lib/client/offline";

/** Sends offline work as soon as the device is back online, and tells the student. */
export function OfflineSync() {
  const t = useT();
  const router = useRouter();
  const [toast, setToast] = useState("");
  useEffect(() => {
    const run = async () => {
      if (readOutbox().length === 0) return;
      const { sent } = await flushOutbox();
      if (sent > 0) {
        setToast(t("offline.synced", { n: sent }));
        router.refresh();
        setTimeout(() => setToast(""), 3500);
      }
    };
    run();
    window.addEventListener("online", run);
    return () => window.removeEventListener("online", run);
  }, [router, t]);
  return (
    <AnimatePresence>
      {toast && (
        <motion.div role="status" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="no-print fixed bottom-24 start-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-medium text-bg shadow-card">
          <CloudUpload className="h-4 w-4" aria-hidden /> {toast}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
