"use client";

export type TestResult = { name: string; passed: boolean; message: string };
export type RunResult = { stdout: string; error: string | null; tests: TestResult[]; timedOut?: boolean };

const TIMEOUT_MS = 8000;
let worker: Worker | null = null;
let loaded = false;
let seq = 0;

function getWorker() {
  if (!worker) worker = new Worker("/pyodide-worker.js");
  return worker;
}

/** Starts downloading Python in the background so the first Run is fast. */
export function preloadPython() {
  if (!loaded) getWorker().postMessage({ id: -1, code: "", tests: [] });
}

export function isPythonLoaded() {
  return loaded;
}

/** Runs code + tests. Kills the worker if it runs too long (infinite loops). */
export function runPython(code: string, tests: { name: string; code: string }[] = []): Promise<RunResult> {
  const w = getWorker();
  const id = ++seq;
  return new Promise((resolve) => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const onMsg = (e: MessageEvent) => {
      if (e.data.id === -1 && e.data.ready) loaded = true;
      if (e.data.id !== id) return;
      if (e.data.ready) {
        loaded = true;
        // Python is loaded; start the clock for the student's code now.
        timer = setTimeout(() => {
          w.removeEventListener("message", onMsg);
          w.terminate();
          worker = null;
          loaded = false;
          resolve({ stdout: "", error: null, tests: tests.map((t) => ({ name: t.name, passed: false, message: "Timed out" })), timedOut: true });
        }, TIMEOUT_MS);
        return;
      }
      if (timer) clearTimeout(timer);
      w.removeEventListener("message", onMsg);
      resolve(e.data.result);
    };
    w.addEventListener("message", onMsg);
    w.postMessage({ id, code, tests });
  });
}
