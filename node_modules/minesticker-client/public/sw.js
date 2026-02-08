const CACHE_VERSION = "minesticker-v3";
const CORE_ASSETS = [
  "/",
  "/index.html",
  "/manifest.webmanifest",
  "/chartdl.png",
  "/MineTextures.png",
  "/MineTextures2x.png",
  "/idle.png",
  "/intro.png",
  "/walk.png",
  "/chillwalk.png",
  "/panic.png",
  "/dead.png",
  "/placeflag.png",
  "/cheer.png",
  "/diagonal.png",
  "/jump.png",
  "/scorch.png",
  "/kaboom.png",
  "/kaboom.wav",
  "/placeflag.wav",
  "/chillwalk.wav",
  "/steponblock.wav",
  "/whoosh.wav"
];

const normalizePath = (filePath) => (filePath.startsWith("/") ? filePath : `/${filePath}`);

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then(async (cache) => {
      await Promise.all(CORE_ASSETS.map((url) => cache.add(url).catch(() => undefined)));

      try {
        const manifestResponse = await fetch("/manifest.json", { cache: "no-store" });
        if (manifestResponse.ok) {
          const manifest = await manifestResponse.json();
          const files = Object.values(manifest).flatMap((entry) => {
            const collected = [entry.file];
            if (entry.css) collected.push(...entry.css);
            if (entry.assets) collected.push(...entry.assets);
            return collected;
          });
          await Promise.all(
            files.map((file) => cache.add(normalizePath(file)).catch(() => undefined))
          );
        }
      } catch {
        // Optional manifest; keep install resilient.
      }
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_VERSION)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      caches.match("/").then((cached) => {
        if (cached) return cached;

        return fetch(request)
          .then((response) => {
            const responseClone = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put("/", responseClone));
            return response;
          })
          .catch(() =>
            caches.match("/index.html").then((fallback) => fallback || new Response("", { status: 503 }))
          );
      })
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;

      return fetch(request)
        .then((response) => {
          if (!response || response.status !== 200 || response.type === "opaque") {
            return response;
          }

          const responseClone = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(request, responseClone));
          return response;
        })
        .catch(() => new Response("", { status: 504 }));
    })
  );
});
