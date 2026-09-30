// Service worker, generated at build time from src/sw-template.js (see vite.config.ts).
const VERSION = 'd1186125d3';
const SHELL = 'zurafa-shell-' + VERSION;
const RUNTIME = 'zurafa-runtime';
const PRECACHE = ["./","./assets/index-DdAYAY-a.js","./assets/course-DnNI-z3v.js","./assets/dist-DvjAMUvs.js","./assets/lesson-gK_dJiuU.js","./assets/index-Ko0KZYUJ.css","./assets/worker-B30dwOsx.js","./carved/b-advKing.png","./carved/b-camel.png","./carved/b-elephant.png","./carved/b-engine.png","./carved/b-general.png","./carved/b-giraffe.png","./carved/b-king.png","./carved/b-knight.png","./carved/b-pawn.png","./carved/b-picket.png","./carved/b-prince.png","./carved/b-rook.png","./carved/b-vizier.png","./carved/w-advKing.png","./carved/w-camel.png","./carved/w-elephant.png","./carved/w-engine.png","./carved/w-general.png","./carved/w-giraffe.png","./carved/w-king.png","./carved/w-knight.png","./carved/w-pawn.png","./carved/w-picket.png","./carved/w-prince.png","./carved/w-rook.png","./carved/w-vizier.png","./favicon.svg","./img/icon-192.png","./img/icon-512.png","./img/m-draw.jpg","./img/m-loss.jpg","./img/m-win.jpg","./img/p-advKing.jpg","./img/p-camel.jpg","./img/p-elephant.jpg","./img/p-engine.jpg","./img/p-general.jpg","./img/p-giraffe.jpg","./img/p-king.jpg","./img/p-knight.jpg","./img/p-pawn.jpg","./img/p-pawnPawn.jpg","./img/p-picket.jpg","./img/p-prince.jpg","./img/p-rook.jpg","./img/p-vizier.jpg","./manifest.webmanifest"];

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

  // The page itself: fresh when online, the cached shell when offline.
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(SHELL).then((c) => c.put('./', copy));
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
