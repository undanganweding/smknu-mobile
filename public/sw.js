/**
 * Guru Offline - Service Worker for PWA Offline Hardening
 * Cache Version: v1.0.0
 */

const CACHE_NAME = 'guru-offline-cache-v1.0.0'
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/src/assets/images/favicon.ico',
  '/src/assets/images/common/logo.webp'
]

// Install Event: Cache app shell assets
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing version: v1.0.0')
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching app shell assets')
        return cache.addAll(ASSETS_TO_CACHE)
      })
      .then(() => self.skipWaiting())
  )
})

// Activate Event: Cleanup stale caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating')
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('[Service Worker] Removing stale cache:', cacheName)
              return caches.delete(cacheName)
            }
          })
        )
      })
      .then(() => self.clients.claim())
  )
})

// Fetch Event: Cache-first/network-fallback with SPA navigation fallback
self.addEventListener('fetch', (event) => {
  const request = event.request
  const url = new URL(request.url)

  // Do NOT cache dynamic sensitive API requests or Google Apps Script requests
  if (
    url.pathname.startsWith('/api') ||
    url.hostname.includes('script.google.com') ||
    url.hostname.includes('sheets.googleapis.com')
  ) {
    return // Let browser handle it over the network directly
  }

  // Only handle GET requests
  if (request.method !== 'GET') {
    return
  }

  // Handle SPA navigation requests: Fallback to index.html if network/cache fail
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => {
        console.log('[Service Worker] Navigation failed, serving index.html fallback')
        return caches.match('/index.html') || caches.match('/')
      })
    )
    return
  }

  // Default: Cache-first for static assets, network fallback
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse
      }

      return fetch(request)
        .then((networkResponse) => {
          // Only cache valid standard GET responses for static files
          // Do NOT cache Vite development-only files, source files, or hot-module-replacement chunks
          if (
            networkResponse &&
            networkResponse.status === 200 &&
            networkResponse.type === 'basic' &&
            !url.pathname.includes('/api/') &&
            !url.pathname.startsWith('/src/') &&
            !url.pathname.includes('node_modules') &&
            !url.pathname.includes('@vite') &&
            !url.pathname.includes('@id') &&
            !url.pathname.includes('hot-update') &&
            !url.pathname.endsWith('.vue') &&
            !url.search.includes('vue&type')
          ) {
            const responseToCache = networkResponse.clone()
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache)
            })
          }
          return networkResponse
        })
        .catch((err) => {
          console.warn('[Service Worker] Fetch failed for:', request.url, err)
          // Return fallback if asset is image
          if (request.headers.get('accept')?.includes('image')) {
            return caches.match('/src/assets/images/common/logo.webp')
          }
        })
    })
  )
})
