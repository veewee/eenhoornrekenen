// The deploy workflow replaces __BUILD__ with the commit hash, so every deploy gets a fresh cache.
const CACHE = "eenhoorn-__BUILD__";
const SHELL = [
  "./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png", "./icon-180.png",
  "./js/app.js", "./js/core.js", "./js/world-plusmin.js", "./js/world-tafels.js", "./js/parent.js"
];
// cache: "reload" skips the HTTP cache, otherwise a new worker can store the previous deploy's files.
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL.map(u => new Request(u, {cache: "reload"}))))); self.skipWaiting(); });
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
    const url = new URL(e.request.url);
    if (res.ok || res.type === "opaque") {
      if (url.origin === location.origin || url.host.endsWith("googleapis.com") || url.host.endsWith("gstatic.com")) {
        const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy));
      }
    }
    return res;
  }).catch(() => caches.match("./index.html"))));
});
