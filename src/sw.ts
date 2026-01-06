/// <reference lib="WebWorker" />

declare let self: ServiceWorkerGlobalScope;

// Workbox imports are replaced/bundled by vite-plugin-pwa injectManifest
import { cleanupOutdatedCaches, precacheAndRoute, createHandlerBoundToURL } from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { StaleWhileRevalidate, CacheFirst } from 'workbox-strategies';

// Precache self.__WB_MANIFEST
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST || []);

// Offline fallback for navigation requests
try {
  const handler = createHandlerBoundToURL('/offline.html');
  const navRoute = new NavigationRoute(handler, {
    denylist: [/^\/api\//],
  });
  registerRoute(navRoute);
} catch {}

// Runtime caching similar to vite.config.js setup
registerRoute(
  ({ request }) => ['style', 'script', 'worker'].includes(request.destination),
  new StaleWhileRevalidate({ cacheName: 'assets-cache' })
);

registerRoute(
  ({ request }) => request.destination === 'image',
  new StaleWhileRevalidate({ cacheName: 'images-cache' })
);

registerRoute(
  ({ url }) => /^(https:\/\/fonts\.(?:googleapis|gstatic)\.com)\/.*/.test(url.href),
  new CacheFirst({ cacheName: 'google-fonts' })
);

registerRoute(
  ({ url }) => /^https:\/\/firebasestorage\.googleapis\.com\/.*/.test(url.href),
  new StaleWhileRevalidate({ cacheName: 'firebase-storage' })
);

registerRoute(
  ({ url }) => /^(https:\/\/maps\.googleapis\.com|https:\/\/maps\.gstatic\.com)\/.*/.test(url.href),
  new StaleWhileRevalidate({ cacheName: 'google-maps' })
);

// Background Sync relay: we don't upload from SW; we wake the app to process queue
self.addEventListener('sync', (event: any) => {
  if (event.tag === 'upload-recordings') {
    event.waitUntil(
      (async () => {
        const clientsList = await (self as any).clients.matchAll({ includeUncontrolled: true, type: 'window' });
        for (const client of clientsList) {
          client.postMessage({ type: 'sw-sync:upload-recordings' });
        }
      })()
    );
  }
});
