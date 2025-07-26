const CACHE_NAME = "isha-gram-v1";
// const urlsToCache = [
//   "/",
//   "/manifest.json",
//   "/en",
//   "/en/auth/login",
//   "/en/auth/complete-profile",
//   "/en/admin/dashboard",
//   "/en/captain/dashboard",
//   "/en/volunteer/dashboard",
//   "/en/volunteer-technical/dashboard",
//   "/en/player/dashboard",
//   "/en/guest/dashboard",
//   "/locales/en.json",
//   "/locales/ta.json",
//   "/locales/hi.json",
//   "/locales/ml.json",
//   "/locales/te.json",
//   "/locales/kn.json",
//   "/locales/or.json",
//   "/icons/icon-192x192.png",
//   "/icons/icon-512x512.png",
// ];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});