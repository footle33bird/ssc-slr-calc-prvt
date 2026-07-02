
const VERSION = "2026-05-27";
const CACHE = "site-cache-" + VERSION;

self.addEventListener("install", () => {
  if (!self.registration.active) self.skipWaiting();
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return; 

  const url = new URL(req.url);
  
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    (async () => {
      try {
        
        const fresh = await fetch(req, { cache: "no-store" });
        
        try {
          const cache = await caches.open(CACHE);
          cache.put(req, fresh.clone());
        } catch (e) {}
        return fresh;
      } catch (err) {
        
        const cached = await caches.match(req);
        if (cached) return cached;
        
        if (req.mode === "navigate") {
          const home = await caches.match("./index.html");
          if (home) return home;
        }
        throw err;
      }
    })(),
  );
});
