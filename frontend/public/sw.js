// Bump CACHE_NAME any time you change shell behavior so old clients update.
const CACHE_NAME = "stockstar-shell-v3";
const APP_SHELL = [
  "/",
  "/manifest.webmanifest",
  "/icons/favicon-192x192.png",
  "/icons/favicon-512x512.png",
  "/icons/icon.svg",
  "/icons/maskable-icon.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)),
      ),
    ),
  );
  self.clients.claim();
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // NEVER intercept API calls — they need the App-Token header that the page
  // attaches and they must NOT be cached (auth + freshness).
  if (url.pathname.startsWith("/api/")) {
    return;
  }

  if (request.method !== "GET") {
    return;
  }

  // SPA navigations: try network, fall back to cached shell offline.
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match("/")));
    return;
  }

  // Static assets: cache-first.
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((response) => {
          // Only cache successful, basic same-origin responses.
          if (response.ok && response.type === "basic") {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);
    }),
  );
});
