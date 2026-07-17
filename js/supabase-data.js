/* Wellone customer data v69 — admin-success event updates
   Supabase Database + Supabase Storage only.
*/
'use strict';

let categoryCache = null;
let termsCache = null;
let offersCache = null;
const productCacheByKey = new Map();
const FAST_CACHE_MS = 20 * 1000; // instant-render cache; explicit admin events invalidate it
const STORE_CHANNEL_NAME = 'wellone-store-events-v1';
const STORE_EVENT_NAME = 'store-change';
const storeUpdateListeners = new Set();
const subcategoryCache = new Map();
const SUBCATEGORY_CACHE_MS = 5 * 60 * 1000;
let storeRealtimeChannel = null;
let storeRealtimeStatus = 'idle';
let storeUpdateDebounceTimer = null;
const pendingStoreChanges = new Map();
let storeRealtimeRetryTimer = null;
let storeRealtimeConnecting = false;
let storeRealtimeRetryAttempt = 0;
const seenStoreEventIds = new Map();
const PRODUCT_DETAIL_SELECT = `
  id,name,slug,description,mrp,price,main_image_url,status,stock_status,sizes,colors,option_title,terms,created_at,updated_at,sort_order,
  categories(id,name,image_url),
  subcategories(id,name),
  product_images(id,image_url,storage_path,sort_order),
  product_variants(id,label,mrp,price,image_url,image_urls,terms,unit,stock,stock_status,sort_order)
`;
const PRODUCT_LIST_SELECT = `
  id,name,slug,description,mrp,price,main_image_url,status,stock_status,sizes,colors,option_title,terms,created_at,updated_at,sort_order,
  categories(id,name,image_url),
  subcategories(id,name),
  product_variants(id,label,mrp,price,unit,stock,stock_status,sort_order)
`;

