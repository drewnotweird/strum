// Strum service worker: makes the app work offline and installable.
// - Pages: network first, so a new deploy shows up straight away; the cached copy when offline
// - Built files (hashed names, never change): cache first
// - Fonts and images: from cache, refreshed in the background
const CACHE = 'strum-v1'
const BASE = new URL('./', self.location).pathname

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll([BASE, `${BASE}favicon.png`, `${BASE}manifest.webmanifest`]))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

const fromCache = (request) => caches.match(request)

async function networkFirst(request) {
  try {
    const response = await fetch(request)
    // Every page is the same app shell, so one cached copy covers them all offline
    if (response.ok) (await caches.open(CACHE)).put(BASE, response.clone())
    return response
  } catch {
    return (await caches.match(BASE)) || Response.error()
  }
}

async function cacheFirst(request) {
  const cached = await fromCache(request)
  if (cached) return cached
  const response = await fetch(request)
  if (response.ok) (await caches.open(CACHE)).put(request, response.clone())
  return response
}

async function staleWhileRevalidate(request) {
  const cached = await fromCache(request)
  const fresh = fetch(request)
    .then(async (response) => {
      if (response.ok || response.type === 'opaque') (await caches.open(CACHE)).put(request, response.clone())
      return response
    })
    .catch(() => cached)
  return cached || fresh
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)

  if (request.mode === 'navigate' && url.pathname.startsWith(BASE)) {
    event.respondWith(networkFirst(request))
  } else if (url.origin === self.location.origin && url.pathname.startsWith(`${BASE}assets/`)) {
    event.respondWith(cacheFirst(request))
  } else if (url.origin === self.location.origin && url.pathname.startsWith(BASE)) {
    event.respondWith(staleWhileRevalidate(request))
  } else if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(staleWhileRevalidate(request))
  }
})
