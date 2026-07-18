'use strict';

const INITIAL_PAGE_LIMIT = 20;
const LOAD_MORE_PAGE_LIMIT = 20;
const SORT_OPTIONS = [
  {value:'newest', label:'Newest'},
  {value:'price_asc', label:'Price: Low to High'},
  {value:'price_desc', label:'Price: High to Low'},
  {value:'discount_desc', label:'Highest Discount'},
  {value:'name_asc', label:'Name: A to Z'}
];
let catalogState = {category:'', query:'', subcategory:'', sort:'newest', offset:0, loading:false, nextOffset:null, products:[], global:false};
let activeProduct = null;
let activeVariantIndex = 0;
let activeSizeIndex = 0;
let activeColorIndex = 0;
let activeImageIndex = 0;
const CATALOG_VIEW_TTL_MS = 30 * 60 * 1000;
let catalogScrollTimer = null;
let lastCatalogNetworkLoadAt = 0;
let catalogAutoObserver = null;
let catalogAutoScrollHandler = null;
let catalogLiveRefreshTimer = null;
let productLiveRefreshTimer = null;
let catalogRequestSerial = 0;
let filterRenderSerial = 0;
let catalogRefreshPending = false;
const WELLONE_PUBLIC_ORIGIN = 'https://wellone.in';

