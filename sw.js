// Offline support for the installed app. Network first, so an online player always gets the current
// files; the cache is only the fallback when offline. Every file the game loads must be listed in
// FILES (tests/browser-pwa.cjs checks this); bump VERSION when the list changes.
const VERSION = "libre-transport-v2";
const FILES = [
  "./",
  "index.html",
  "help.html",
  "styles.css",
  "manifest.webmanifest",
  "src/vendor/three-0.164.1.min.js",
  "src/vendor/pathfinding-0.4.18.min.js",
  "src/vendor/simplex-noise-4.0.3.min.js",
  "src/landscape.js",
  "src/assets/models.js",
  "src/models.js",
  "src/towns.js",
  "src/railway.js",
  "src/construction.js",
  "src/physics.js",
  "src/game.js",
  "src/management.js",
  "src/tasks.js",
  "src/assets/icons/app-192.png",
  "src/assets/icons/app-512.png",
  "src/assets/icons/arrow-left-right.svg",
  "src/assets/icons/eye.svg",
  "src/assets/icons/locate-fixed.svg",
  "src/assets/icons/log-out.svg"
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(VERSION).then(cache => cache.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", event => {
  event.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(key => key !== VERSION).map(key => caches.delete(key))))
    .then(() => self.clients.claim()));
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET" || new URL(request.url).origin !== location.origin) return;
  event.respondWith(fetch(request).then(response => {
    if (response.ok) {
      const copy = response.clone();
      caches.open(VERSION).then(cache => cache.put(request, copy));
    }
    return response;
  }).catch(() => caches.match(request, { ignoreSearch: true })
    .then(cached => cached || (request.mode === "navigate" ? caches.match("index.html") : Response.error()))));
});
