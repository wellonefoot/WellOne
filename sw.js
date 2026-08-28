'use strict';

const CACHE_VERSION = 'wellone-customer-v83-stable-navigation';
const SHELL_CACHE = `${CACHE_VERSION}-shell`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;
const HTML_PAGES = [
  '/', '/index.html', '/catalog.html', '/product.html', '/cart.html', '/offers.html',
  '/orders.html', '/order-confirmed.html', '/about.html', '/contact.html'
];
const SHELL = [
  './', './index.html', './catalog.html', './product.html', './cart.html', './offers.html',
  './orders.html', './order-confirmed.html', './about.html', './contact.html',
  './css/style.css?v=83', './js/store.bundle.js?v=83', './js/basic.bundle.js?v=83',
  './js/orders.bundle.js?v=83', './js/pwa-install.js?v=83', './manifest.webmanifest',
  './assets/logo.png?v=83', './assets/favicon/favicon.ico'
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL_CACHE);
    // One optional file must never prevent the whole worker from installing.
    await Promise.allSettled(SHELL.map(url => cache.add(url)));
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

function urlOf(request){ try { return new URL(request.url); } catch(_e) { return null; } }
function isSupabaseHost(url){ return Boolean(url && url.hostname.endsWith('.supabase.co')); }
function isPublicStorage(url){ return Boolean(url && url.pathname.includes('/storage/v1/object/public/')); }
function isSupabaseApi(url){ return isSupabaseHost(url) && !isPublicStorage(url); }
function isKnownHtml(url){
  if(!url || url.origin !== self.location.origin) return false;
  const scopePath = new URL(self.registration.scope).pathname.replace(/\/$/, '');
  let path = url.pathname;
  if(scopePath && scopePath !== '/' && path.startsWith(scopePath)) path = path.slice(scopePath.length) || '/';
  return HTML_PAGES.includes(path) || (path.endsWith('/') && HTML_PAGES.includes('/'));
}
function canonicalHtmlRequest(request){
  const url = urlOf(request);
  if(!url) return request;
  url.search = '';
  url.hash = '';
  return new Request(url.href, {method:'GET', headers:{'Accept':'text/html'}});
}
async function trimCache(cacheName, maxEntries = 180){
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if(keys.length > maxEntries){
    await Promise.all(keys.slice(0, keys.length - maxEntries).map(key => cache.delete(key)));
  }
}
async function saveRuntime(request, response){
  if(!response || !(response.ok || response.type === 'opaque')) return;
  const cache = await caches.open(RUNTIME_CACHE);
  await cache.put(request, response.clone()).catch(() => {});
  trimCache(RUNTIME_CACHE).catch(() => {});
}
async function cacheFirst(request){
  const cached = await caches.match(request);
  if(cached) return cached;
  const response = await fetch(request);
  saveRuntime(request, response).catch(() => {});
  return response;
}
async function staleWhileRevalidate(request){
  const cached = await caches.match(request);
  const networkPromise = fetch(request).then(response => {
    saveRuntime(request, response).catch(() => {});
    return response;
  }).catch(() => null);
  if(cached){
    networkPromise.catch(() => {});
    return cached;
  }
  const network = await networkPromise;
  if(network) return network;
  throw new Error('Network unavailable');
}
async function pageNavigation(request){
  const canonical = canonicalHtmlRequest(request);
  const cached = (await caches.match(canonical)) || (await caches.match(request, {ignoreSearch:true}));

  // Static WellOne pages are versioned by the service worker itself. Serve their cached HTML
  // immediately, then refresh that exact page in the background. Never substitute index.html.
  if(isKnownHtml(urlOf(request)) && cached){
    fetch(request, {cache:'no-cache'}).then(response => {
      if(response && response.ok){
        caches.open(SHELL_CACHE).then(cache => cache.put(canonical, response.clone())).catch(() => {});
      }
    }).catch(() => {});
    return cached;
  }

  // First visit to a page: network first, then cache the canonical HTML without its query string.
  try{
    const response = await fetch(request, {cache:'no-cache'});
    if(response && response.ok){
      const cache = await caches.open(SHELL_CACHE);
      cache.put(canonical, response.clone()).catch(() => {});
    }
    return response;
  }catch(error){
    if(cached) return cached;
    return new Response(
      '<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>Wellone</title><style>body{font-family:system-ui;margin:0;padding:32px;color:#20251a;background:#fff}main{max-width:520px;margin:auto}a{color:#627c1e}</style><main><h1>Connection unavailable</h1><p>This page is not cached yet. Check your connection and try again.</p><p><a href="./index.html">Go to Wellone home</a></p></main>',
      {status:503, headers:{'Content-Type':'text/html; charset=utf-8'}}
    );
  }
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if(request.method !== 'GET') return;
  const url = urlOf(request);
  if(!url) return;

  if(request.mode === 'navigate'){
    event.respondWith(pageNavigation(request));
    return;
  }

  // API/data calls must remain live. Public product images are safe to cache.
  if(isSupabaseApi(url)){
    event.respondWith(fetch(request, {cache:'no-store'}));
    return;
  }

  const sameOrigin = url.origin === self.location.origin;
  const versioned = sameOrigin && /(?:\?|&)v=83(?:&|$)/.test(url.search);
  const staticAsset = sameOrigin && ['script','style','manifest','font'].includes(request.destination);
  const image = request.destination === 'image' || isPublicStorage(url);
  const cdnScript = url.hostname === 'cdn.jsdelivr.net';

  if(versioned || staticAsset || cdnScript){
    event.respondWith(cacheFirst(request));
    return;
  }
  if(image || sameOrigin){
    event.respondWith(staleWhileRevalidate(request));
  }
});
