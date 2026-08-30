'use strict';
const CACHE_VERSION = 'wellone-customer-v98-orders-fullscreen';
const SHELL_CACHE = `${CACHE_VERSION}-shell`;
const IMAGE_CACHE = `${CACHE_VERSION}-images`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

const SHELL_ASSETS = [
  './', './index.html', './catalog.html', './product.html', './cart.html', './offers.html',
  './orders.html', './order-confirmed.html', './about.html', './contact.html', './terms.html', './privacy.html','./shipping.html','./refund.html',
  './css/style.css?v=98', './js/store.bundle.js?v=98', './js/basic.bundle.js?v=98',
  './js/orders.bundle.js?v=98', './js/pwa-install.js?v=98', './manifest.webmanifest',
  './assets/logo.png?v=98', './assets/favicon/favicon.ico',
  './assets/favicon/wellone-icon-192-v46.png', './assets/favicon/wellone-icon-512-v46.png',
  './assets/favicon/wellone-icon-192-maskable-v46.png', './assets/favicon/wellone-icon-512-maskable-v46.png'
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL_CACHE);
    await Promise.allSettled(SHELL_ASSETS.map(asset => cache.add(asset)));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys
      .filter(key => key.startsWith('wellone-customer-') && !key.startsWith(CACHE_VERSION))
      .map(key => caches.delete(key)));
    if(self.registration.navigationPreload){
      try{ await self.registration.navigationPreload.enable(); }catch(_e){}
    }
    await self.clients.claim();
  })());
});

function urlOf(request){ try{ return new URL(request.url); }catch(_e){ return null; } }
function isSupabase(url){ return Boolean(url && url.hostname.endsWith('.supabase.co')); }
function isPublicStorage(url){ return isSupabase(url) && url.pathname.includes('/storage/v1/object/public/'); }
function isSameOriginVersionedCode(request, url){
  if(!url || url.origin !== self.location.origin) return false;
  if(!['script','style','font'].includes(request.destination)) return false;
  return /[?&]v=\d+/.test(url.search);
}
function navigationFallback(request){
  const url = urlOf(request);
  if(!url) return './index.html';
  const page = url.pathname.split('/').pop() || 'index.html';
  return `./${page}`;
}
async function trimCache(name, maxItems){
  const cache = await caches.open(name);
  const keys = await cache.keys();
  if(keys.length <= maxItems) return;
  await Promise.all(keys.slice(0, keys.length - maxItems).map(key => cache.delete(key)));
}
async function cacheFirst(request, cacheName = SHELL_CACHE){
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  if(hit) return hit;
  const response = await fetch(request);
  if(response && (response.ok || response.type === 'opaque')) cache.put(request, response.clone()).catch(()=>{});
  return response;
}
async function staleWhileRevalidate(request, cacheName = IMAGE_CACHE, maxItems = 220){
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  const update = fetch(request).then(response => {
    if(response && (response.ok || response.type === 'opaque')){
      cache.put(request, response.clone()).then(() => trimCache(cacheName, maxItems)).catch(()=>{});
    }
    return response;
  }).catch(() => hit);
  return hit || update;
}
async function networkFirstDocument(request, preloadPromise){
  const cache = await caches.open(SHELL_CACHE);
  try{
    const preloaded = preloadPromise ? await preloadPromise : null;
    const response = preloaded || await fetch(request, {cache:'no-store'});
    if(response && response.ok) cache.put(request, response.clone()).catch(()=>{});
    return response;
  }catch(_error){
    return (await cache.match(request)) || (await cache.match(navigationFallback(request))) || Response.error();
  }
}
async function networkFirst(request, cacheName = RUNTIME_CACHE){
  const cache = await caches.open(cacheName);
  try{
    const response = await fetch(request, {cache:'no-store'});
    if(response && (response.ok || response.type === 'opaque')){
      cache.put(request, response.clone()).then(() => trimCache(cacheName, 80)).catch(()=>{});
    }
    return response;
  }catch(_error){
    return (await cache.match(request)) || Response.error();
  }
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if(request.method !== 'GET') return;
  const url = urlOf(request);
  if(!url) return;

  // Database/auth/realtime/functions must always be live and must never be cached.
  if(isSupabase(url) && !isPublicStorage(url)){
    event.respondWith(fetch(request, {cache:'no-store'}));
    return;
  }

  // Keep HTML fresh. Cache is only a fallback if the network genuinely fails.
  if(request.mode === 'navigate' || request.destination === 'document'){
    event.respondWith(networkFirstDocument(request, event.preloadResponse));
    return;
  }

  // Versioned local JS/CSS is immutable until the version changes, so subsequent pages are instant.
  if(isSameOriginVersionedCode(request, url)){
    event.respondWith(cacheFirst(request, SHELL_CACHE));
    return;
  }

  if(request.destination === 'manifest'){
    event.respondWith(networkFirst(request, RUNTIME_CACHE));
    return;
  }

  // Product/storage images appear instantly from cache and refresh silently in the background.
  if(request.destination === 'image' || isPublicStorage(url)){
    event.respondWith(staleWhileRevalidate(request, IMAGE_CACHE, 220));
    return;
  }

  // Reuse the Supabase CDN library after first load while still refreshing it in the background.
  if(url.hostname === 'cdn.jsdelivr.net' && request.destination === 'script'){
    event.respondWith(staleWhileRevalidate(request, RUNTIME_CACHE, 40));
  }
});
