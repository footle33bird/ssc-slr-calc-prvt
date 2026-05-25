/**
 * Service worker — keeps every visitor on the latest version of the site.
 *
 * Strategy: NETWORK-FIRST for everything on this site.
 *   • Each request goes to the server first, bypassing the browser HTTP cache
 *     ({cache:"no-store"}), so users always get the newest files you pushed.
 *   • A copy is stored only as an OFFLINE fallback (used when the network fails).
 *   • Old caches are wiped automatically whenever this worker updates.
 *
 * Because it's network-first, you normally never need to touch this file again.
 * (Bumping VERSION just forces a one-time cleanup of the offline cache.)
 */
const VERSION = "2026-05-25";
const CACHE = "site-cache-" + VERSION;

// A fresh install (no previous worker) activates right away; an *update*
// waits until the page tells us to take over (via the Refresh banner).
self.addEventListener("install", () => {
  if (!self.registration.active) self.skipWaiting();
});

// The page posts this when the user clicks "Refresh" on the update banner.
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

// On activate: delete any cache that isn't the current version, then take control.
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
  if (req.method !== "GET") return; // only handle simple reads

  const url = new URL(req.url);
  // Leave cross-origin traffic alone (YouTube, fonts, archive.org, search APIs).
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    (async () => {
      try {
        // Always try the network first, bypassing the browser's HTTP cache.
        const fresh = await fetch(req, { cache: "no-store" });
        // Stash a copy for offline use (ignore failures, e.g. opaque responses).
        try {
          const cache = await caches.open(CACHE);
          cache.put(req, fresh.clone());
        } catch (e) {}
        return fresh;
      } catch (err) {
        // Offline / network error → serve the last cached copy if we have one.
        const cached = await caches.match(req);
        if (cached) return cached;
        // For page navigations with nothing cached, fall back to index.html.
        if (req.mode === "navigate") {
          const home = await caches.match("./index.html");
          if (home) return home;
        }
        throw err;
      }
    })(),
  );
});