function supabaseClient(){
  if(!window.supabase) throw new Error('Supabase library not loaded');
  if(!window.__welloneSupabase){
    window.__welloneSupabase = window.supabase.createClient(SITE_CONFIG.supabaseUrl, SITE_CONFIG.supabaseAnonKey, {
      auth:{persistSession:false, autoRefreshToken:false, detectSessionInUrl:false},
      realtime:{params:{eventsPerSecond:10}}
    });
  }
  return window.__welloneSupabase;
}
function cleanKey(value){ return String(value || '').toLowerCase().trim().replace(/[^a-z0-9]/g, ''); }
function slugify(value){ return String(value || '').toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,''); }
function cleanText(value){ return String(value ?? '').trim(); }
function sameName(a,b){ return cleanText(a).toLowerCase() === cleanText(b).toLowerCase(); }
function normalizePrice(value){ return cleanText(value).replace(/^₹\s*/,'').replace(/,/g,''); }
function money(value){ const n = Number(normalizePrice(value)); return Number.isFinite(n) && n > 0 ? n : 0; }
function formatPrice(value){ const n = money(value); return n ? `₹${n}` : ''; }
function cacheKey(name){ return 'wellone_supabase_v69_' + name; }
function now(){ return Date.now(); }
function readAnyCache(name){ try{ const raw = localStorage.getItem(cacheKey(name)); if(!raw) return null; const pack = JSON.parse(raw); return pack && pack.data ? pack.data : null; }catch(e){ return null; } }
function readFastCache(name){ try{ const raw = localStorage.getItem(cacheKey(name)); if(!raw) return null; const pack = JSON.parse(raw); if(!pack || !pack.time || now() - pack.time > FAST_CACHE_MS) return null; return pack.data || null; }catch(e){ return null; } }
function pruneWelloneCache(maxEntries = 42){
  try{
    const prefix = 'wellone_supabase_v69_';
    const entries = [];
    for(let i=0;i<localStorage.length;i++){
      const key = localStorage.key(i);
      if(!key || !key.startsWith(prefix)) continue;
      let time = 0;
      try{ time = Number(JSON.parse(localStorage.getItem(key) || '{}').time || 0); }catch(_e){}
      entries.push({key,time});
    }
    entries.sort((a,b)=>b.time-a.time);
    entries.slice(maxEntries).forEach(item => localStorage.removeItem(item.key));
  }catch(_e){}
}
function writeFastCache(name, data){
  const key = cacheKey(name);
  const value = JSON.stringify({time: now(), data});
  try{ localStorage.setItem(key, value); pruneWelloneCache(); }
  catch(e){ try{ pruneWelloneCache(24); localStorage.setItem(key, value); }catch(_e){} }
}
function clearLegacyWelloneCaches(){
  try{
    const currentPrefix = 'wellone_supabase_v69_';
    const removals = [];
    for(let i=0;i<localStorage.length;i++){
      const key = localStorage.key(i) || '';
      if(key.startsWith('wellone_supabase_') && !key.startsWith(currentPrefix)) removals.push(key);
    }
    removals.forEach(key => localStorage.removeItem(key));
  }catch(_error){}
}
clearLegacyWelloneCaches();
function isSameData(a,b){ try{return JSON.stringify(a) === JSON.stringify(b)}catch(e){return false} }
function escapeHtml(value){ return cleanText(value).replace(/[&<>'"]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[m])); }
function optimizeImageUrl(url, size = 620){
  url = cleanText(url);
  if(!url) return url;
  if(url.includes('/storage/v1/object/public/') && !url.includes('?')) return `${url}?width=${size}&quality=75`;
  return url;
}
function preloadImage(url){ if(!url) return; try{ const img = new Image(); img.decoding = 'async'; img.src = optimizeImageUrl(url, 480); }catch(e){} }
function splitList(value){
  if(Array.isArray(value)) return value.map(cleanText).filter(Boolean);
  return cleanText(value).split(/[|\n,]+/).map(x => x.trim()).filter(Boolean);
}
function splitOptions(value){ return splitList(value); }
function uniqueClean(list){ const seen = new Set(); return (list || []).map(cleanText).filter(Boolean).filter(x => { const k = x.toLowerCase(); if(seen.has(k)) return false; seen.add(k); return true; }); }
function firstImage(images, fallback){ return optimizeImageUrl((Array.isArray(images) && images[0]) || fallback || SITE_CONFIG.defaultCategoryImage, 700); }
function parseImages(value){ return uniqueClean(Array.isArray(value) ? value : splitList(value)).map(x => optimizeImageUrl(x, 760)); }
function parseTerms(value){ return uniqueClean(Array.isArray(value) ? value : splitList(value)); }
function safeJsonParse(value, fallback){ try{ return typeof value === 'string' && value.trim() ? JSON.parse(value) : (Array.isArray(value) ? value : fallback); }catch(e){ return fallback; } }
function dbPrice(value){ return value === null || value === undefined ? '' : normalizePrice(value); }

function normalizeCategories(data){
  const seen = new Set();
  return (data || []).map(c => ({
    id: cleanText(c.id),
    name: cleanText(c.name),
    image: optimizeImageUrl(cleanText(c.image_url || SITE_CONFIG.defaultCategoryImage), 520),
    description: cleanText(c.description || ''),
    sort_order: Number(c.sort_order || 0)
  })).filter(c => {
    const k = cleanKey(c.name);
    if(!k || seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}
function normalizeTerms(data){
  return (data || [])
    .map(t => ({label: cleanText(t.name || t.label), icon: cleanText(t.icon || '✓'), description: cleanText(t.description || '')}))
    .filter(t => t.label);
}
function normalizeOffers(data){
  return (data || []).map((o,i) => ({
    id: cleanText(o.id || `offer-${i+1}`),
    title: cleanText(o.title || 'Special offer'),
    mrp: dbPrice(o.mrp),
    price: dbPrice(o.price),
    quantity: cleanText(o.quantity || o.subtitle || ''),
    image: optimizeImageUrl(cleanText(o.image_url || ''), 900),
    link: cleanText(o.link || (o.product_id ? `product.html?id=${encodeURIComponent(o.product_id)}` : 'catalog.html')),
    active: o.is_active !== false
  })).filter(o => o.active && o.image);
}
function normalizeProduct(row){
  if(!row || !row.id || !row.name) return null;
  const category = cleanText(row.categories && row.categories.name);
  const subcategory = cleanText(row.subcategories && row.subcategories.name);
  const gallery = (row.product_images || [])
    .slice()
    .sort((a,b)=>Number(a.sort_order||0)-Number(b.sort_order||0))
    .map(img => img.image_url)
    .filter(Boolean);
  const images = parseImages(gallery.length ? gallery : [row.main_image_url].filter(Boolean));
  const product = {
    ID: cleanText(row.id),
    Category: category,
    Name: cleanText(row.name),
    MRP: dbPrice(row.mrp),
    Price: dbPrice(row.price),
    Image: firstImage(images, row.main_image_url),
    Images: images.length ? images : [firstImage([], row.main_image_url || SITE_CONFIG.defaultCategoryImage)],
    Sizes: cleanText(row.sizes || 'Standard'),
    Colors: cleanText(row.colors || 'Default'),
    Description: cleanText(row.description || ''),
    OptionTitle: cleanText(row.option_title || ''),
    Subcategory: subcategory,
    Terms: parseTerms(row.terms || []),
    CreatedAt: cleanText(row.created_at || ''),
    UpdatedAt: cleanText(row.updated_at || ''),
    Status: cleanText(row.status || 'active'),
    StockStatus: cleanText(row.stock_status || 'in_stock')
  };
  const mainSizeOptions = splitOptions(product.Sizes || '').filter(Boolean);
  const fallbackSizes = mainSizeOptions.length ? mainSizeOptions : ['Standard'];
  const dbVariants = (row.product_variants || [])
    .slice()
    .sort((a,b)=>Number(a.sort_order||0)-Number(b.sort_order||0))
    .map(v => {
      const ownImages = parseImages((Array.isArray(v.image_urls) && v.image_urls.length ? v.image_urls : [v.image_url].filter(Boolean)));
      const ownSizes = splitOptions(cleanText(v.label || '')).filter(Boolean);
      return {
        label: cleanText(v.label || ''),
        color: cleanText(v.unit || ''),
        sizeOptions: ownSizes.length ? ownSizes : fallbackSizes,
        price: dbPrice(v.price || row.price),
        mrp: dbPrice(v.mrp || row.mrp),
        unit: cleanText(v.unit || ''),
        images: ownImages.length ? ownImages : product.Images,
        hasOwnImages: ownImages.length > 0,
        terms: [],
        stock: Number(v.stock || 0),
        stockStatus: cleanText(v.stock_status || 'in_stock')
      };
    });
  const colorDbVariants = dbVariants.filter(v => cleanText(v.color));
  const legacyDbVariants = dbVariants.filter(v => !cleanText(v.color));
  if(colorDbVariants.length){
    const mainColors = splitOptions(product.Colors || '').filter(c => cleanKey(c) !== 'default');
    const mergedColors = mainColors.map((color,i) => ({
      label:color,
      color,
      sizeOptions:fallbackSizes,
      price:product.Price,
      mrp:product.MRP,
      unit:color,
      images:product.Images,
      hasOwnImages:false,
      terms:[],
      stock:0,
      stockStatus:'in_stock',
      isBase:i === 0
    }));
    colorDbVariants.forEach(v => {
      const existing = mergedColors.find(x => cleanKey(x.color) === cleanKey(v.color));
      if(existing) Object.assign(existing, v, {label:v.color});
      else mergedColors.push({...v, label:v.color});
    });
    product.VariantMode = 'color';
    product.Variants = mergedColors;
  }else{
    const samePriceVariants = fallbackSizes.map((size,i) => ({
      label:size,
      color:'',
      sizeOptions:[size],
      price:product.Price,
      mrp:product.MRP,
      unit:'',
      images:product.Images,
      hasOwnImages:false,
      terms:[],
      stock:0,
      stockStatus:'in_stock',
      isBase:i === 0
    }));
    if(legacyDbVariants.length){
      const merged = [...samePriceVariants];
      legacyDbVariants.forEach(v => {
        const label = cleanText(v.label || 'Standard');
        const existing = merged.find(x => cleanKey(x.label) === cleanKey(label));
        if(existing) Object.assign(existing, v, {label, sizeOptions:[label]});
        else merged.push({...v, label, sizeOptions:[label]});
      });
      product.Variants = merged;
    }else{
      product.Variants = samePriceVariants;
    }
    product.VariantMode = 'option';
  }
  return product;
}
function normalizeProducts(list){ return (list || []).map(normalizeProduct).filter(Boolean); }
function productStoreKey(category, id){ return `product_${cleanKey(category)}_${cleanText(id)}`; }
function rememberProduct(product, persist = true){
  if(!product || !product.ID) return;
  const key = `${cleanKey(product.Category)}_${cleanText(product.ID)}`;
  productCacheByKey.delete(key);
  productCacheByKey.set(key, product);
  while(productCacheByKey.size > 260){
    const oldest = productCacheByKey.keys().next().value;
    if(!oldest) break;
    productCacheByKey.delete(oldest);
  }
  if(persist) writeFastCache(productStoreKey(product.Category, product.ID), product);
}
function rememberProducts(products){ (products || []).forEach(product => rememberProduct(product, false)); }
function findProductInCachedPages(categoryName, productId){
  const catKey = cleanKey(categoryName);
  const id = cleanText(productId);
  if(productCacheByKey.has(`${catKey}_${id}`)) return productCacheByKey.get(`${catKey}_${id}`);
  const cachedProduct = readFastCache(productStoreKey(categoryName, productId)) || readAnyCache(productStoreKey(categoryName, productId));
  if(cachedProduct){ productCacheByKey.set(`${catKey}_${id}`, cachedProduct); return cachedProduct; }
  try{
    for(let i=0;i<localStorage.length;i++){
      const key = localStorage.key(i) || '';
      if(!key.startsWith(cacheKey('page_')) && !key.includes('catalog_view_')) continue;
      const raw = localStorage.getItem(key); if(!raw) continue;
      const pack = JSON.parse(raw);
      const products = (pack && pack.data && (pack.data.products || pack.data)) || [];
      const found = (Array.isArray(products) ? products : []).find(p => cleanText(p.ID) === id && (!catKey || cleanKey(p.Category) === catKey));
      if(found){ rememberProduct(found); return found; }
    }
  }catch(e){}
  return null;
}

function removeStoreCacheEntries(predicate){
  try{
    const prefix = 'wellone_supabase_v69_';
    const removals = [];
    for(let i=0;i<localStorage.length;i++){
      const key = localStorage.key(i) || '';
      if(!key.startsWith(prefix)) continue;
      const name = key.slice(prefix.length);
      if(predicate(name)) removals.push(key);
    }
    removals.forEach(key => localStorage.removeItem(key));
  }catch(_error){}
}
function invalidateStoreData(table = ''){
  const name = cleanText(table);
  const productTable = ['products','product_variants','product_images'].includes(name) || !name;
  if(productTable){
    productCacheByKey.clear();
    removeStoreCacheEntries(key => key.startsWith('page_') || key.startsWith('global_') || key.startsWith('catalog_view_') || key.startsWith('product_') || key === 'last_open_product');
  }
  if(name === 'categories' || !name){
    categoryCache = null;
    subcategoryCache.clear();
    removeStoreCacheEntries(key => key === 'categories' || key.startsWith('subcategories_'));
  }else if(name === 'subcategories'){
    subcategoryCache.clear();
    removeStoreCacheEntries(key => key.startsWith('subcategories_'));
  }
  if(name === 'offer_slides' || !name){
    offersCache = null;
    removeStoreCacheEntries(key => key === 'offers');
  }
  if(name === 'terms' || !name){
    termsCache = null;
    removeStoreCacheEntries(key => key === 'terms');
  }
}
function flushStoreUpdates(){
  clearTimeout(storeUpdateDebounceTimer);
  storeUpdateDebounceTimer = null;
  const changes = Array.from(pendingStoreChanges.values());
  pendingStoreChanges.clear();
  if(!changes.length) return;
  const tables = uniqueClean(changes.flatMap(item => Array.isArray(item.tables) ? item.tables : [cleanText(item && item.table)]));
  const batch = {
    table: tables.length === 1 ? tables[0] : '',
    tables,
    changes,
    eventType: changes.length === 1 ? cleanText(changes[0].eventType) : 'BATCH',
    source: 'admin',
    eventId: cleanText(changes[changes.length - 1] && changes[changes.length - 1].eventId)
  };
  storeUpdateListeners.forEach(listener => {
    try{ listener(batch); }catch(_error){}
  });
}
function emitStoreUpdate(change, delay = 80){
  const normalizedChange = change || {tables:[], eventType:'ADMIN_CHANGE'};
  const tables = uniqueClean(Array.isArray(normalizedChange.tables) ? normalizedChange.tables : [normalizedChange.table]);
  if(!tables.length) return;
  tables.forEach(table => {
    invalidateStoreData(table);
    pendingStoreChanges.set(table, {...normalizedChange, table});
  });
  clearTimeout(storeUpdateDebounceTimer);
  storeUpdateDebounceTimer = setTimeout(flushStoreUpdates, Math.max(0, Number(delay || 0)));
}
function rememberStoreEvent(eventId){
  eventId = cleanText(eventId);
  if(!eventId) return true;
  const current = now();
  for(const [id, time] of seenStoreEventIds){ if(current - time > 5 * 60 * 1000) seenStoreEventIds.delete(id); }
  if(seenStoreEventIds.has(eventId)) return false;
  seenStoreEventIds.set(eventId, current);
  return true;
}
function handleAdminBroadcast(payload){
  const body = payload && payload.payload ? payload.payload : payload;
  const tables = uniqueClean((body && body.tables) || []);
  const eventId = cleanText(body && body.eventId);
  if(!tables.length || !rememberStoreEvent(eventId)) return;
  emitStoreUpdate({
    tables,
    eventType:cleanText((body && body.action) || 'ADMIN_CHANGE'),
    source:'admin',
    eventId,
    details:(body && body.details) || null
  }, 60);
}
function scheduleStoreRealtimeReconnect(){
  if(storeRealtimeRetryTimer || storeRealtimeChannel || storeRealtimeConnecting || !storeUpdateListeners.size || !navigator.onLine) return;
  const delay = Math.min(30000, 1200 * Math.pow(2, Math.min(storeRealtimeRetryAttempt, 5)));
  storeRealtimeRetryAttempt += 1;
  storeRealtimeRetryTimer = setTimeout(() => {
    storeRealtimeRetryTimer = null;
    startStoreRealtime();
  }, delay);
}
function startStoreRealtime(){
  if(storeRealtimeChannel || storeRealtimeConnecting || !storeUpdateListeners.size || !navigator.onLine) return;
  storeRealtimeConnecting = true;
  try{
    const client = supabaseClient();
    if(!client || typeof client.channel !== 'function'){
      storeRealtimeConnecting = false;
      return;
    }
    const channel = client
      .channel(STORE_CHANNEL_NAME, {config:{broadcast:{self:false, ack:true}}})
      .on('broadcast', {event:STORE_EVENT_NAME}, handleAdminBroadcast);
    storeRealtimeChannel = channel;
    channel.subscribe(status => {
      if(channel !== storeRealtimeChannel) return;
      storeRealtimeStatus = status;
      if(status === 'SUBSCRIBED'){
        storeRealtimeConnecting = false;
        storeRealtimeRetryAttempt = 0;
        clearTimeout(storeRealtimeRetryTimer);
        storeRealtimeRetryTimer = null;
        return;
      }
      if(status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED'){
        storeRealtimeConnecting = false;
        storeRealtimeChannel = null;
        setTimeout(() => { try{ client.removeChannel(channel); }catch(_error){} }, 0);
        scheduleStoreRealtimeReconnect();
      }
    });
  }catch(_error){
    storeRealtimeChannel = null;
    storeRealtimeConnecting = false;
    storeRealtimeStatus = 'error';
    scheduleStoreRealtimeReconnect();
  }
}
function subscribeToStoreUpdates(listener){
  if(typeof listener !== 'function') return () => {};
  storeUpdateListeners.add(listener);
  startStoreRealtime();
  return () => storeUpdateListeners.delete(listener);
}
window.addEventListener('online', () => {
  if(!storeRealtimeChannel) startStoreRealtime();
});
window.addEventListener('offline', () => {
  storeRealtimeStatus = 'offline';
});

async function loadCategories(forceRefresh = false){
  if(!forceRefresh && categoryCache) return categoryCache;
  const cached = !forceRefresh && readFastCache('categories');
  if(cached){ categoryCache = cached; return cached; }
  const base = await supabaseClient()
    .from('categories')
    .select('id,name,image_url,description,sort_order,is_active')
    .eq('is_active', true)
    .order('sort_order', {ascending:true})
    .order('name', {ascending:true});
  if(base.error) throw base.error;
  // For large catalogues, check only whether one product exists per category.
  // This avoids downloading every related product id from an inner join.
  const checks = await Promise.all((base.data || []).map(async category => {
    const result = await supabaseClient()
      .from('products')
      .select('id')
      .eq('status','active')
      .eq('category_id', category.id)
      .limit(1);
    return !result.error && result.data && result.data.length ? category : null;
  }));
  categoryCache = normalizeCategories(checks.filter(Boolean));
  writeFastCache('categories', categoryCache);
  return categoryCache;
}
async function loadTerms(forceRefresh = false){
  if(!forceRefresh && termsCache) return termsCache;
  const cached = !forceRefresh && readFastCache('terms');
  if(cached){ termsCache = cached; return cached; }
  const {data, error} = await supabaseClient().from('terms').select('id,name,icon,description,is_active').eq('is_active', true).order('name', {ascending:true});
  if(error){
    // The terms section is optional and was removed from some Wellone projects.
    if(error.code === '42P01' || /relation .*terms.*does not exist/i.test(cleanText(error.message))){
      termsCache = [];
      return termsCache;
    }
    throw error;
  }
  termsCache = normalizeTerms(data || []);
  writeFastCache('terms', termsCache);
  return termsCache;
}
async function loadOffers(forceRefresh = false){
  if(!forceRefresh && offersCache) return offersCache;
  const cached = !forceRefresh && (readFastCache('offers') || readAnyCache('offers'));
  if(cached){ offersCache = cached; return cached; }
  const {data, error} = await supabaseClient().from('offer_slides').select('id,title,subtitle,image_url,mrp,price,quantity,link,product_id,is_active,sort_order').eq('is_active', true).order('sort_order', {ascending:true}).order('created_at', {ascending:false});
  if(error) throw error;
  offersCache = normalizeOffers(data || []);
  writeFastCache('offers', offersCache);
  return offersCache;
}
async function getCategoryByName(categoryName){
  const name = cleanText(categoryName);
  if(!name) return null;
  const known = (categoryCache || readAnyCache('categories') || []).find(cat => sameName(cat.name, name));
  if(known) return known;
  const {data, error} = await supabaseClient()
    .from('categories')
    .select('id,name,image_url,description,sort_order,is_active')
    .eq('name', name)
    .eq('is_active', true)
    .maybeSingle();
  if(error) throw error;
  return data ? normalizeCategories([data])[0] || null : null;
}
async function loadSubcategories(categoryName, forceRefresh = false){
  const key = cleanKey(categoryName);
  const memory = subcategoryCache.get(key);
  if(!forceRefresh && memory && now() - memory.time < SUBCATEGORY_CACHE_MS) return memory.data.slice();
  const stored = !forceRefresh && readFastCache(`subcategories_${key}`);
  if(stored){
    subcategoryCache.set(key, {time:now(), data:stored});
    return stored.slice();
  }
  const category = await getCategoryByName(categoryName);
  if(!category) return [];
  const {data, error} = await supabaseClient()
    .from('subcategories')
    .select('id,name,sort_order,is_active')
    .eq('category_id', category.id)
    .eq('is_active', true)
    .order('sort_order', {ascending:true})
    .order('name', {ascending:true});
  if(error) throw error;
  const result = uniqueClean((data || []).map(item => item.name));
  subcategoryCache.set(key, {time:now(), data:result});
  writeFastCache(`subcategories_${key}`, result);
  return result.slice();
}
function applySort(query, sort){
  if(sort === 'price_asc') return query.order('price', {ascending:true, nullsFirst:false});
  if(sort === 'price_desc') return query.order('price', {ascending:false, nullsFirst:false});
  if(sort === 'discount_desc') return query.order('discount_amount', {ascending:false, nullsFirst:false}).order('created_at', {ascending:false});
  if(sort === 'name_asc') return query.order('name', {ascending:true}).order('id', {ascending:true});
  return query.order('created_at', {ascending:false}).order('id', {ascending:false});
}
function safeLike(q){ return String(q || '').replace(/[%_]/g, m => '\\' + m).replace(/[,()]/g, ' '); }
function searchTerms(q){
  const phrase = cleanText(q).replace(/\s+/g, ' ');
  if(!phrase) return [];
  const words = phrase.split(' ').map(value => value.trim()).filter(value => value.length >= 2);
  return uniqueClean([phrase, ...words]).slice(0, 8);
}
function numericSearchValue(q){
  const n = Number(String(q || '').replace(/[^0-9.]/g,''));
  return Number.isFinite(n) && n > 0 ? n : null;
}
async function searchMatchIds(q, categoryId){
  const terms = searchTerms(q).map(value => value.toLowerCase());
  if(!terms.length) return {categoryIds:[], subcategoryIds:[], productIds:[]};
  const variantOr = terms.flatMap(term => {
    const safe = safeLike(term);
    return [`label.ilike.%${safe}%`, `unit.ilike.%${safe}%`];
  }).join(',');
  const variantQuery = supabaseClient()
    .from('product_variants')
    .select('product_id,label,unit')
    .or(variantOr)
    .limit(60);
  const [catRes, subRes, variantRes] = await Promise.all([
    supabaseClient().from('categories').select('id,name').eq('is_active', true),
    categoryId
      ? supabaseClient().from('subcategories').select('id,name,category_id').eq('is_active', true).eq('category_id', categoryId)
      : supabaseClient().from('subcategories').select('id,name,category_id').eq('is_active', true),
    variantQuery
  ]);
  const matchesAny = value => {
    const text = cleanText(value).toLowerCase();
    return terms.some(term => text.includes(term));
  };
  const categoryIds = uniqueClean((catRes.data || []).filter(c => matchesAny(c.name)).map(c => c.id));
  const subcategoryIds = uniqueClean((subRes.data || []).filter(s => matchesAny(s.name)).map(s => s.id));
  const productIds = uniqueClean((variantRes.data || []).map(v => v.product_id)).slice(0, 60);
  return {categoryIds, subcategoryIds, productIds};
}
function searchOrParts(q, ids = {}){
  const terms = searchTerms(q);
  const fields = ['name','slug','description','sizes','colors','option_title'];
  const parts = [];
  terms.forEach(value => {
    const term = safeLike(value);
    fields.forEach(field => parts.push(`${field}.ilike.%${term}%`));
  });
  const num = numericSearchValue(q);
  if(num){ parts.push(`price.eq.${num}`, `mrp.eq.${num}`); }
  if(ids.categoryIds && ids.categoryIds.length){ parts.push(`category_id.in.(${ids.categoryIds.join(',')})`); }
  if(ids.subcategoryIds && ids.subcategoryIds.length){ parts.push(`subcategory_id.in.(${ids.subcategoryIds.join(',')})`); }
  if(ids.productIds && ids.productIds.length){ parts.push(`id.in.(${ids.productIds.join(',')})`); }
  return parts.join(',');
}
async function loadCategoryPage(categoryName, opts = {}){
  const offset = Number(opts.offset || 0);
  const limit = Number(opts.limit || 48);
  const cacheName = `page_${cleanKey(categoryName)}_${cleanKey(opts.query || '')}_${cleanKey(opts.subcategory || '')}_${opts.sort || 'newest'}_${offset}_${limit}`;
  const cached = opts.useCache && !opts.forceRefresh ? readFastCache(cacheName) : null;
  if(cached){ rememberProducts(cached.products); return cached; }
  const category = await getCategoryByName(categoryName);
  if(!category) return {products:[], nextOffset:null, total:0};
  let query = supabaseClient().from('products').select(PRODUCT_LIST_SELECT).eq('status','active').eq('category_id', category.id);
  if(opts.subcategory){
    const {data: subs} = await supabaseClient().from('subcategories').select('id,name').eq('category_id', category.id).eq('is_active', true);
    const sub = (subs || []).find(s => sameName(s.name, opts.subcategory));
    if(sub) query = query.eq('subcategory_id', sub.id); else return {products:[], nextOffset:null, total:0};
  }
  if(opts.query){
    const ids = await searchMatchIds(opts.query, category.id).catch(()=>({categoryIds:[],subcategoryIds:[],productIds:[]}));
    query = query.or(searchOrParts(opts.query, {subcategoryIds: ids.subcategoryIds, productIds: ids.productIds}));
  }
  query = applySort(query, opts.sort).range(offset, offset + limit);
  const {data, error} = await query;
  if(error) throw error;
  const rows = data || [];
  const hasMore = rows.length > limit;
  const products = normalizeProducts(hasMore ? rows.slice(0, limit) : rows);
  rememberProducts(products);
  const nextOffset = hasMore ? offset + products.length : null;
  const pack = {products, nextOffset, total: offset + products.length + (hasMore ? 1 : 0)};
  writeFastCache(cacheName, pack);
  return pack;
}
async function searchGlobalProducts(queryText, opts = {}){
  const offset = Number(opts.offset || 0);
  const limit = Number(opts.limit || 48);
  const q = cleanText(queryText);
  const cacheName = `global_${cleanKey(q)}_${opts.sort || 'newest'}_${offset}_${limit}`;
  const cached = opts.useCache && !opts.forceRefresh ? readFastCache(cacheName) : null;
  if(cached){ rememberProducts(cached.products); return cached; }
  let query = supabaseClient().from('products').select(PRODUCT_LIST_SELECT).eq('status','active');
  if(q){
    const ids = await searchMatchIds(q).catch(()=>({categoryIds:[],subcategoryIds:[],productIds:[]}));
    query = query.or(searchOrParts(q, ids));
  }
  query = applySort(query, opts.sort).range(offset, offset + limit);
  const {data, error} = await query;
  if(error) throw error;
  const rows = data || [];
  const hasMore = rows.length > limit;
  const products = normalizeProducts(hasMore ? rows.slice(0, limit) : rows);
  rememberProducts(products);
  const nextOffset = hasMore ? offset + products.length : null;
  const pack = {products, nextOffset, total: offset + products.length + (hasMore ? 1 : 0)};
  writeFastCache(cacheName, pack);
  return pack;
}
async function findProduct(categoryName, productId, opts = {}){
  if(!opts.forceRefresh){
    const cached = findProductInCachedPages(categoryName, productId);
    if(cached) return cached;
  }
  const {data, error} = await supabaseClient().from('products').select(PRODUCT_DETAIL_SELECT).eq('id', productId).maybeSingle();
  if(error) throw error;
  const product = normalizeProduct(data);
  if(product) rememberProduct(product);
  return product;
}
async function fallbackImage(categoryName){ const categories = await loadCategories(); const category = categories.find(cat => sameName(cat.name, categoryName)) || categories[0]; return (category && category.image) || SITE_CONFIG.defaultCategoryImage; }
function fallbackImageSync(categoryName){ const categories = categoryCache || readAnyCache('categories') || []; const category = categories.find(cat => sameName(cat.name, categoryName)) || categories[0]; return (category && category.image) || SITE_CONFIG.defaultCategoryImage; }
function selectedTermObjects(labels, allTerms){
  const terms = allTerms || termsCache || [];
  const labelSet = parseTerms(labels).map(x => x.toLowerCase());
  return labelSet.map(label => terms.find(t => t.label.toLowerCase() === label) || {label, icon:'✓', description:''});
}
