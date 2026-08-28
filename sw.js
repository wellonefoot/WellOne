'use strict';

const CACHE_VERSION = 'wellone-customer-v85-safe-assets';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const IMAGE_CACHE = `${CACHE_VERSION}-images`;
const STATIC_FILES = [
  './css/style.css?v=85',
  './js/store.bundle.js?v=85',
  './js/basic.bundle.js?v=85',
  './js/orders.bundle.js?v=85',
  './js/pwa-install.js?v=85',
  './manifest.webmanifest',
  './assets/logo.png?v=85',
  './assets/favicon/favicon.ico'
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(STATIC_CACHE);
    await Promise.allSettled(STATIC_FILES.map(file => cache.add(file)));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys
      .filter(key => key.startsWith('wellone-customer-') && !key.startsWith(CACHE_VERSION))
      .map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

function safeUrl(request){ try { return new URL(request.url); } catch(_e) { return null; } }
function isSupabase(url){ return Boolean(url && url.hostname.endsWith('.supabase.co')); }
function isPublicStorage(url){ return isSupabase(url) && url.pathname.includes('/storage/v1/object/public/'); }

async function cacheFirst(request){
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);
  if(cached) return cached;
  const response = await fetch(request);
  if(response && (response.ok || response.type === 'opaque')) cache.put(request, response.clone()).catch(() => {});
  return response;
}

async function imageCache(request){
  const cache = await caches.open(IMAGE_CACHE);
  const cached = await cache.match(request);
  if(cached) return cached;
  const response = await fetch(request);
  if(response && (response.ok || response.type === 'opaque')) {
    cache.put(request, response.clone()).catch(() => {});
    cache.keys().then(keys => {
      if(keys.length > 160) Promise.all(keys.slice(0, keys.length - 160).map(key => cache.delete(key))).catch(() => {});
    }).catch(() => {});
  }
  return response;
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if(request.method !== 'GET') return;

  // CRITICAL: HTML/document navigation is intentionally NOT intercepted.
  // catalog.html?cat=Bags, product.html?id=..., orders.html, etc. go straight to the host.
  if(request.mode === 'navigate' || request.destination === 'document') return;

  const url = safeUrl(request);
  if(!url) return;

  // Database/auth/realtime traffic must always remain network-fresh and outside SW caching.
  if(isSupabase(url) && !isPublicStorage(url)) return;

  const sameOrigin = url.origin === self.location.origin;
  const isVersionedStatic = sameOrigin && /(?:\?|&)v=85(?:&|$)/.test(url.search) &&
    ['script','style','font','image'].includes(request.destination);
  const isStatic = sameOrigin && ['script','style','font','manifest'].includes(request.destination);
  const isImage = request.destination === 'image' || isPublicStorage(url);
  const isCdnScript = url.hostname === 'cdn.jsdelivr.net' && request.destination === 'script';

  if(isVersionedStatic || isStatic || isCdnScript){
    event.respondWith(cacheFirst(request));
    return;
  }
  if(isImage){
    event.respondWith(imageCache(request));
  }
});
