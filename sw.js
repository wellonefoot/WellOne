const CACHE_VERSION = 'wellone-customer-v63-auto-live';
const SHELL_CACHE = `${CACHE_VERSION}-shell`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;
const SHELL_ASSETS = [
  './', './index.html', './catalog.html', './product.html', './cart.html', './about.html', './contact.html',
  './css/style.css?v=63', './js/config.js?v=50', './js/cart.js?v=56', './js/supabase-data.js?v=63', './js/app.js?v=63', './js/pwa-install.js?v=62',
  './manifest.webmanifest', './assets/logo.png?v=50', './assets/favicon/favicon.ico', './assets/favicon/wellone-icon-192-v46.png', './assets/favicon/wellone-icon-512-v46.png', './assets/favicon/wellone-icon-192-maskable-v46.png', './assets/favicon/wellone-icon-512-maskable-v46.png'
];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(SHELL_CACHE).then(cache => cache.addAll(SHELL_ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => !key.startsWith(CACHE_VERSION)).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
function isRuntimeAsset(request){
  const url = new URL(request.url);
  return request.method === 'GET' && (
    url.origin === location.origin ||
    url.hostname.includes('cdn.jsdelivr.net') ||
    url.pathname.includes('/storage/v1/object/public/')
  );
}
function isSupabaseApi(request){
  const url = new URL(request.url);
  return url.hostname.includes('supabase.co') && (url.pathname.includes('/rest/v1/') || url.pathname.includes('/auth/v1/'));
}
async function trimRuntimeCache(maxItems = 260){
  const cache = await caches.open(RUNTIME_CACHE);
  const keys = await cache.keys();
  if(keys.length <= maxItems) return;
  await Promise.all(keys.slice(0, keys.length - maxItems).map(key => cache.delete(key)));
}
async function staleWhileRevalidate(request){
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await cache.match(request);
  const networkPromise = fetch(request).then(response => {
    if(response && (response.ok || response.type === 'opaque')){
      cache.put(request, response.clone()).then(() => trimRuntimeCache()).catch(()=>{});
    }
    return response;
  }).catch(() => cached);
  return cached || networkPromise;
}
self.addEventListener('fetch', event => {
  const request = event.request;
  if(request.mode === 'navigate'){
    event.respondWith(fetch(request).then(response => {
      const copy = response.clone();
      caches.open(RUNTIME_CACHE).then(cache => cache.put(request, copy)).catch(()=>{});
      return response;
    }).catch(async () => {
      const exact = await caches.match(request);
      if(exact) return exact;
      const url = new URL(request.url);
      const page = url.pathname.split('/').pop() || 'index.html';
      return (await caches.match('./' + page)) || caches.match('./index.html');
    }));
    return;
  }
  if(isSupabaseApi(request)){
    event.respondWith(fetch(request, {cache:'no-store'}));
    return;
  }
  if(isRuntimeAsset(request)) event.respondWith(staleWhileRevalidate(request));
});
