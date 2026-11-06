/* DELTARUNE PWA service worker
   Cache only the lightweight app shell. Large game data, WASM and chapter files
   remain network-loaded so the PWA does not silently consume huge storage. */
const CACHE_NAME = "deltarune-shell-v1";
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icons/deltarune-app.svg"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Do not cache game payloads: they can be very large and change independently.
  if (/\\.(?:data|wasm|unx|part\\d+|mp3|ogg|wav|mp4|webm)(?:$|\\?)/i.test(url.pathname)) return;

  // Network-first for the document so game updates are picked up; fall back to
  // the cached shell when offline. Other small same-origin files use cache-first.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).then(response => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put("./index.html", copy));
        }
        return response;
      }).catch(() => caches.match("./index.html"))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(cached => cached || fetch(request).then(response => {
      if (response.ok && url.pathname.startsWith(new URL("./", self.registration.scope).pathname)) {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
      }
      return response;
    }))
  );
});
