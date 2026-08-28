/* Coopercabana service worker — app-shell caching for the stag app.
 *
 * Strategy (v2):
 *  - Install: precache the shell (root page + icons), then skip waiting so a
 *    fresh SW takes over immediately.
 *  - Content-hashed build assets (/_next/static/...): cache-first with
 *    background refresh — instant repeat loads, offline shell. Safe because
 *    filenames change on every deploy, so a stale entry is never reused.
 *  - EVERYTHING else same-origin (page navigations, the RSC payload fetches
 *    Next.js uses for client-side navigation, images): network-first, with the
 *    cache as an offline fallback. This is what keeps live data (flights,
 *    schedule, money) fresh — previously these were served cache-first, so a
 *    homescreen app kept showing yesterday's data until it happened to re-fetch.
 *  - Cross-origin (Supabase API, currency API): never cached, network only.
 */

const CACHE = 'coopercabana-v2';
const SHELL = [
  '/',
  '/manifest.webmanifest',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-maskable-512.png',
  '/apple-touch-icon.png',
  '/coopercabana.png',
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .catch(() => {}) // first-ever install may be offline; don't fail it
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Immutable, content-hashed build assets: serve the cached copy instantly and
// refresh it in the background. On a cache miss it falls straight through to
// the network, so new deployments (new filenames) are never blocked.
async function cacheFirst(request) {
  const cached = await caches.match(request);
  const fetched = fetch(request)
    .then((res) => {
      if (res && res.status === 200) {
        const copy = res.clone();
        caches.open(CACHE).then((cache) => cache.put(request, copy));
      }
      return res;
    })
    .catch(() => cached);
  return cached || fetched;
}

// Everything dynamic (pages + RSC data fetches): always hit the network for
// live data; fall back to the cached copy only when offline.
async function networkFirst(request) {
  try {
    const res = await fetch(request);
    if (res && res.status === 200) {
      const copy = res.clone();
      caches.open(CACHE).then((cache) => cache.put(request, copy));
    }
    return res;
  } catch {
    return (await caches.match(request)) || (await caches.match('/'));
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // API calls: network only

  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(cacheFirst(request));
    return;
  }

  event.respondWith(networkFirst(request));
});
