/* CIC Learn service worker: makes the app usable on flaky school Wi-Fi.
 *  - Python (Pyodide, ~10 MB) and app assets: cache-first, so after one visit Python runs offline.
 *  - Pages: network-first; when offline, fall back to the last copy or /offline.
 *  - Lesson pages are cached so a student can keep reading; they're wiped when a student switches
 *    (shared lab machines), and nothing from staff pages or APIs is ever cached. */
const VERSION = "cic-v2";
const SHELL = ["/", "/join", "/play", "/offline", "/brand/cic-logo-256.png", "/manifest.webmanifest", "/pyodide-worker.js"];
const CACHEABLE_PAGE = /^\/($|join$|play$|offline$|learn(\/m\/[0-9a-f-]{36})?$)/;

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(`${VERSION}-shell`).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener("message", (e) => {
  if (e.data === "clear-personal") e.waitUntil(caches.delete(`${VERSION}-pages`));
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
