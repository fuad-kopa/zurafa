// Service worker, generated at build time from src/sw-template.js (see vite.config.ts).
const VERSION = '4fad9a5625';
const SHELL = 'zurafa-shell-' + VERSION;
const RUNTIME = 'zurafa-runtime';
const PRECACHE = ["./","./assets/index-BTeiWCqC.js","./assets/asyk-lLO7knPh.js","./assets/cinema-CSORvF02.js","./assets/course-BJMyF9Wl.js","./assets/feedback-CnTKB63b.js","./assets/game-DZ2yE_ic.js","./assets/games-DIOKlWsX.js","./assets/i18n-DYrwlmfY.js","./assets/legal-DkWGXAjX.js","./assets/lesson-S_KOxfqZ.js","./assets/library-CpYLGPSb.js","./assets/nard-DwsMaqnQ.js","./assets/seek-BPWpAHKw.js","./assets/shatranj-InKJprH9.js","./assets/sound-B2p_bfmH.js","./assets/svgKeys-vSUHuIb9.js","./assets/toguz-Dt2zV4V0.js","./assets/index-CodGS5Uq.css","./assets/piazzolla-BpQGBuE-.woff2","./assets/piazzolla-italic-BqsCNadr.woff2","./assets/shatranjWorker-C665-8v9.js","./assets/worker-CGAm9Y7Q.js","./assets/ysabeau-office-CAYRpo-H.woff2","./favicon.svg","./img/icon-192.png","./img/icon-512.png","./manifest.webmanifest"];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('zurafa-shell-') && k !== SHELL).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const scope = new URL(self.registration.scope);

  // Fonts from Google: cache first, they never change under the same URL.
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(cacheFirst(req, RUNTIME));
    return;
  }
  if (url.origin !== scope.origin) return;
  const path = url.pathname.slice(scope.pathname.length);
  // Videos and music stream with range requests: leave them to the browser.
  if (path.startsWith('video/') || path.startsWith('music/') || req.headers.has('range')) return;

  // The page itself: fresh when online, the cached shell when offline. Only the app's own page refreshes the
  // shell; the static encyclopedia and rules pages must never take its place.
  if (req.mode === 'navigate') {
    const isShell = path === '' || path === 'index.html';
    e.respondWith(
      fetch(req)
        .then((res) => {
          if (isShell && res.ok) {
            const copy = res.clone();
            caches.open(SHELL).then((c) => c.put('./', copy));
          }
          return res;
        })
        .catch(() => caches.match('./', { ignoreSearch: true }).then((r) => r || caches.match('index.html'))),
    );
    return;
  }
  // Hashed bundles and precached files: cache first. Other images: cache as they are used.
  e.respondWith(cacheFirst(req, path.startsWith('img/') || path.startsWith('carved/') ? RUNTIME : SHELL));
});

function cacheFirst(req, cacheName) {
  return caches.match(req).then(
    (hit) =>
      hit ||
      fetch(req).then((res) => {
        if (res.ok || res.type === 'opaque') {
          const copy = res.clone();
          caches.open(cacheName).then((c) => c.put(req, copy));
        }
        return res;
      }),
  );
}
