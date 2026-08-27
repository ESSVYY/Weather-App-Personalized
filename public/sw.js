const CACHE = "atmos-shell-v3";
self.addEventListener("install", (event) => event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(["/", "/icon.svg"])).then(() => self.skipWaiting())));
self.addEventListener("activate", (event) => event.waitUntil(
  caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith("atmos-shell-") && key !== CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim())
));
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET" || !event.request.url.startsWith(self.location.origin)) return;
  if (event.request.mode === "navigate") {
    event.respondWith(fetch(event.request).then((response) => {
      if (response.ok) event.waitUntil(caches.open(CACHE).then((cache) => cache.put(event.request, response.clone())));
      return response;
    }).catch(async () => (await caches.match(event.request)) || (await caches.match("/"))));
    return;
  }
  event.respondWith(caches.match(event.request).then((cached) => {
    const fresh = fetch(event.request).then((response) => {
      if (response.ok) event.waitUntil(caches.open(CACHE).then((cache) => cache.put(event.request, response.clone())));
      return response;
    }).catch(() => cached);
    return cached || fresh;
  }));
});
