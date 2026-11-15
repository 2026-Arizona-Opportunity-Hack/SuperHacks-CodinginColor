"use client";

/**
 * Offline outbox: work submitted without internet is kept on this device (localStorage) and
 * sent in order when the connection returns. The server still grades and enforces unlock order.
 */
export type OutboxItem = { activityId: string; payload: Record<string, unknown>; at: number };
const KEY = "cic_outbox";

export function readOutbox(): OutboxItem[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}
function writeOutbox(items: OutboxItem[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {}
  window.dispatchEvent(new Event("cic-outbox"));
}
export function queueSubmission(activityId: string, payload: Record<string, unknown>) {
  // Keep only the latest attempt per activity.
  writeOutbox([...readOutbox().filter((i) => i.activityId !== activityId), { activityId, payload, at: Date.now() }]);
}

let flushing = false;
/** Sends queued work in order. Returns how many were accepted. Stops at the first network failure. */
export async function flushOutbox(): Promise<{ sent: number; dropped: number }> {
  if (flushing || !navigator.onLine) return { sent: 0, dropped: 0 };
  flushing = true;
  let sent = 0, dropped = 0;
  try {
    for (const item of readOutbox().sort((a, b) => a.at - b.at)) {
      let res: Response;
      try {
        res = await fetch(`/api/activity/${item.activityId}/submit`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(item.payload) });
      } catch {
        break; // still offline
      }
      // Accepted, or permanently rejected (e.g. locked): either way it leaves the outbox.
      if (res.ok) sent++;
      else if (res.status < 500) dropped++;
      else break;
      writeOutbox(readOutbox().filter((i) => !(i.activityId === item.activityId && i.at === item.at)));
    }
  } finally {
    flushing = false;
  }
  return { sent, dropped };
}

/** Asks the service worker to download these pages + the Python runtime. */
export function saveForOffline(urls: string[], onProgress: (done: number, total: number) => void): Promise<boolean> {
  return new Promise((resolve) => {
    const sw = navigator.serviceWorker?.controller;
    if (!sw) return resolve(false);
    const ch = new MessageChannel();
    ch.port1.onmessage = (e) => {
      if (e.data.finished) {
        try {
          localStorage.setItem("cic_offline_ready", String(Date.now()));
        } catch {}
        resolve(true);
      } else onProgress(e.data.done, e.data.total);
    };
    sw.postMessage({ type: "precache", urls }, [ch.port2]);
  });
}

// ── Offline mode switch (ON = keep a saved copy on this device and refresh it; OFF = remove it) ──

const MODE_KEY = "cic_offline_mode";
const READY_KEY = "cic_offline_ready";
export const offlineModeOn = () => {
  try {
    return localStorage.getItem(MODE_KEY) === "on";
  } catch {
    return false;
  }
};
export const lastSaved = () => {
  try {
    return Number(localStorage.getItem(READY_KEY)) || 0;
  } catch {
    return 0;
  }
};
function announce() {
  window.dispatchEvent(new Event("cic-offline-mode"));
}

export async function turnOfflineOn(urls: string[], onProgress: (d: number, t: number) => void): Promise<boolean> {
  const ok = await saveForOffline(urls, onProgress);
  if (ok) {
    try {
      localStorage.setItem(MODE_KEY, "on");
    } catch {}
  }
  announce();
  return ok;
}

export function turnOfflineOff(): Promise<void> {
  try {
    localStorage.removeItem(MODE_KEY);
    localStorage.removeItem(READY_KEY);
  } catch {}
  return new Promise((resolve) => {
    const sw = navigator.serviceWorker?.controller;
    if (!sw) {
      announce();
      return resolve();
    }
    const ch = new MessageChannel();
    ch.port1.onmessage = () => {
      announce();
      resolve();
    };
    sw.postMessage({ type: "clear-offline" }, [ch.port2]);
    setTimeout(() => {
      announce();
      resolve();
    }, 3000);
  });
}
