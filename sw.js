const SHELL_CACHE = "cnpc-shell-v2";
const LEGACY_CACHES = ["cnpc-offline-meta-v1", "cnpc-data-v3"];
const BASE_PATH = new URL("./", self.location.href).pathname;

function sameOrigin(url) {
  return url.origin === self.location.origin;
}

function isProtectedData(url) {
  const relative = url.pathname.startsWith(BASE_PATH) ? url.pathname.slice(BASE_PATH.length) : "";
  return relative.startsWith("data/") || relative.startsWith("assets/materials/") || /\.(?:json|png|jpe?g|gif|webp|avif)$/i.test(relative);
}

function isShellAsset(url) {
  const relative = url.pathname.startsWith(BASE_PATH) ? url.pathname.slice(BASE_PATH.length) : "";
  return /\.(?:css|js|svg|ico|woff2?|webmanifest)$/i.test(relative);
}

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    for (const name of await caches.keys()) {
      if (name.startsWith("cnpc-pack-v1-") || LEGACY_CACHES.includes(name) || (name.startsWith("cnpc-shell-") && name !== SHELL_CACHE)) {
        await caches.delete(name);
      }
    }
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (!sameOrigin(url) || isProtectedData(url) || !isShellAsset(url)) return;

  event.respondWith((async () => {
    try {
      const response = await fetch(request);
      if (response.ok && response.type !== "opaque") {
        const cache = await caches.open(SHELL_CACHE);
        await cache.put(request, response.clone());
      }
      return response;
    } catch {
      const cached = await caches.match(request);
      if (cached) return cached;
      return new Response("当前网络不可用，请连接网络后重试。", {
        status: 503,
        headers: { "content-type": "text/plain; charset=utf-8" },
      });
    }
  })());
});
