/* DELTARUNE PWA service worker
   Cache only the lightweight app shell. Game data, WASM, chapter files and
   external libraries remain network-loaded to avoid filling device storage. */
const CACHE_NAME = "deltarune-shell-v2";
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
  if (url.origin !== self.location.origin || request.mode !== "navigate") return;

  // The game itself still needs its large runtime/chapter files from the network.
  event.respondWith(
    fetch(request).catch(() => caches.match("./index.html"))
  );
});
