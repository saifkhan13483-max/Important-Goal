/**
 * Strivo Service Worker
 *
 * Strategy:
 *  - HTML / navigation requests → Network-first, fallback to cache.
 *    This ensures new deployments are always picked up immediately.
 *    Users never see stale HTML that references missing JS/CSS bundles.
 *
 *  - Versioned JS/CSS assets (/assets/...) → Cache-first.
 *    Safe because Vite appends a content hash to every filename.
 *    When code changes, the filename changes, so cache is automatically bypassed.
 *
 *  - Everything else → Network-only (Firebase, APIs, fonts, CDN).
 *    Do not cache third-party or dynamic content.
 */

const CACHE_VERSION = "strivo-v3";
const ASSET_CACHE   = "strivo-assets-v3";

// ─── Install ─────────────────────────────────────────────────────────────────
// Skip waiting so the new SW takes over immediately instead of waiting for all
// tabs using the old SW to close.
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) =>
      cache.addAll(["/manifest.json", "/favicon.png", "/favicon.ico"])
    )
  );
  self.skipWaiting();
});

// ─── Activate ────────────────────────────────────────────────────────────────
// Delete every cache that doesn't match our current version names.
self.addEventListener("activate", (event) => {
  const VALID = new Set([CACHE_VERSION, ASSET_CACHE]);
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => !VALID.has(k)).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// ─── Fetch ───────────────────────────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // Never intercept third-party requests, API calls, or dev tooling
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;
  if (url.pathname.includes("__replco")) return;
  if (url.pathname.includes("__vite")) return;

  // ── Versioned assets: cache-first ──────────────────────────────────────────
  // Vite puts all built JS/CSS under /assets/ with a content hash in the name.
  // These files are immutable for a given deployment, so cache-first is safe.
  if (url.pathname.startsWith("/assets/")) {
    event.respondWith(
      caches.open(ASSET_CACHE).then(async (cache) => {
        const cached = await cache.match(event.request);
        if (cached) return cached;
        const fresh = await fetch(event.request);
        if (fresh.ok) cache.put(event.request, fresh.clone());
        return fresh;
      })
    );
    return;
  }

  // ── HTML / navigation: network-first ───────────────────────────────────────
  // Always try the network so new deployments are reflected immediately.
  // Only fall back to the cached version when the user is genuinely offline.
  if (
    event.request.mode === "navigate" ||
    event.request.headers.get("accept")?.includes("text/html")
  ) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Cache the fresh HTML for offline fallback
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_VERSION).then((cache) =>
              cache.put(event.request, clone)
            );
          }
          return response;
        })
        .catch(() =>
          // Offline fallback: serve cached HTML or the root page
          caches.match(event.request).then((cached) =>
            cached || caches.match("/")
          )
        )
    );
    return;
  }

  // ── Small static files (manifest, favicon): network-first ──────────────────
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});

// ─── Message handler ─────────────────────────────────────────────────────────
// Allows the app to force the SW to skip waiting (e.g. after user confirms
// "Update available — reload?").
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