function absoluteWelloneUrl(relative = ''){
  try{ return new URL(relative || '/', WELLONE_PUBLIC_ORIGIN + '/').href; }
  catch(e){ return WELLONE_PUBLIC_ORIGIN + '/'; }
}
function setDocumentMeta(selector, attribute, value){
  let element = document.querySelector(selector);
  if(!element){
    element = document.createElement('meta');
    const match = selector.match(/^meta\[(name|property)="([^"]+)"\]$/);
    if(match) element.setAttribute(match[1], match[2]);
    document.head.appendChild(element);
  }
  element.setAttribute(attribute, value);
}
function setCanonicalUrl(url){
  let canonical = document.getElementById('canonicalLink') || document.querySelector('link[rel="canonical"]');
  if(!canonical){ canonical = document.createElement('link'); canonical.rel = 'canonical'; document.head.appendChild(canonical); }
  canonical.href = url;
}
function updateCommonSeo({title, description, url, image = absoluteWelloneUrl('assets/logo.png'), type = 'website', robots = 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1'}){
  if(title) document.title = title;
  setDocumentMeta('meta[name="description"]', 'content', description || '');
  setDocumentMeta('meta[name="robots"]', 'content', robots);
  setDocumentMeta('meta[property="og:title"]', 'content', title || 'Wellone Fancy & Footwear');
  setDocumentMeta('meta[property="og:description"]', 'content', description || '');
  setDocumentMeta('meta[property="og:type"]', 'content', type);
  setDocumentMeta('meta[property="og:url"]', 'content', url);
  setDocumentMeta('meta[property="og:image"]', 'content', image);
  setDocumentMeta('meta[name="twitter:title"]', 'content', title || 'Wellone Fancy & Footwear');
  setDocumentMeta('meta[name="twitter:description"]', 'content', description || '');
  setDocumentMeta('meta[name="twitter:image"]', 'content', image);
  setCanonicalUrl(url);
}
function updateCatalogSeo(){
  if(!document.body.classList.contains('catalog-page')) return;
  const category = cleanText(catalogState.category);
  const query = cleanText(catalogState.query);
  const subcategory = cleanText(catalogState.subcategory);
  const params = new URLSearchParams();
  if(category) params.set('cat', category);
  if(subcategory && category) params.set('sub', subcategory);
  const canonical = absoluteWelloneUrl(`catalog.html${params.toString() ? '?' + params.toString() : ''}`);
  if(query){
    updateCommonSeo({
      title:`Search results for ${query} | Wellone`,
      description:`Search Wellone Fancy & Footwear for ${query}. Browse matching products and choose the exact colour, size or option.`,
      url:absoluteWelloneUrl('catalog.html'),
      robots:'noindex,follow'
    });
    return;
  }
  const label = subcategory || category;
  updateCommonSeo({
    title: label ? `${label} | Wellone Fancy & Footwear` : 'Shop Footwear, Bags & Accessories | Wellone',
    description: label ? `Browse ${label} products from Wellone Fancy & Footwear. Select the exact colour, size or option and order easily.` : 'Browse Wellone footwear, bags, cosmetics, fancy items and accessories. Select the exact option, colour or size and order easily.',
    url:canonical
  });
}
function upsertProductStructuredData(data){
  let script = document.getElementById('productStructuredData');
  if(!script){ script = document.createElement('script'); script.id = 'productStructuredData'; script.type = 'application/ld+json'; document.head.appendChild(script); }
  script.textContent = JSON.stringify(data);
}

function attrSafeJs(value){
  return String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/'/g, "\\'")
    .replace(/\r/g, '')
    .replace(/\n/g, '\\n');
}
function currentCatalogFingerprint(){
  return [catalogState.global ? 'global' : 'category', catalogState.category || '', catalogState.query || '', catalogState.subcategory || '', catalogState.sort || 'newest'].map(cleanText).join('|');
}
function catalogViewCacheName(){ return 'catalog_view_' + cleanKey(currentCatalogFingerprint() || location.href); }
function persistCatalogView(){
  try{
    if(!catalogState.products || !catalogState.products.length) return;
    writeFastCache(catalogViewCacheName(), {
      fingerprint: currentCatalogFingerprint(),
      scrollY: Math.max(0, window.scrollY || document.documentElement.scrollTop || 0),
      products: catalogState.products,
      nextOffset: catalogState.nextOffset,
      offset: catalogState.offset,
      savedAt: Date.now()
    });
  }catch(e){}
}
function bindCatalogViewPersistence(){
  if(window.__welloneCatalogPersistence) return;
  window.__welloneCatalogPersistence = true;
  window.addEventListener('scroll', () => {
    clearTimeout(catalogScrollTimer);
    catalogScrollTimer = setTimeout(persistCatalogView, 220);
  }, {passive:true});
  window.addEventListener('pagehide', persistCatalogView);
  document.addEventListener('visibilitychange', () => { if(document.visibilityState === 'hidden') persistCatalogView(); });
}
function restoreCatalogView(){
  const grid = document.getElementById('productGrid');
  if(!grid) return false;
  const cached = readFastCache(catalogViewCacheName()) || readAnyCache(catalogViewCacheName());
  if(!cached || cached.fingerprint !== currentCatalogFingerprint() || !Array.isArray(cached.products) || !cached.products.length) return false;
  if(cached.savedAt && Date.now() - cached.savedAt > CATALOG_VIEW_TTL_MS) return false;
  catalogState.products = cached.products;
  catalogState.nextOffset = cached.nextOffset ?? null;
  catalogState.offset = cached.offset || cached.nextOffset || catalogState.products.length;
  rememberProducts(catalogState.products);
  grid.classList.remove('skeleton-grid');
  grid.innerHTML = catalogState.products.map(p => productCard(p, p.Category || catalogState.category)).join('');
  renderCategoryHero();
  updateCatalogAutoLoaderState();
  requestAnimationFrame(() => setTimeout(() => window.scrollTo({top: cached.scrollY || 0, behavior:'auto'}), 40));
  return cached;
}
function findProductInState(categoryName, productId){
  const id = cleanText(productId);
  const catKey = cleanKey(categoryName);
  return (catalogState.products || []).find(p => cleanText(p.ID) === id && (!catKey || cleanKey(p.Category) === catKey)) || null;
}
function cacheProductForOpen(categoryName, productId){
  const product = findProductInState(categoryName, productId) || findProductInCachedPages(categoryName, productId);
  if(product){
    rememberProduct(product);
    writeFastCache('last_open_product', {category: product.Category || categoryName, id: product.ID || productId, product, savedAt: Date.now()});
  }
  return product;
}
function openProductFromCard(categoryName, productId, href){
  persistCatalogView();
  cacheProductForOpen(categoryName, productId);
  location.href = href;
}
function warmProductFromCard(categoryName, productId){ cacheProductForOpen(categoryName, productId); }
function getProductFromInstantCache(categoryName, productId){
  const cached = findProductInCachedPages(categoryName, productId);
  if(cached) return cached;
  const last = readFastCache('last_open_product') || readAnyCache('last_open_product');
  if(last && cleanText(last.id) === cleanText(productId) && (!categoryName || sameName(last.category, categoryName)) && last.product){
    rememberProduct(last.product);
    return last.product;
  }
  return null;
}

function skeletonCards(count = 8, cls = 'skeleton-card'){
  return Array.from({length: count}, () => `<article class="${cls}"><span></span><b></b><small></small></article>`).join('');
}
function sortLabel(value){ return (SORT_OPTIONS.find(x => x.value === value) || SORT_OPTIONS[0]).label; }
function updateSortButton(){
  const btn = document.getElementById('sortButton');
  const txt = document.getElementById('sortButtonText');
  if(btn) btn.dataset.value = catalogState.sort || 'newest';
  if(txt) txt.textContent = sortLabel(catalogState.sort || 'newest');
}
function categoryUrl(name){ return `catalog.html?cat=${encodeURIComponent(name)}`; }
function categoryCard(category){
  const name = escapeHtml(category.name);
  const url = categoryUrl(category.name);
  const desc = escapeHtml(category.description || `Discover premium ${category.name} collections.`);
  return `<a class="cat-card premium-cat-card" data-cat="${name}" href="${url}" aria-label="Browse ${name}">
    <div class="media shimmer"><img loading="lazy" decoding="async" src="${optimizeImageUrl(category.image || SITE_CONFIG.defaultCategoryImage, 720)}" onload="this.parentElement.classList.remove('shimmer')" onerror="this.src=SITE_CONFIG.defaultCategoryImage" alt="${name}"></div>
    <div class="cat-copy"><h3>${name}</h3><p>${desc}</p><span class="cat-arrow" aria-hidden="true">→</span></div>
  </a>`;
}
function renderCategoryHero(){
  const hero = document.getElementById('categoryHero');
  if(hero){ hero.classList.add('hidden'); hero.innerHTML = ''; }
}

function attachCategoryWarmup(scope = document){
  scope.querySelectorAll('[data-cat]').forEach(card => {
    if(card.dataset.warmReady) return;
    card.dataset.warmReady = '1';
    const cat = card.dataset.cat || '';
    const warm = () => warmCategoryCache(cat);
    card.addEventListener('pointerenter', warm, {once:true});
  });
}
function warmCategoryCache(categoryName){
  if(!categoryName) return;
  loadCategoryPage(categoryName, {offset:0, limit:INITIAL_PAGE_LIMIT, sort:'newest'}).then(pack => {
    (pack.products || []).slice(0,6).forEach(p => preloadImage(firstImage((p.Variants && p.Variants[0] && p.Variants[0].images) || p.Images, p.Image || fallbackImageSync(categoryName))));
  }).catch(()=>{});
}
function priceHtml(product, variant){
  const v = variant || (product.Variants && product.Variants[0]) || product;
  const mrp = v.mrp || product.MRP || '';
  const price = v.price || product.Price || '';
  if(money(mrp) && money(price) && money(mrp) > money(price)) return `<div class="price-row"><del>₹${money(mrp)}</del><strong>₹${money(price)}</strong></div>`;
  return `<div class="price-row"><strong>${formatPrice(price) || 'Ask price'}</strong></div>`;
}
function stableProductCardSignature(product, categoryName){
  const variant = (product.Variants && product.Variants[0]) || product || {};
  const source = JSON.stringify([
    cleanText(product.ID), cleanText(product.Name), cleanText(product.Category || categoryName), cleanText(product.Subcategory),
    cleanText(product.MRP), cleanText(product.Price), cleanText(product.Image), cleanText(product.StockStatus),
    cleanText(product.UpdatedAt), cleanText(variant.label), cleanText(variant.price), cleanText(variant.mrp),
    cleanText(variant.stockStatus), (variant.images || []).join('|')
  ]);
  let hash = 2166136261;
  for(let i=0;i<source.length;i++){
    hash ^= source.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}
function productCardElement(product, categoryName){
  const template = document.createElement('template');
  template.innerHTML = productCard(product, categoryName).trim();
  return template.content.firstElementChild;
}
function patchProductGrid(grid, products){
  if(!grid) return;
  const existing = new Map(Array.from(grid.querySelectorAll(':scope > [data-product-id]')).map(node => [cleanText(node.dataset.productId), node]));
  const desiredIds = new Set();
  const fragment = document.createDocumentFragment();
  (products || []).forEach(product => {
    const id = cleanText(product.ID);
    if(!id) return;
    desiredIds.add(id);
    const categoryName = product.Category || catalogState.category;
    const signature = stableProductCardSignature(product, categoryName);
    let node = existing.get(id);
    if(!node || node.dataset.productSig !== signature){
      node = productCardElement(product, categoryName);
    }
    if(node) fragment.appendChild(node);
  });
  existing.forEach((node, id) => { if(!desiredIds.has(id)) node.remove(); });
  Array.from(grid.children).forEach(node => { if(!node.matches('[data-product-id]')) node.remove(); });
  grid.appendChild(fragment);
}

function productCard(product, categoryName){
  const catName = categoryName || product.Category || product.category || '';
  const variant = (product.Variants && product.Variants[0]) || product;
  const image = firstImage(variant.images || product.Images, product.Image || fallbackImageSync(catName));
  const safeId = encodeURIComponent(product.ID);
  const safeCat = encodeURIComponent(catName);
  const href = `product.html?cat=${safeCat}&id=${safeId}`;
  const jsCat = attrSafeJs(catName);
  const jsId = attrSafeJs(product.ID);
  const sub = product.Subcategory ? `<span class="product-badge">${escapeHtml(product.Subcategory)}</span>` : '';
  const catBadge = catalogState.global && catName ? `<span class="product-badge soft-badge">${escapeHtml(catName)}</span>` : '';
  const unavailable = product.StockStatus === 'out_of_stock';
  const stockBadge = unavailable ? `<span class="product-badge stock-badge">Out of stock</span>` : '';
  return `<a class="product-card clickable-card ${unavailable ? 'is-out-stock' : ''}" data-product-id="${escapeHtml(product.ID)}" data-product-sig="${stableProductCardSignature(product, catName)}" href="${href}" onclick="persistCatalogView();cacheProductForOpen('${jsCat}','${jsId}')" onpointerenter="warmProductFromCard('${jsCat}','${jsId}')" ontouchstart="warmProductFromCard('${jsCat}','${jsId}')" aria-label="View ${escapeHtml(product.Name)}">
    <div class="product-media shimmer"><img loading="lazy" decoding="async" src="${optimizeImageUrl(image, 620)}" onload="this.parentElement.classList.remove('shimmer')" onerror="this.src='${fallbackImageSync(catName)}'" alt="${escapeHtml(product.Name)}"></div>
    <div class="product-pad">
      ${catBadge}${sub}${stockBadge}<h3>${escapeHtml(product.Name)}</h3>
      ${priceHtml(product, variant)}
      <span class="product-card-view">View</span>
    </div>
  </a>`;
}

function offerCard(offer, index = 0){
  const href = offer.link || 'catalog.html';
  return `<a class="offer-card deal-banner-card" href="${escapeHtml(href)}" aria-label="${escapeHtml(offer.title || 'Discount banner')}" data-offer-index="${index}">
    <div class="offer-img deal-banner-img shimmer"><img loading="${index === 0 ? 'eager' : 'lazy'}" decoding="async" src="${optimizeImageUrl(offer.image, 1600)}" onload="this.parentElement.classList.remove('shimmer')" alt="${escapeHtml(offer.title || 'Discount banner')}"></div>
  </a>`;
}
function bindOfferDots(slider, dots){
  if(!slider || !dots) return;
  if(slider.__autoSlideStop) slider.__autoSlideStop();
  if(slider.__offerAbort) slider.__offerAbort.abort();

  const controller = new AbortController();
  const signal = controller.signal;
  slider.__offerAbort = controller;

  const cards = () => Array.from(slider.querySelectorAll('.offer-card'));
  const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let timer = null;
  let animationFrame = null;
  let scrollTimer = null;
  let userInteracting = false;

  const maxScroll = () => Math.max(0, slider.scrollWidth - slider.clientWidth);
  const stepSize = () => {
    const items = cards();
    if(items.length > 1) return Math.max(1, items[1].offsetLeft - items[0].offsetLeft);
    return Math.max(1, items[0]?.offsetWidth || slider.clientWidth);
  };
  const isAtEnd = () => maxScroll() - slider.scrollLeft <= 3;
  const getActiveIndex = () => {
    const items = cards();
    if(!items.length) return 0;
    if(isAtEnd()) return items.length - 1;
    return Math.max(0, Math.min(items.length - 1, Math.round(slider.scrollLeft / stepSize())));
  };

  const update = () => {
    const active = getActiveIndex();
    slider.dataset.activeOfferIndex = String(active);
    dots.querySelectorAll('button').forEach((dot, index) => dot.classList.toggle('active', index === active));
  };

  const clearTimer = () => {
    if(timer){ clearTimeout(timer); timer = null; }
  };
  const cancelAnimation = () => {
    if(animationFrame){ cancelAnimationFrame(animationFrame); animationFrame = null; }
  };

  const animateTo = (targetLeft, duration = 1650, done) => {
    cancelAnimation();
    const target = Math.max(0, Math.min(maxScroll(), targetLeft));
    const from = slider.scrollLeft;
    const distance = target - from;
    if(reducedMotion || Math.abs(distance) < 2){
      slider.scrollLeft = target;
      update();
      done?.();
      return;
    }
    const started = performance.now();
    const ease = t => t < .5 ? 4*t*t*t : 1 - Math.pow(-2*t + 2, 3) / 2;
    const frame = now => {
      const progress = Math.min(1, (now - started) / duration);
      slider.scrollLeft = from + distance * ease(progress);
      if(progress < 1){
        animationFrame = requestAnimationFrame(frame);
      }else{
        animationFrame = null;
        slider.scrollLeft = target;
        update();
        done?.();
      }
    };
    animationFrame = requestAnimationFrame(frame);
  };

  const schedule = (delay = 4700) => {
    clearTimer();
    if(reducedMotion || userInteracting || document.hidden || cards().length <= 1) return;
    timer = setTimeout(nextSlide, delay);
  };
  const nextSlide = () => {
    if(userInteracting || document.hidden) return schedule();
    const items = cards();
    if(items.length <= 1) return;
    const end = isAtEnd();
    const target = end ? 0 : Math.min(maxScroll(), slider.scrollLeft + stepSize());
    animateTo(target, end ? 1900 : 1650, () => schedule(4700));
  };

  slider.addEventListener('scroll', () => {
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(update, 80);
  }, {passive:true, signal});

  slider.addEventListener('touchstart', () => {
    userInteracting = true;
    clearTimer();
    cancelAnimation();
  }, {passive:true, signal});
  slider.addEventListener('touchend', () => {
    userInteracting = false;
    update();
    schedule(3000);
  }, {passive:true, signal});

  dots.addEventListener('click', event => {
    const button = event.target.closest('button[data-index]');
    if(!button) return;
    const index = Number(button.dataset.index);
    const items = cards();
    const item = items[index];
    if(!item) return;
    clearTimer();
    const target = index === items.length - 1 ? maxScroll() : item.offsetLeft;
    animateTo(target, 1250, () => schedule(4200));
  }, {signal});

  document.addEventListener('visibilitychange', () => {
    if(document.hidden){ clearTimer(); cancelAnimation(); }
    else schedule(1600);
  }, {signal});

  const resizeObserver = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => {
    slider.scrollLeft = Math.min(slider.scrollLeft, maxScroll());
    update();
  }) : null;
  resizeObserver?.observe(slider);

  slider.__autoSlideStop = () => {
    clearTimer();
    cancelAnimation();
    resizeObserver?.disconnect();
    controller.abort();
  };

  requestAnimationFrame(() => {
    slider.scrollLeft = 0;
    update();
    schedule(2600);
  });
}
function initSearchForm(formId, inputId, targetBuilder){
  const form = document.getElementById(formId);
  const input = document.getElementById(inputId);
  if(!form || !input) return;
  form.addEventListener('submit', event => {
    event.preventDefault();
    const q = input.value.trim();
    location.href = targetBuilder ? targetBuilder(q) : `catalog.html?q=${encodeURIComponent(q)}`;
  });
}
async function initHome(){
  updateCartCount();
  let renderedCategories = [];
  let renderedOffers = [];
  const holder = document.getElementById('homeCategories');
  if(holder) holder.innerHTML = skeletonCards(8);
  initSearchForm('homeSearchForm','homeSearchInput', q => `catalog.html${q ? '?q=' + encodeURIComponent(q) : ''}`);

  const renderCategories = categories => {
    renderedCategories = categories || [];
    if(!holder) return;
    holder.classList.remove('skeleton-grid');
    holder.innerHTML = categories.length ? categories.map(categoryCard).join('') : `<div class="empty-card"><h2>No categories added</h2><p>Add categories from the admin panel.</p></div>`;
    attachCategoryWarmup(holder);
  };
  const renderOffers = offers => {
    renderedOffers = offers || [];
    const section = document.getElementById('offerSection');
    const slider = document.getElementById('offerSlider');
    if(!section || !slider) return;
    if(!offers || !offers.length){ section.classList.add('hidden'); return; }
    section.classList.remove('hidden');
    slider.innerHTML = offers.map((offer, index) => offerCard(offer, index)).join('');
    let dots = section.querySelector('.offer-dots');
    if(!dots){
      dots = document.createElement('div');
      dots.className = 'offer-dots';
      section.appendChild(dots);
    }
    dots.innerHTML = offers.map((_, index) => `<button type="button" data-index="${index}" aria-label="Show offer ${index + 1}"></button>`).join('');
    dots.classList.toggle('hidden', offers.length <= 1);
    bindOfferDots(slider, dots);
  };
  const [categories, offers] = await Promise.all([loadCategories(false), loadOffers(false)]);
  renderOffers(offers);
  renderCategories(categories);
  categories.slice(0,8).forEach(c => preloadImage(c.image));
  offers.slice(0,4).forEach(o => preloadImage(o.image));
  if(typeof subscribeToStoreUpdates === 'function' && !window.__welloneHomeLiveBound){
    window.__welloneHomeLiveBound = true;
    let homeRefreshTimer = null;
    subscribeToStoreUpdates(change => {
      const tables = Array.isArray(change && change.tables) ? change.tables.map(cleanText) : [cleanText(change && change.table)].filter(Boolean);
      const has = table => tables.includes(table);
      const isBroad = !tables.length;
      clearTimeout(homeRefreshTimer);
      homeRefreshTimer = setTimeout(() => {
        if(isBroad || has('products') || has('categories')){
          loadCategories(true).then(fresh => { if(!isSameData(renderedCategories, fresh)) renderCategories(fresh); }).catch(()=>{});
        }
        if(isBroad || has('offer_slides')){
          loadOffers(true).then(fresh => { if(!isSameData(renderedOffers, fresh)) renderOffers(fresh); }).catch(()=>{});
        }
      }, 180);
    });
  }
}
function updateCatalogAutoLoaderState(){
  const loader = document.getElementById('catalogAutoLoader');
  if(!loader) return;
  const hasMore = catalogState.nextOffset !== null && catalogState.nextOffset !== undefined;
  loader.classList.toggle('hidden', !hasMore);
  loader.classList.toggle('is-loading', hasMore && Boolean(catalogState.loading));
  loader.setAttribute('aria-busy', hasMore && catalogState.loading ? 'true' : 'false');
}
function maybeLoadNextCatalogPage(){
  if(catalogState.loading) return;
  if(catalogState.nextOffset === null || catalogState.nextOffset === undefined) return;
  loadCatalogProducts(false, {forceRefresh:true});
}
function setupCatalogAutoLoader(){
  const loader = document.getElementById('catalogAutoLoader');
  if(!loader || loader.dataset.bound === 'true') return;
  loader.dataset.bound = 'true';
  if('IntersectionObserver' in window){
    catalogAutoObserver = new IntersectionObserver(entries => {
      if(entries.some(entry => entry.isIntersecting)) maybeLoadNextCatalogPage();
    }, {root:null, rootMargin:'500px 0px 500px', threshold:0.01});
    catalogAutoObserver.observe(loader);
    return;
  }
  catalogAutoScrollHandler = () => {
    if(catalogState.loading || catalogState.nextOffset === null || catalogState.nextOffset === undefined) return;
    const rect = loader.getBoundingClientRect();
    if(rect.top <= window.innerHeight + 500) maybeLoadNextCatalogPage();
  };
  window.addEventListener('scroll', catalogAutoScrollHandler, {passive:true});
  window.addEventListener('resize', catalogAutoScrollHandler, {passive:true});
}
async function initCatalog(){
  updateCartCount();
  const params = new URLSearchParams(location.search);
  catalogState.category = params.get('cat') || params.get('category') || '';
  catalogState.query = params.get('q') || '';
  catalogState.subcategory = params.get('sub') || '';
  catalogState.sort = params.get('sort') || 'newest';
  catalogState.global = !catalogState.category && !!catalogState.query;
  updateCatalogSeo();
  const searchInput = document.getElementById('catalogSearchInput');
  if(searchInput) searchInput.value = catalogState.query;
  updateSortButton();
  initCatalogEvents();
  bindCatalogViewPersistence();
  setupCatalogAutoLoader();
  bindCatalogLiveUpdates();

  const categories = await loadCategories(false);
  if(!catalogState.category && !catalogState.query){
    document.getElementById('categorySection')?.classList.remove('hidden');
    document.getElementById('productsSection')?.classList.add('hidden');
    renderCategoryHero();
    document.getElementById('activeCategoryTools')?.classList.add('hidden');
    renderCatalogCategories(categories);
    return;
  }
  document.getElementById('categorySection')?.classList.add('hidden');
  document.getElementById('productsSection')?.classList.remove('hidden');
  document.getElementById('activeCategoryTools')?.classList.remove('hidden');
  if(catalogState.category){
    const realCategory = categories.find(cat => sameName(cat.name, catalogState.category));
    catalogState.category = realCategory ? realCategory.name : catalogState.category;
    catalogState.global = false;
    updateCatalogSeo();
    await renderFilterChips({forceRefresh:false, reloadIfSelectionRemoved:false, allowEmpty:true});
  }else{
    catalogState.global = true;
    hideFiltersForGlobalSearch();
  }
  const restored = restoreCatalogView();
  if(restored){
    await loadCatalogProducts(true, {
      silent: true,
      forceRefresh: true,
      limit: Math.max(INITIAL_PAGE_LIMIT, catalogState.products.length),
      preserveScrollY: Number(restored.scrollY || 0)
    });
  }else{
    await loadCatalogProducts(true, {forceRefresh:true});
  }
}
function initCatalogEvents(){
  const form = document.getElementById('catalogSearchForm');
  const input = document.getElementById('catalogSearchInput');
  const sortBtn = document.getElementById('sortButton');
  const filterToggle = document.getElementById('filterToggle');
  if(form && input) form.addEventListener('submit', event => {
    event.preventDefault();
    const q = input.value.trim();
    catalogState.query = q;
    catalogState.offset = 0;
    if(!catalogState.category) catalogState.global = !!q;
    updateCatalogUrl();
    if(!catalogState.category && !q){ location.href = 'catalog.html'; return; }

    // The catalog opens in category-list mode. Switch to the product-results
    // view before running a search so the returned products are visible.
    document.getElementById('categorySection')?.classList.add('hidden');
    document.getElementById('productsSection')?.classList.remove('hidden');
    document.getElementById('activeCategoryTools')?.classList.remove('hidden');

    if(!catalogState.category) hideFiltersForGlobalSearch();
    loadCatalogProducts(true);
  });
  if(sortBtn) sortBtn.addEventListener('click', openSortSheet);
  if(filterToggle) filterToggle.addEventListener('click', () => document.getElementById('filterChips')?.classList.toggle('hidden'));
}
function updateCatalogUrl(){
  const params = new URLSearchParams();
  if(catalogState.category) params.set('cat', catalogState.category);
  if(catalogState.query) params.set('q', catalogState.query);
  if(catalogState.subcategory && catalogState.category) params.set('sub', catalogState.subcategory);
  if(catalogState.sort && catalogState.sort !== 'newest') params.set('sort', catalogState.sort);
  history.replaceState(null, '', `catalog.html${params.toString() ? '?' + params.toString() : ''}`);
  updateCatalogSeo();
}
function renderCatalogCategories(categories){
  const grid = document.getElementById('categoryGrid');
  if(!grid) return;
  grid.classList.remove('skeleton-grid');
  grid.innerHTML = categories.length ? categories.map(categoryCard).join('') : `<div class="empty-card"><h2>No category found</h2><p>Add categories from admin.</p></div>`;
  attachCategoryWarmup(grid);
}
function hideFiltersForGlobalSearch(){
  const chipBox = document.getElementById('filterChips');
  const filterToggle = document.getElementById('filterToggle');
  if(chipBox){ chipBox.innerHTML = ''; chipBox.classList.add('hidden'); }
  if(filterToggle) filterToggle.classList.add('hidden');
}
function patchFilterChipDom(chipBox, subs){
  const desired = ['', ...(subs || [])];
  const existing = new Map(Array.from(chipBox.querySelectorAll('[data-sub]')).map(button => [cleanKey(button.dataset.sub || '__all__'), button]));
  const fragment = document.createDocumentFragment();
  desired.forEach(name => {
    const mapKey = cleanKey(name || '__all__');
    let button = existing.get(mapKey);
    if(!button){
      button = document.createElement('button');
      button.className = 'chip';
      button.type = 'button';
      button.dataset.sub = name;
    }
    const label = name || 'All';
    if(button.textContent !== label) button.textContent = label;
    button.classList.toggle('active', sameName(name, catalogState.subcategory));
    fragment.appendChild(button);
  });
  existing.forEach((button, mapKey) => {
    if(!desired.some(name => cleanKey(name || '__all__') === mapKey)) button.remove();
  });
  chipBox.appendChild(fragment);
}
async function renderFilterChips(options = {}){
  const chipBox = document.getElementById('filterChips');
  if(!chipBox || !catalogState.category) return false;
  const renderId = ++filterRenderSerial;
  const categoryAtStart = catalogState.category;
  const forceRefresh = Boolean(options.forceRefresh);
  let subs;
  try{
    subs = await loadSubcategories(categoryAtStart, forceRefresh);
  }catch(_error){
    return false;
  }
  if(renderId !== filterRenderSerial || !sameName(categoryAtStart, catalogState.category)) return false;

  const selectedStillExists = !catalogState.subcategory || subs.some(name => sameName(name, catalogState.subcategory));
  if(!selectedStillExists){
    catalogState.subcategory = '';
    catalogState.offset = 0;
    updateCatalogUrl();
  }

  const oldNames = cleanText(chipBox.dataset.names || '');
  const newNames = JSON.stringify(subs || []);
  const listChanged = oldNames !== newNames;
  if(listChanged || !chipBox.querySelector('[data-sub]')){
    patchFilterChipDom(chipBox, subs);
    chipBox.dataset.names = newNames;
  }else{
    chipBox.querySelectorAll('[data-sub]').forEach(button => button.classList.toggle('active', sameName(button.dataset.sub || '', catalogState.subcategory)));
  }

  const filterToggle = document.getElementById('filterToggle');
  const mayHideEmpty = options.allowEmpty === true || !chipBox.querySelector('[data-sub]');
  if(subs.length){
    if(filterToggle) filterToggle.classList.remove('hidden');
    chipBox.classList.remove('hidden');
  }else if(mayHideEmpty){
    if(filterToggle) filterToggle.classList.add('hidden');
    chipBox.classList.add('hidden');
  }

  if(chipBox.dataset.clickBound !== 'true'){
    chipBox.dataset.clickBound = 'true';
    chipBox.addEventListener('click', event => {
      const btn = event.target.closest('[data-sub]');
      if(!btn || !chipBox.contains(btn)) return;
      const nextSubcategory = btn.dataset.sub || '';
      if(sameName(nextSubcategory, catalogState.subcategory)) return;
      catalogState.subcategory = nextSubcategory;
      catalogState.offset = 0;
      chipBox.querySelectorAll('.chip').forEach(item => item.classList.toggle('active', item === btn));
      updateCatalogUrl();
      const instantMatches = nextSubcategory
        ? (catalogState.products || []).filter(product => sameName(product.Subcategory, nextSubcategory))
        : (catalogState.products || []);
      const grid = document.getElementById('productGrid');
      if(grid && instantMatches.length) patchProductGrid(grid, instantMatches);
      // Keep the current cards visible and atomically replace only after the new result is ready.
      loadCatalogProducts(true, {forceRefresh:true, silent:true, preserveScrollY:window.scrollY || 0});
    });
  }

  if(!selectedStillExists && options.reloadIfSelectionRemoved !== false){
    loadCatalogProducts(true, {forceRefresh:true, silent:true, preserveScrollY:window.scrollY || 0});
  }
  return listChanged;
}

async function loadCatalogProducts(reset, behavior = {}){
  if(!reset && catalogState.loading) return;
  const requestId = ++catalogRequestSerial;
  const requestFingerprint = currentCatalogFingerprint();
  catalogState.loading = true;
  const grid = document.getElementById('productGrid');
  const productsSection = document.getElementById('productsSection');
  const silent = Boolean(behavior.silent);
  const transition = Boolean(behavior.transition) && Boolean(grid && catalogState.products.length);
  const forceRefresh = behavior.forceRefresh === undefined ? Boolean(reset) : Boolean(behavior.forceRefresh);
  const requestOffset = reset ? 0 : catalogState.offset;
  const preserveScrollY = Number.isFinite(Number(behavior.preserveScrollY)) ? Math.max(0, Number(behavior.preserveScrollY)) : null;

  if(reset){
    catalogState.offset = 0;
    catalogState.nextOffset = null;
    if(transition){
      productsSection?.classList.add('is-switching-products');
    }else if(!silent){
      catalogState.products = [];
      if(grid) grid.innerHTML = skeletonCards(6, 'skeleton-product');
    }
  }
  updateCatalogAutoLoaderState();

  const requestedLimit = Number(behavior.limit || 0);
  const pageLimit = requestedLimit > 0 ? requestedLimit : (reset ? INITIAL_PAGE_LIMIT : LOAD_MORE_PAGE_LIMIT);
  const options = {
    offset: requestOffset,
    limit: pageLimit,
    query: catalogState.query,
    subcategory: catalogState.subcategory,
    sort: catalogState.sort,
    useCache: !forceRefresh,
    forceRefresh
  };

  let pack;
  try{
    pack = catalogState.global
      ? await searchGlobalProducts(catalogState.query, options)
      : await loadCategoryPage(catalogState.category, options);
  }catch(_error){
    if(requestId !== catalogRequestSerial) return;
    catalogState.loading = false;
    productsSection?.classList.remove('is-switching-products');
    updateCatalogAutoLoaderState();
    if(reset && grid && !silent && !transition){
      grid.classList.remove('skeleton-grid');
      grid.innerHTML = `<div class="empty-card"><h2>Products could not load</h2><p>Please check your connection and try again.</p></div>`;
    }
    if(catalogRefreshPending){ catalogRefreshPending = false; setTimeout(refreshVisibleCatalogFromNetwork, 0); }
    return;
  }

  if(requestId !== catalogRequestSerial || requestFingerprint !== currentCatalogFingerprint()) return;
  lastCatalogNetworkLoadAt = Date.now();
  catalogState.loading = false;
  productsSection?.classList.remove('is-switching-products');

  const newProducts = pack.products || [];
  const unchangedSilentReset = reset && silent && isSameData(catalogState.products || [], newProducts);
  catalogState.nextOffset = pack.nextOffset;
  catalogState.offset = pack.nextOffset ?? (reset ? newProducts.length : requestOffset + newProducts.length);
  if(unchangedSilentReset){
    updateCatalogAutoLoaderState();
    persistCatalogView();
    return;
  }

  if(reset){
    catalogState.products = newProducts;
  }else{
    const seen = new Set((catalogState.products || []).map(product => cleanText(product.ID)));
    const uniqueNewProducts = newProducts.filter(product => {
      const id = cleanText(product.ID);
      if(!id || seen.has(id)) return false;
      seen.add(id);
      return true;
    });
    catalogState.products = catalogState.products.concat(uniqueNewProducts);
  }

  if(!grid) return;
  grid.classList.remove('skeleton-grid');
  if(!catalogState.products.length){
    grid.innerHTML = `<div class="empty-card"><h2>No items found</h2><p>Try another word, filter, or category.</p></div>`;
  }else if(reset){
    patchProductGrid(grid, catalogState.products);
  }else if(newProducts.length){
    const renderedIds = new Set(Array.from(grid.querySelectorAll('[data-product-id]')).map(node => cleanText(node.dataset.productId)));
    const productsToAppend = newProducts.filter(product => !renderedIds.has(cleanText(product.ID)));
    if(productsToAppend.length) grid.insertAdjacentHTML('beforeend', productsToAppend.map(product => productCard(product, product.Category || catalogState.category)).join(''));
  }

  requestAnimationFrame(() => {
    newProducts.slice(0,4).forEach(product => preloadImage(firstImage((product.Variants && product.Variants[0] && product.Variants[0].images) || product.Images, product.Image)));
    if(preserveScrollY !== null) window.scrollTo({top:preserveScrollY, behavior:'auto'});
  });
  updateCatalogAutoLoaderState();
  renderCategoryHero();
  persistCatalogView();
  if(catalogRefreshPending){
    catalogRefreshPending = false;
    setTimeout(refreshVisibleCatalogFromNetwork, 0);
  }
}
function bindCatalogLiveUpdates(){
  if(window.__welloneCatalogLiveBound || typeof subscribeToStoreUpdates !== 'function') return;
  window.__welloneCatalogLiveBound = true;
  subscribeToStoreUpdates(change => {
    const tables = Array.isArray(change && change.tables) ? change.tables.map(cleanText).filter(Boolean) : [];
    if(!tables.length) return;
    const has = table => tables.includes(table);
    clearTimeout(catalogLiveRefreshTimer);
    catalogLiveRefreshTimer = setTimeout(async () => {
      if(!catalogState.category && !catalogState.query){
        if(has('products') || has('categories')){
          loadCategories(true).then(fresh => renderCatalogCategories(fresh)).catch(()=>{});
        }
        return;
      }
      if(catalogState.category && (has('subcategories') || has('products'))){
        await renderFilterChips({forceRefresh:true, reloadIfSelectionRemoved:true, allowEmpty:true}).catch(()=>{});
      }
      if(has('products') || has('product_variants') || has('product_images') || has('categories') || has('subcategories')){
        refreshVisibleCatalogFromNetwork();
      }
    }, 35);
  });
}
function refreshVisibleCatalogFromNetwork(){
  if(!document.getElementById('productGrid') || (!catalogState.category && !catalogState.query)) return;
  if(catalogState.loading){ catalogRefreshPending = true; return; }
  loadCatalogProducts(true, {
    silent: true,
    forceRefresh: true,
    limit: Math.max(INITIAL_PAGE_LIMIT, catalogState.products.length || 0),
    preserveScrollY: window.scrollY || 0
  });
}

function openSortSheet(){
  closeChoiceModal();
  const html = SORT_OPTIONS.map(opt => `<button class="choice-row ${opt.value === catalogState.sort ? 'active' : ''}" type="button" onclick="selectSort('${opt.value}')"><span>${escapeHtml(opt.label)}</span>${opt.value === catalogState.sort ? '<b>✓</b>' : ''}</button>`).join('');
  document.body.insertAdjacentHTML('beforeend', `<div id="choiceModal" class="choice-modal" onclick="if(event.target===this) closeChoiceModal()"><div class="choice-card"><div class="choice-head"><b>Sort products</b><button type="button" onclick="closeChoiceModal()"><span>×</span></button></div><div class="choice-list">${html}</div></div></div>`);
}
function selectSort(value){
  catalogState.sort = value || 'newest';
  catalogState.offset = 0;
  updateSortButton();
  updateCatalogUrl();
  closeChoiceModal();
  loadCatalogProducts(true);
}
function closeChoiceModal(){ document.getElementById('choiceModal')?.remove(); }
async function initProduct(){
  updateCartCount();
  const params = new URLSearchParams(location.search);
  const categoryName = params.get('cat') || '';
  const productId = params.get('id') || '';
  const holder = document.getElementById('productDetail');
  const instantProduct = getProductFromInstantCache(categoryName, productId);
  if(instantProduct && holder){
    activeProduct = instantProduct;
    activeSizeIndex = 0;
    activeColorIndex = 0;
    activeImageIndex = 0;
    applyProductSelectionFromUrl(instantProduct, params);
    renderProductDetail();
  }else if(holder){
    holder.innerHTML = `<div class="product-detail-skeleton"><div class="shimmer"></div><div><b></b><span></span><span></span><button></button></div></div>`;
  }
  await loadCategories(false);
  const product = await findProduct(categoryName, productId, {forceRefresh:true});
  if(!product || cleanText(product.Status || 'active') !== 'active' || !holder){
    if(holder) holder.innerHTML = `<div class="empty-card"><h2>Product not found</h2><p>Please open the item again from catalog.</p></div>`;
    return;
  }
  activeProduct = product;
  activeSizeIndex = 0;
  activeColorIndex = 0;
  activeImageIndex = 0;
  applyProductSelectionFromUrl(product, params);
  renderProductDetail();
  bindProductLiveUpdates(categoryName, productId);
}

function bindProductLiveUpdates(categoryName, productId){
  if(window.__welloneProductLiveBound || typeof subscribeToStoreUpdates !== 'function') return;
  window.__welloneProductLiveBound = true;
  subscribeToStoreUpdates(change => {
    const tables = Array.isArray(change && change.tables) ? change.tables.map(cleanText) : [cleanText(change && change.table)].filter(Boolean);
    const relevant = !tables.length || tables.some(table => ['products','product_variants','product_images','categories','subcategories'].includes(table));
    if(!relevant) return;
    clearTimeout(productLiveRefreshTimer);
    productLiveRefreshTimer = setTimeout(async () => {
      try{
        const fresh = await findProduct(categoryName, productId, {forceRefresh:true});
        const holder = document.getElementById('productDetail');
        if(!fresh || cleanText(fresh.Status || 'active') !== 'active'){
          if(holder) holder.innerHTML = `<div class="empty-card"><h2>Product not found</h2><p>This item is no longer available.</p></div>`;
          return;
        }
        if(isSameData(activeProduct, fresh)) return;
        const params = new URLSearchParams(location.search);
        activeProduct = fresh;
        applyProductSelectionFromUrl(fresh, params);
        activeImageIndex = Math.min(activeImageIndex, Math.max(0, productImages(fresh).length - 1));
        renderProductDetail();
      }catch(_error){}
    }, 50);
  });
}
function variantPriceLine(product, variant){
  return `<small>Select this option</small>`;
}
function productOptionTitle(product){
  const explicit = cleanText(product && (product.OptionTitle || product.optionTitle));
  if(explicit) return explicit;
  const labels = ((product && product.Variants) || []).map(v => cleanText(v.label)).join(' ').toLowerCase();
  const sizes = cleanText(product && product.Sizes).toLowerCase();
  const source = `${labels} ${sizes}`;
  if(/\b(ml|mg|g|kg|ltr|liter|litre|l)\b/.test(source) || /\d+\s*(ml|mg|g|kg|ltr|liter|litre|l)/.test(source)) return 'Quantity';
  if(/\b(metre|meter|mtr|cm|inch|ft)\b/.test(source)) return 'Measurement';
  if(/\b(size|uk|eu)\b/.test(source) || /(^|[,\s])\d{1,2}([,\s]|$)/.test(source)) return 'Size';
  return 'Option';
}
function hasSelectableOptions(product){
  const variants = (product && product.Variants) || [];
  if(variants.length > 1) return true;
  const only = variants[0] && cleanText(variants[0].label);
  return !!(only && only.toLowerCase() !== 'standard');
}
function isColorVariantMode(product){
  return !!(product && product.VariantMode === 'color' && Array.isArray(product.Variants) && product.Variants.length);
}
function selectedProductVariant(product = activeProduct){
  if(!product) return {};
  return product.Variants[activeVariantIndex] || product.Variants[0] || {};
}
function selectedSizeOptions(product = activeProduct, variant = selectedProductVariant(product)){
  const list = Array.isArray(variant && variant.sizeOptions) ? variant.sizeOptions.map(cleanText).filter(Boolean) : [];
  if(list.length) return list;
  const main = splitOptions(product && product.Sizes || '').filter(Boolean);
  return main.length ? main : ['Standard'];
}
function selectedSizeText(){
  const options = selectedSizeOptions();
  return options[activeSizeIndex] || options[0] || 'Standard';
}
function standaloneColors(product = activeProduct){
  const values = splitOptions(product && product.Colors || '');
  return (values.length === 1 && cleanKey(values[0]) === 'default') ? [] : values;
}
function selectedStandaloneColorText(product = activeProduct){
  const colors = standaloneColors(product);
  return colors[activeColorIndex] || colors[0] || 'Default';
}
function currentProductRelativeUrl(product = activeProduct){
  if(!product) return 'product.html';
  const params = new URLSearchParams();
  const category = cleanText(product.Category || new URLSearchParams(location.search).get('cat'));
  const id = cleanText(product.ID || new URLSearchParams(location.search).get('id'));
  if(category) params.set('cat', category);
  if(id) params.set('id', id);
  const variant = selectedProductVariant(product);
  const colorMode = isColorVariantMode(product);
  if(colorMode){
    const color = cleanText(variant.color || variant.label);
    if(color && cleanKey(color) !== 'default'){
      params.set('variant', color);
      params.set('color', color);
    }
    const size = selectedSizeText();
    if(size && cleanKey(size) !== 'standard') params.set('size', size);
  }else{
    const variantLabel = cleanText(variant.label || 'Standard');
    if(variantLabel && cleanKey(variantLabel) !== 'standard') params.set('variant', variantLabel);
    const color = selectedStandaloneColorText(product);
    if(color && cleanKey(color) !== 'default') params.set('color', color);
  }
  return `product.html${params.toString() ? '?' + params.toString() : ''}`;
}
function currentProductAbsoluteUrl(product = activeProduct){ return absoluteWelloneUrl(currentProductRelativeUrl(product)); }
function applyProductSelectionFromUrl(product, params = new URLSearchParams(location.search)){
  if(!product) return;
  const variants = Array.isArray(product.Variants) ? product.Variants : [];
  const wantedVariant = cleanText(params.get('variant'));
  const wantedColor = cleanText(params.get('color'));
  const wantedSize = cleanText(params.get('size'));
  const colorMode = isColorVariantMode(product);
  let variantIndex = -1;
  if(variants.length){
    const wanted = colorMode ? (wantedColor || wantedVariant) : (wantedVariant || wantedSize);
    if(wanted){
      variantIndex = variants.findIndex(v => cleanKey(colorMode ? (v.color || v.label) : v.label) === cleanKey(wanted));
    }
    activeVariantIndex = variantIndex >= 0 ? variantIndex : firstAvailableVariantIndex(product);
  }else activeVariantIndex = 0;
  const variant = selectedProductVariant(product);
  const sizes = selectedSizeOptions(product, variant);
  const sizeIndex = wantedSize ? sizes.findIndex(size => cleanKey(size) === cleanKey(wantedSize)) : -1;
  activeSizeIndex = sizeIndex >= 0 ? sizeIndex : 0;
  const colors = standaloneColors(product);
  const colorIndex = wantedColor ? colors.findIndex(color => cleanKey(color) === cleanKey(wantedColor)) : -1;
  activeColorIndex = colorIndex >= 0 ? colorIndex : 0;
}
function syncProductSelectionUrl(product = activeProduct){
  if(!product || !document.body.classList.contains('product-page')) return;
  const relative = currentProductRelativeUrl(product);
  const current = `${location.pathname.split('/').pop() || 'product.html'}${location.search}`;
  if(current !== relative) history.replaceState(null, '', relative);
}
function selectedProductDescriptor(product = activeProduct){
  if(!product) return '';
  const variant = selectedProductVariant(product);
  const parts = [];
  if(isColorVariantMode(product)){
    const color = cleanText(variant.color || variant.label);
    if(color && cleanKey(color) !== 'default') parts.push(color);
    const size = selectedSizeText();
    if(size && cleanKey(size) !== 'standard') parts.push(size);
  }else{
    const label = cleanText(variant.label || 'Standard');
    if(label && cleanKey(label) !== 'standard') parts.push(label);
    const color = selectedStandaloneColorText(product);
    if(color && cleanKey(color) !== 'default') parts.push(color);
  }
  return parts.join(' • ');
}
function updateProductSeo(product = activeProduct, variant = selectedProductVariant(product), images = productGalleryImages(product, variant)){
  if(!product || !document.body.classList.contains('product-page')) return;
  const descriptor = selectedProductDescriptor(product);
  const title = `${product.Name}${descriptor ? ' - ' + descriptor : ''} | Wellone`;
  const descriptionBase = cleanText(product.Description || `Shop ${product.Name} from Wellone Fancy & Footwear.`);
  const description = `${descriptionBase}${descriptor ? ` Selected option: ${descriptor}.` : ''}`.slice(0, 300);
  const url = currentProductAbsoluteUrl(product);
  const image = absoluteWelloneUrl((images && images[0]) || product.Image || 'assets/logo.png');
  updateCommonSeo({title, description, url, image, type:'product'});
  const price = money((variant && variant.price) || product.Price || 0);
  const available = productIsAvailable(product, variant);
  const structured = {
    '@context':'https://schema.org',
    '@type':'Product',
    '@id':url + '#product',
    name:product.Name + (descriptor ? ` - ${descriptor}` : ''),
    description,
    image:(images || []).map(img => absoluteWelloneUrl(img)).slice(0,8),
    sku:[product.ID, descriptor].filter(Boolean).join('-'),
    category:[product.Category, product.Subcategory].filter(Boolean).join(' > '),
    brand:{'@type':'Brand',name:'Wellone'}
  };
  if(price > 0){
    structured.offers = {
      '@type':'Offer',url,priceCurrency:'INR',price:String(price),
      availability:available ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      itemCondition:'https://schema.org/NewCondition',
      seller:{'@type':'Organization',name:'Wellone Fancy & Footwear'}
    };
  }
  const color = isColorVariantMode(product) ? cleanText(variant.color || variant.label) : selectedStandaloneColorText(product);
  const size = isColorVariantMode(product) ? selectedSizeText() : cleanText(variant.label);
  if(color && cleanKey(color) !== 'default') structured.color = color;
  if(size && cleanKey(size) !== 'standard') structured.size = size;
  upsertProductStructuredData(structured);
  setDocumentMeta('meta[property="product:price:amount"]', 'content', String(price || 0));
  setDocumentMeta('meta[property="product:price:currency"]', 'content', 'INR');
}
function hasVisibleSizes(product = activeProduct, variant = selectedProductVariant(product)){
  const options = selectedSizeOptions(product, variant);
  return options.length > 1 || (options[0] && cleanKey(options[0]) !== 'standard');
}
function selectedVariantText(){
  const product = activeProduct;
  if(!product) return 'Select option';
  const variant = product.Variants[activeVariantIndex] || product.Variants[0] || {};
  return `${variant.label || 'Standard'}`;
}
// Add a future selectable policy here, then add its SVG path in policyIconSvg().
const FIXED_PRODUCT_TERMS = Object.freeze([
  {key:'exchange', label:'7 Day Exchange Policy', description:'Eligible items can be exchanged within 7 days.'},
  {key:'delivery', label:'Free Delivery', description:'No delivery charge for this product.'},
  {key:'no-return', label:'No Return Allowed', description:'Returns and refunds are not available.'},
  {key:'pay-delivery', label:'Pay on Delivery', description:'Pay when your order is delivered.'},
  {key:'secure', label:'Secure Transaction', description:'Your order details are handled securely.'}
]);
function policyKeyFromLabel(value){
  const label = cleanKey(value);
  if(!label) return '';
  if(label.includes('exchange')) return 'exchange';
  if((label.includes('free') || label.includes('nocharge')) && (label.includes('delivery') || label.includes('shipping'))) return 'delivery';
  if((label.includes('no') || label.includes('non')) && (label.includes('return') || label.includes('refund'))) return 'no-return';
  if(label.includes('payondelivery') || label.includes('cashondelivery') || label === 'cod') return 'pay-delivery';
  if(label.includes('secure') && (label.includes('transaction') || label.includes('payment') || label.includes('order'))) return 'secure';
  return '';
}
function selectedPolicyTerms(value){
  const selectedKeys = new Set(parseTerms(value).map(policyKeyFromLabel).filter(Boolean));
  return FIXED_PRODUCT_TERMS.filter(term => selectedKeys.has(term.key));
}
function policyIconSvg(type){
  const icons = {
    exchange:'<path d="M7 7h10l-2.5-2.5M17 17H7l2.5 2.5"/><path d="M17 7l2.5 2.5L17 12M7 17l-2.5-2.5L7 12"/>',
    delivery:'<path d="M3 6h11v10H3z"/><path d="M14 10h4l3 3v3h-7z"/><circle cx="7" cy="18" r="2"/><circle cx="18" cy="18" r="2"/>',
    'no-return':'<path d="M9 7H5v4"/><path d="M5.5 10.5A7 7 0 0 1 18 8"/><path d="M18.5 13.5A7 7 0 0 1 7 17"/><path d="M4 4l16 16"/>',
    'pay-delivery':'<path d="M4 7h13a2 2 0 0 1 2 2v9H4z"/><path d="M4 7l2-3h11l2 3"/><circle cx="15.5" cy="13" r="2.5"/><path d="M15.5 11.5v3M14.5 12.2h1.5M14.5 13.8h1.5"/>',
    secure:'<path d="M12 3l7 3v5c0 4.7-2.8 8.1-7 10-4.2-1.9-7-5.3-7-10V6z"/><path d="M8.5 12.5l2.2 2.2 4.8-5"/>'
  };
  return `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${icons[type] || icons.secure}</svg>`;
}
function variantIsAvailable(variant){
  return !variant || cleanText(variant.stockStatus || variant.stock_status || 'in_stock') !== 'out_of_stock';
}
function firstAvailableVariantIndex(product){
  const variants = Array.isArray(product && product.Variants) ? product.Variants : [];
  const index = variants.findIndex(variantIsAvailable);
  return index >= 0 ? index : 0;
}
function productIsAvailable(product, variant = null){
  if(!product || cleanText(product.Status || 'active') !== 'active' || cleanText(product.StockStatus || 'in_stock') === 'out_of_stock') return false;
  if(variant && !variantIsAvailable(variant)) return false;
  const variants = Array.isArray(product.Variants) ? product.Variants : [];
  return !variants.length || variants.some(variantIsAvailable);
}
function productStockNote(product, variant = null){
  if(productIsAvailable(product, variant)) return '';
  if(product && cleanText(product.StockStatus || 'in_stock') !== 'out_of_stock' && variant && !variantIsAvailable(variant)){
    const label = cleanText(variant.color || variant.label || 'Selected option');
    return `<div class="stock-alert">${escapeHtml(label)} is currently out of stock. Choose another available option.</div>`;
  }
  return '<div class="stock-alert">Currently out of stock. Contact the shop to check availability.</div>';
}
function productGalleryImages(product, variant){
  const list = [];
  const add = (value) => {
    if(!value) return;
    if(Array.isArray(value)){ value.forEach(add); return; }
    const text = cleanText(value);
    if(text && !list.includes(text)) list.push(text);
  };
  if(variant && variant.hasOwnImages && Array.isArray(variant.images) && variant.images.length){
    add(variant.images);
  }else{
    add(product && product.Images);
    add(product && product.Image);
  }
  if(!list.length) list.push(fallbackImageSync(product && product.Category));
  return list;
}
let productGallerySwipeX = 0;
let productGallerySwipeY = 0;
let productGalleryDidSwipe = false;
function productGalleryTouchStart(event){
  const touch = event.touches && event.touches[0];
  if(!touch) return;
  productGallerySwipeX = touch.clientX;
  productGallerySwipeY = touch.clientY;
  productGalleryDidSwipe = false;
}
function productGalleryTouchEnd(event){
  const touch = event.changedTouches && event.changedTouches[0];
  if(!touch || !activeProduct) return;
  const dx = touch.clientX - productGallerySwipeX;
  const dy = touch.clientY - productGallerySwipeY;
  if(Math.abs(dx) < 34 || Math.abs(dx) < Math.abs(dy) * 1.2) return;
  productGalleryDidSwipe = true;
  setTimeout(() => { productGalleryDidSwipe = false; }, 420);
  const variant = activeProduct.Variants[activeVariantIndex] || activeProduct.Variants[0] || {};
  const images = productGalleryImages(activeProduct, variant);
  if(images.length < 2) return;
  activeImageIndex = (activeImageIndex + (dx < 0 ? 1 : -1) + images.length) % images.length;
  renderProductDetail();
}
function renderProductDetail(){
  const holder = document.getElementById('productDetail');
  const product = activeProduct;
  if(!holder || !product) return;
  const variant = selectedProductVariant(product);
  const colorMode = isColorVariantMode(product);
  const sizeOptions = selectedSizeOptions(product, variant);
  if(activeSizeIndex >= sizeOptions.length) activeSizeIndex = 0;
  const images = productGalleryImages(product, variant);
  if(activeImageIndex >= images.length) activeImageIndex = 0;
  const activeImage = optimizeImageUrl(images[activeImageIndex] || product.Image || fallbackImageSync(product.Category), 1000);
  const colorsRaw = splitOptions(product.Colors || '');
  const colors = (colorsRaw.length === 1 && colorsRaw[0].toLowerCase() === 'default') ? [] : colorsRaw;
  const terms = selectedPolicyTerms(product.Terms);
  const hasVariants = !colorMode && hasSelectableOptions(product);
  const optionTitle = productOptionTitle(product);
  holder.innerHTML = `<div class="detail-gallery compact-product-gallery">
      <div class="detail-main-img shimmer product-image-zoom-trigger" ontouchstart="productGalleryTouchStart(event)" ontouchend="productGalleryTouchEnd(event)" onclick="if(!productGalleryDidSwipe) openProductImageZoom()" role="button" tabindex="0" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openProductImageZoom()}" aria-label="Open ${escapeHtml(product.Name)} image viewer"><img src="${activeImage}" onload="this.parentElement.classList.remove('shimmer')" onerror="this.src='${fallbackImageSync(product.Category)}'" alt="${escapeHtml(product.Name)}" draggable="false"><span class="product-image-zoom-hint" aria-hidden="true">⌕</span></div>
      ${images.length > 1 ? `<div class="gallery-dots" aria-label="Image position">${images.map((_,i)=>`<button class="gallery-dot ${i===activeImageIndex?'active':''}" type="button" onclick="selectProductImage(${i})" aria-label="Show image ${i+1}"></button>`).join('')}</div><div class="thumb-row detail-thumb-strip" aria-label="Product images">${images.map((img,i)=>`<button class="thumb ${i===activeImageIndex?'active':''}" type="button" onclick="selectProductImage(${i})" aria-label="Show image ${i+1}"><img src="${optimizeImageUrl(img, 220)}" alt="${escapeHtml(product.Name)} thumbnail ${i+1}"></button>`).join('')}</div>` : ''}
    </div>
    <div class="detail-info old-product-panel compact-product-copy">
      <p class="tag product-path">${escapeHtml(product.Category)}${product.Subcategory ? ' • ' + escapeHtml(product.Subcategory) : ''}</p>
      <h1>${escapeHtml(product.Name)}</h1>
      ${product.Description ? `<p class="muted detail-description">${escapeHtml(product.Description)}</p>` : ''}
      ${priceHtml(product, variant)}
      <div class="detail-option-card">
        ${colorMode ? `<div class="option-block"><b>Choose colour</b><div class="color-variant-options">${product.Variants.map((v,i)=>{ const available = variantIsAvailable(v); return `<button class="color-variant-choice ${i===activeVariantIndex?'active':''} ${available?'':'is-out-stock'}" type="button" onclick="selectColorVariant(${i})" aria-pressed="${i===activeVariantIndex?'true':'false'}" ${available?'':`title="View and share this out-of-stock colour"`}><span>${escapeHtml(v.color || v.label || 'Colour')}</span>${available?'':'<small class="variant-stock-label">Out of stock</small>'}</button>`; }).join('')}</div></div>` : ''}
        ${hasVariants ? `<div class="option-block"><b>Choose ${escapeHtml(optionTitle)}</b><div class="size-variant-options option-variant-options">${product.Variants.map((v,i)=>{ const available = variantIsAvailable(v); return `<button class="size-variant-choice ${i===activeVariantIndex?'active':''} ${available?'':'is-out-stock'}" type="button" onclick="selectVariant(${i})" ${available?'':`title="View and share this out-of-stock option"`}><span>${escapeHtml(v.label || 'Standard')}</span>${available?'':'<small class="variant-stock-label">Out of stock</small>'}</button>`; }).join('')}</div></div>` : ''}
        ${colorMode && hasVisibleSizes(product, variant) ? `<div class="option-block"><b>Choose size</b><div class="size-variant-options">${sizeOptions.map((size,i)=>`<button class="size-variant-choice ${i===activeSizeIndex?'active':''}" type="button" onclick="selectSizeOption(${i})">${escapeHtml(size)}</button>`).join('')}</div></div>` : ''}
        ${!colorMode && colors.length ? `<div class="option-block"><b>Choose colour</b><div id="colorOptions" class="color-variant-options">${colors.map((c,i)=>`<button class="color-variant-choice ${i===activeColorIndex?'active':''}" type="button" onclick="activateColorChoice(this,${i})" aria-pressed="${i===activeColorIndex?'true':'false'}"><span>${escapeHtml(c)}</span></button>`).join('')}</div></div>` : ''}
        <div class="option-block"><b>Quantity</b><div class="qty"><button type="button" onclick="changeQty(-1)">−</button><span id="qty">1</span><button type="button" onclick="changeQty(1)">+</button></div></div>
      </div>
      ${terms.length ? `<section class="product-policy-section" aria-label="Product policies"><p class="product-policy-title">Product policies</p><div class="terms-grid compact-terms stylish-terms">${terms.map(term => `<article><span class="term-icon">${policyIconSvg(term.key)}</span><span class="term-copy"><b>${escapeHtml(term.label)}</b><small>${escapeHtml(term.description)}</small></span></article>`).join('')}</div></section>` : ''}
      ${productStockNote(product, variant)}
      <button class="btn primary full add-cart-button" ${productIsAvailable(product, variant) ? 'onclick="handleAddToCart()"' : 'disabled'}>${productIsAvailable(product, variant) ? 'Add to Cart' : 'Out of stock'}</button>
      <div class="detail-mini-actions"><button class="share-product-btn" type="button" onclick="shareProductLink()">Share selected option</button></div>
    </div>`;
  syncProductSelectionUrl(product);
  updateProductSeo(product, variant, images);
}
let productImageZoomLevel = 1;
let productImagePinchStartDistance = 0;
let productImagePinchStartZoom = 1;
let productImagePinchStartContentX = 0;
let productImagePinchStartContentY = 0;
let productImagePinchDidZoom = false;
function currentProductGallery(){
  if(!activeProduct) return [];
  return productGalleryImages(activeProduct, selectedProductVariant(activeProduct));
}
function productImageZoomSource(){
  const images = currentProductGallery();
  return images[activeImageIndex] || activeProduct?.Image || fallbackImageSync(activeProduct?.Category);
}
function openProductImageZoom(){
  if(!activeProduct) return;
  closeProductImageZoom();
  productImageZoomLevel = 1;
  const images = currentProductGallery();
  const thumbs = images.length > 1 ? `<div class="product-image-viewer-thumbs" aria-label="Select product image">${images.map((image,index)=>`<button class="product-image-viewer-thumb ${index===activeImageIndex?'active':''}" type="button" onclick="selectProductZoomImage(${index})" aria-label="Show image ${index+1}"><img src="${optimizeImageUrl(image,220)}" alt=""></button>`).join('')}</div>` : '';
  document.body.insertAdjacentHTML('beforeend', `<div id="productImageViewer" class="product-image-viewer" role="dialog" aria-modal="true" aria-label="${escapeHtml(activeProduct.Name)} image viewer" onclick="if(event.target===this) closeProductImageZoom()">
    <div class="product-image-viewer-panel">
      <div class="product-image-viewer-head"><span id="productImageViewerCount">${activeImageIndex+1} / ${Math.max(images.length,1)}</span><button class="product-image-viewer-close" type="button" onclick="closeProductImageZoom()" aria-label="Close image viewer">×</button></div>
      <div id="productImageZoomStage" class="product-image-zoom-stage" onwheel="handleProductImageZoomWheel(event)"><img id="productImageZoomed" src="${optimizeImageUrl(productImageZoomSource(),1800)}" alt="${escapeHtml(activeProduct.Name)}" onclick="if(!productImagePinchDidZoom) toggleProductImageZoom()" draggable="false"></div>
      ${images.length > 1 ? `<button class="product-image-viewer-nav prev" type="button" onclick="changeProductZoomImage(-1)" aria-label="Previous image">‹</button><button class="product-image-viewer-nav next" type="button" onclick="changeProductZoomImage(1)" aria-label="Next image">›</button>` : ''}
      <div class="product-image-zoom-controls" aria-label="Image zoom controls"><button type="button" onclick="setProductImageZoom(productImageZoomLevel-.5)" aria-label="Zoom out">−</button><button id="productImageZoomValue" type="button" onclick="setProductImageZoom(1)" aria-label="Reset zoom">100%</button><button type="button" onclick="setProductImageZoom(productImageZoomLevel+.5)" aria-label="Zoom in">+</button></div>
      ${thumbs}
    </div>
  </div>`);
  document.documentElement.classList.add('product-image-viewer-open');
  attachProductImagePinchZoom();
  requestAnimationFrame(() => {
    updateProductImageZoom(false);
    document.querySelector('#productImageViewer .product-image-viewer-close')?.focus();
  });
}
function closeProductImageZoom(){
  document.getElementById('productImageViewer')?.remove();
  document.documentElement.classList.remove('product-image-viewer-open');
  productImageZoomLevel = 1;
  productImagePinchStartDistance = 0;
  productImagePinchDidZoom = false;
}
function productImageTouchDistance(touches){
  if(!touches || touches.length < 2) return 0;
  return Math.hypot(touches[1].clientX - touches[0].clientX, touches[1].clientY - touches[0].clientY);
}
function productImageTouchCenter(touches, stage){
  const rect = stage.getBoundingClientRect();
  return {
    x: ((touches[0].clientX + touches[1].clientX) / 2) - rect.left,
    y: ((touches[0].clientY + touches[1].clientY) / 2) - rect.top
  };
}
function attachProductImagePinchZoom(){
  const stage = document.getElementById('productImageZoomStage');
  if(!stage || stage.dataset.pinchZoomReady === 'true') return;
  stage.dataset.pinchZoomReady = 'true';
  stage.addEventListener('touchstart', event => {
    if(event.touches.length !== 2) return;
    event.preventDefault();
    const center = productImageTouchCenter(event.touches, stage);
    productImagePinchStartDistance = productImageTouchDistance(event.touches);
    productImagePinchStartZoom = productImageZoomLevel;
    productImagePinchStartContentX = stage.scrollLeft + center.x;
    productImagePinchStartContentY = stage.scrollTop + center.y;
    productImagePinchDidZoom = false;
  }, {passive:false});
  stage.addEventListener('touchmove', event => {
    if(event.touches.length !== 2 || !productImagePinchStartDistance) return;
    event.preventDefault();
    const distance = productImageTouchDistance(event.touches);
    const center = productImageTouchCenter(event.touches, stage);
    const nextLevel = Math.max(1, Math.min(3, productImagePinchStartZoom * (distance / productImagePinchStartDistance)));
    productImagePinchDidZoom = true;
    productImageZoomLevel = Math.round(nextLevel * 100) / 100;
    updateProductImageZoom(false);
    const ratio = productImageZoomLevel / productImagePinchStartZoom;
    stage.scrollLeft = Math.max(0, productImagePinchStartContentX * ratio - center.x);
    stage.scrollTop = Math.max(0, productImagePinchStartContentY * ratio - center.y);
  }, {passive:false});
  const finishPinch = event => {
    if(!productImagePinchStartDistance || (event.touches && event.touches.length >= 2)) return;
    productImagePinchStartDistance = 0;
    if(productImagePinchDidZoom) setTimeout(() => { productImagePinchDidZoom = false; }, 450);
  };
  stage.addEventListener('touchend', finishPinch, {passive:true});
  stage.addEventListener('touchcancel', finishPinch, {passive:true});
}
function updateProductImageZoom(center = true){
  const stage = document.getElementById('productImageZoomStage');
  const image = document.getElementById('productImageZoomed');
  const value = document.getElementById('productImageZoomValue');
  if(!stage || !image) return;
  const percent = Math.round(productImageZoomLevel * 100);
  image.style.width = `${percent}%`;
  image.style.height = `${percent}%`;
  image.classList.toggle('is-zoomed', productImageZoomLevel > 1);
  stage.classList.toggle('is-zoomed', productImageZoomLevel > 1);
  if(value) value.textContent = `${percent}%`;
  if(center){
    requestAnimationFrame(() => {
      stage.scrollLeft = Math.max(0, (stage.scrollWidth - stage.clientWidth) / 2);
      stage.scrollTop = Math.max(0, (stage.scrollHeight - stage.clientHeight) / 2);
    });
  }
}
function setProductImageZoom(level){
  productImageZoomLevel = Math.max(1, Math.min(3, Math.round(Number(level || 1) * 2) / 2));
  updateProductImageZoom();
}
function toggleProductImageZoom(){ setProductImageZoom(productImageZoomLevel > 1 ? 1 : 2); }
function handleProductImageZoomWheel(event){
  event.preventDefault();
  setProductImageZoom(productImageZoomLevel + (event.deltaY < 0 ? .5 : -.5));
}
function selectProductZoomImage(index){
  const images = currentProductGallery();
  if(!images.length) return;
  activeImageIndex = Math.max(0, Math.min(Number(index) || 0, images.length - 1));
  productImageZoomLevel = 1;
  renderProductDetail();
  const image = document.getElementById('productImageZoomed');
  if(image) image.src = optimizeImageUrl(productImageZoomSource(),1800);
  const count = document.getElementById('productImageViewerCount');
  if(count) count.textContent = `${activeImageIndex+1} / ${images.length}`;
  document.querySelectorAll('.product-image-viewer-thumb').forEach((thumb,i)=>thumb.classList.toggle('active', i===activeImageIndex));
  updateProductImageZoom();
}
function changeProductZoomImage(direction){
  const images = currentProductGallery();
  if(images.length < 2) return;
  selectProductZoomImage((activeImageIndex + Number(direction) + images.length) % images.length);
}
document.addEventListener('keydown', event => {
  if(!document.getElementById('productImageViewer')) return;
  if(event.key === 'Escape') closeProductImageZoom();
  if(event.key === 'ArrowLeft') changeProductZoomImage(-1);
  if(event.key === 'ArrowRight') changeProductZoomImage(1);
  if(event.key === '+' || event.key === '=') setProductImageZoom(productImageZoomLevel + .5);
  if(event.key === '-') setProductImageZoom(productImageZoomLevel - .5);
});

function openVariantSheet(){
  if(!activeProduct) return;
  closeChoiceModal();
  const product = activeProduct;
  const optionTitle = productOptionTitle(product);
  const html = product.Variants.map((v,i)=>`<button class="variant-choice ${i===activeVariantIndex?'active':''}" type="button" onclick="selectVariantFromSheet(${i})"><span>${escapeHtml(v.label || 'Standard')}</span>${i===activeVariantIndex ? '<b>✓</b>' : ''}</button>`).join('');
  document.body.insertAdjacentHTML('beforeend', `<div id="choiceModal" class="choice-modal" onclick="if(event.target===this) closeChoiceModal()"><div class="choice-card option-sheet"><div class="choice-head"><b>Select ${escapeHtml(optionTitle)}</b><button type="button" onclick="closeChoiceModal()"><span>×</span></button></div><div class="variant-choice-grid">${html}</div></div></div>`);
}
function selectVariantFromSheet(index){ selectVariant(index); closeChoiceModal(); }
function selectProductImage(index){ activeImageIndex = index; renderProductDetail(); }
function selectVariant(index){
  const variant = activeProduct?.Variants?.[index];
  if(!variant) return;
  activeVariantIndex = index;
  activeSizeIndex = 0;
  activeImageIndex = 0;
  renderProductDetail();
  if(!variantIsAvailable(variant)) showSoftToast('Out of stock — link can still be shared');
}
function selectColorVariant(index){
  const variant = activeProduct?.Variants?.[index];
  if(!variant) return;
  activeVariantIndex = index;
  activeSizeIndex = 0;
  activeImageIndex = 0;
  renderProductDetail();
  if(!variantIsAvailable(variant)) showSoftToast('Out of stock — link can still be shared');
}
function selectSizeOption(index){ activeSizeIndex = index; renderProductDetail(); }
function activateChip(button){
  button.parentElement.querySelectorAll('.chip').forEach(chip => chip.classList.remove('active'));
  button.classList.add('active');
}
function activateColorChoice(button, index = 0){
  activeColorIndex = Math.max(0, Number(index) || 0);
  button.parentElement.querySelectorAll('.color-variant-choice').forEach(choice => { choice.classList.remove('active'); choice.setAttribute('aria-pressed','false'); });
  button.classList.add('active');
  button.setAttribute('aria-pressed','true');
  syncProductSelectionUrl();
  updateProductSeo();
}
function changeQty(amount){
  const qty = document.getElementById('qty');
  if(qty) qty.textContent = Math.max(1, Number(qty.textContent || 1) + amount);
}
function handleAddToCart(){
  const product = activeProduct;
  if(!product) return;
  const variant = selectedProductVariant(product);
  if(!productIsAvailable(product, variant)){ showSoftToast('This selected option is out of stock'); return; }
  const colorMode = isColorVariantMode(product);
  const gallery = productGalleryImages(product, variant);
  const image = firstImage(gallery, product.Image);
  const size = colorMode ? selectedSizeText() : (variant.label || 'Standard');
  const color = colorMode ? (variant.color || variant.label || 'Default') : selectedStandaloneColorText(product);
  addCartItem(product, {
    category: product.Category,
    image,
    variant:size,
    size,
    color,
    qty: document.getElementById('qty')?.textContent || 1,
    price: variant.price || product.Price,
    mrp: variant.mrp || product.MRP,
    subcategory: product.Subcategory,
    terms: selectedPolicyTerms(product.Terms).map(term => term.label),
    stockStatus: variant.stockStatus || product.StockStatus || 'in_stock'
  });
}
function shareProductLink(){
  const product = activeProduct;
  const descriptor = selectedProductDescriptor(product);
  const url = currentProductAbsoluteUrl(product);
  const title = product ? `${product.Name}${descriptor ? ' - ' + descriptor : ''} | Wellone` : 'Wellone product';
  if(navigator.share){
    navigator.share({title, text:descriptor ? `Selected option: ${descriptor}` : '', url}).catch(()=>{});
    return;
  }
  navigator.clipboard?.writeText(url).then(() => showSoftToast('Selected option link copied')).catch(() => { prompt('Copy selected option link', url); });
}
function initCartPage(){
  if(window.WelloneCart && typeof WelloneCart.renderCartItems === 'function') WelloneCart.renderCartItems();
  else renderCartItems();
  if(typeof subscribeToStoreUpdates === 'function' && !window.__welloneCartLiveBound){
    window.__welloneCartLiveBound = true;
    let cartLiveTimer = null;
    subscribeToStoreUpdates(change => {
      const tables = Array.isArray(change && change.tables) ? change.tables : [];
      if(tables.length && !tables.some(table => ['products','product_variants','product_images','categories','subcategories'].includes(table))) return;
      clearTimeout(cartLiveTimer);
      cartLiveTimer = setTimeout(async () => {
        try{
          if(typeof checkCartAvailabilityAndRefresh === 'function') await checkCartAvailabilityAndRefresh();
          if(window.WelloneCart && typeof WelloneCart.renderCartItems === 'function') WelloneCart.renderCartItems();
        }catch(_error){}
      }, 50);
    });
  }
}
function renderCartItems(){
  if(window.WelloneCart && WelloneCart.renderCartItems && WelloneCart.renderCartItems !== renderCartItems){
    return WelloneCart.renderCartItems();
  }
}
