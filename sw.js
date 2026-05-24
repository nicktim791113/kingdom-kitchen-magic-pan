const CACHE_NAME = "kingdom-kitchen-pwa-v3-20260525-assets";

const PRECACHE_URLS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./assets/icons/apple-touch-icon.png",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png",
  "./assets/icons/maskable-icon-512.png",
  "./assets/sprites/characters/chef.png",
  "./assets/sprites/characters/knight.png",
  "./assets/sprites/characters/prince.png",
  "./assets/sprites/characters/princess.png",
  "./assets/sprites/characters/wizard.png",
  "./assets/sprites/environment/kitchen.png",
  "./assets/sprites/environment/pot.png",
  "./assets/sprites/environment/soup-bowl.png",
  "./assets/sprites/fruit/apple.png",
  "./assets/sprites/fruit/banana.png",
  "./assets/sprites/fruit/carrot.png",
  "./assets/sprites/fruit/orange.png",
  "./assets/sprites/fruit/strawberry.png",
  "./assets/sprites/prep/apple-slices.png",
  "./assets/sprites/prep/banana-peeled.png",
  "./assets/sprites/prep/carrot-pieces.png",
  "./assets/sprites/prep/orange-wedges.png",
  "./assets/sprites/prep/strawberry-clean.png",
  "./assets/sprites/vegetables/tomato.png",
  "./assets/sprites/vegetables/corn.png",
  "./assets/sprites/vegetables/mushroom.png",
  "./assets/sprites/prep-vegetables/tomato-slices.png",
  "./assets/sprites/prep-vegetables/corn-pieces.png",
  "./assets/sprites/prep-vegetables/mushroom-slices.png",
  "./assets/sprites/ui/flame.png",
  "./assets/sprites/ui/restart.png",
  "./assets/sprites/ui/sound.png",
  "./assets/sprites/ui/star-sparkle.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => Promise.all(
        cacheNames
          .filter((cacheName) => cacheName !== CACHE_NAME)
          .map((cacheName) => caches.delete(cacheName))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) return;

  if (event.request.mode === "navigate") {
    event.respondWith(networkFirstPage(event.request));
    return;
  }

  event.respondWith(cacheFirst(event.request));
});

async function networkFirstPage(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (response.ok) {
      await cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cachedPage = await caches.match(request, { ignoreSearch: true });
    return cachedPage || caches.match("./index.html");
  }
}

async function cacheFirst(request) {
  const cachedResponse = await caches.match(request, { ignoreSearch: true });
  if (cachedResponse) return cachedResponse;

  const cache = await caches.open(CACHE_NAME);
  const response = await fetch(request);
  if (response.ok) {
    await cache.put(request, response.clone());
  }
  return response;
}
