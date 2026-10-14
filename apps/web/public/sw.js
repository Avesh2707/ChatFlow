const CACHE_NAME = "chatflow-shell-v1";
const OFFLINE_FALLBACK = "/offline.html";

// Only cache static shell assets - NEVER cache API responses, cookies, or messages!
const PRECACHE_ASSETS = [
  "/",
  "/manifest.webmanifest",
  "/offline.html",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => caches.delete(name))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Security rule: NEVER intercept or cache authenticated API routes or socket connections
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/socket.io/") ||
    url.port === "5000" ||
    event.request.method !== "GET"
  ) {
    return;
  }

  // Network-first navigation strategy with clean offline fallback
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match(OFFLINE_FALLBACK).then((res) => {
          return (
            res ||
            new Response(
              "<!DOCTYPE html><html><body style='background:#0f172a;color:#fff;font-family:sans-serif;padding:2rem;text-align:center;'><h2>ChatFlow is Offline</h2><p>Please check your internet connection.</p></body></html>",
              { headers: { "Content-Type": "text/html" } }
            )
          );
        });
      })
    );
    return;
  }

  // Cache-first for static local assets
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((networkResponse) => {
        // Cache static font and icon files dynamically if successful
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          (url.pathname.startsWith("/icons/") || url.pathname.endsWith(".ico"))
        ) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return networkResponse;
      });
    })
  );
});
