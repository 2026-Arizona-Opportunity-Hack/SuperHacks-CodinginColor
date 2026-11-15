/* CIC Learn service worker: makes the app usable on flaky school Wi-Fi.
 *  - Python (Pyodide, ~10 MB) and app assets: cache-first, so after one visit Python runs offline.
 *  - Pages: network-first; when offline, fall back to the last copy or /offline.
 *  - Lesson pages are cached so a student can keep reading; they're wiped when a student switches
 *    (shared lab machines), and nothing from staff pages or APIs is ever cached. */
const VERSION = "cic-v3";
const SHELL = ["/", "/join", "/play", "/offline", "/brand/cic-logo-256.png", "/manifest.webmanifest", "/pyodide-worker.js"];
const CACHEABLE_PAGE = /^\/($|join$|play$|offline$|learn(\/m\/[0-9a-f-]{36}|\/catch-up)?$)/;

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(`${VERSION}-shell`).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

const PYODIDE = "https://cdn.jsdelivr.net/pyodide/v0.26.4/full/";
const PYODIDE_FILES = ["pyodide.js", "pyodide.asm.js", "pyodide.asm.wasm", "python_stdlib.zip", "pyodide-lock.json"].map((f) => PYODIDE + f);

/** Downloads a page and every /_next/static file it references, so it works fully offline. */
async function savePage(url) {
  const res = await fetch(url, { credentials: "same-origin" });
  if (!res.ok) return 0;
  const html = await res.clone().text();
  await (await caches.open(`${VERSION}-pages`)).put(url, res);
  const assets = [...new Set(html.match(/\/_next\/static\/[^"'\s)]+/g) || [])];
  const cache = await caches.open(`${VERSION}-static`);
  await Promise.all(assets.map((a) => cache.match(a).then((hit) => hit || cache.add(a).catch(() => {}))));
  return 1 + assets.length;
}

self.addEventListener("message", (e) => {
  if (e.data === "clear-personal") e.waitUntil(caches.delete(`${VERSION}-pages`));
  // "Save for offline": pages the student will need + the whole Python runtime.
  if (e.data && e.data.type === "precache" && Array.isArray(e.data.urls)) {
    const port = e.ports[0];
    const urls = e.data.urls.filter((u) => typeof u === "string" && u.startsWith("/") && CACHEABLE_PAGE.test(u.split("?")[0]));
    e.waitUntil(
      (async () => {
        let done = 0;
        const total = urls.length + 1;
        const py = await caches.open(`${VERSION}-pyodide`);
        await Promise.all(PYODIDE_FILES.map((f) => py.match(f).then((hit) => hit || py.add(f).catch(() => {}))));
        port?.postMessage({ done: ++done, total });
        for (const u of urls) {
          await savePage(u).catch(() => 0);
          port?.postMessage({ done: ++done, total });
        }
        port?.postMessage({ finished: true, total });
      })()
    );
  }
});

async function cacheFirst(req, name) {
  const hit = await caches.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) (await caches.open(name)).put(req, res.clone());
  return res;
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  if (url.hostname === "cdn.jsdelivr.net" && url.pathname.startsWith("/pyodide/")) {
    e.respondWith(cacheFirst(req, `${VERSION}-pyodide`));
    return;
  }
  if (url.origin !== location.origin) return;
  if (url.pathname.startsWith("/_next/static/") || url.pathname === "/pyodide-worker.js") {
    e.respondWith(cacheFirst(req, `${VERSION}-static`));
    return;
  }
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then(async (res) => {
          if (res.ok && CACHEABLE_PAGE.test(url.pathname)) (await caches.open(`${VERSION}-pages`)).put(req, res.clone());
          return res;
        })
        .catch(async () => (await caches.match(req)) || (await caches.match("/offline")))
    );
  }
});
