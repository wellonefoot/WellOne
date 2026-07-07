'use strict';

const PAGE_LIMIT = 20;
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
let activeImageIndex = 0;
const CATALOG_VIEW_TTL_MS = 30 * 60 * 1000;
let catalogScrollTimer = null;

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
  const more = document.getElementById('loadMoreBtn');
  if(more) more.classList.toggle('hidden', !catalogState.nextOffset);
  renderCategoryHero();
  requestAnimationFrame(() => setTimeout(() => window.scrollTo({top: cached.scrollY || 0, behavior:'auto'}), 40));
  return true;
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
  return `<article class="cat-card premium-cat-card" data-cat="${name}" onclick="location.href='${url}'" tabindex="0" onkeydown="if(event.key==='Enter') location.href='${url}'">
    <div class="media shimmer"><img loading="lazy" decoding="async" src="${optimizeImageUrl(category.image || SITE_CONFIG.defaultCategoryImage, 720)}" onload="this.parentElement.classList.remove('shimmer')" onerror="this.src=SITE_CONFIG.defaultCategoryImage" alt="${name}"></div>
    <div class="cat-copy"><h3>${name}</h3><p>${desc}</p><span class="cat-arrow" aria-hidden="true">→</span></div>
  </article>`;
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
  loadCategoryPage(categoryName, {offset:0, limit:PAGE_LIMIT, sort:'newest'}).then(pack => {
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
function productCard(product, categoryName){
  const catName = categoryName || product.Category || product.category || '';
  const variant = (product.Variants && product.Variants[0]) || product;
  const image = firstImage(variant.images || product.Images, product.Image || fallbackImageSync(catName));
  const safeId = encodeURIComponent(product.ID);
  const safeCat = encodeURIComponent(catName);
  const href = `product.html?cat=${safeCat}&id=${safeId}`;
  const jsCat = attrSafeJs(catName);
  const jsId = attrSafeJs(product.ID);
  const jsHref = attrSafeJs(href);
  const sub = product.Subcategory ? `<span class="product-badge">${escapeHtml(product.Subcategory)}</span>` : '';
  const catBadge = catalogState.global && catName ? `<span class="product-badge soft-badge">${escapeHtml(catName)}</span>` : '';
  const unavailable = product.StockStatus === 'out_of_stock';
  const stockBadge = unavailable ? `<span class="product-badge stock-badge">Out of stock</span>` : '';
  return `<article class="product-card clickable-card ${unavailable ? 'is-out-stock' : ''}" data-product-id="${escapeHtml(product.ID)}" onclick="openProductFromCard('${jsCat}','${jsId}','${jsHref}')" onpointerenter="warmProductFromCard('${jsCat}','${jsId}')" ontouchstart="warmProductFromCard('${jsCat}','${jsId}')" tabindex="0" onkeydown="if(event.key==='Enter') openProductFromCard('${jsCat}','${jsId}','${jsHref}')">
    <div class="product-media shimmer"><img loading="lazy" decoding="async" src="${optimizeImageUrl(image, 620)}" onload="this.parentElement.classList.remove('shimmer')" onerror="this.src='${fallbackImageSync(catName)}'" alt="${escapeHtml(product.Name)}"></div>
    <div class="product-pad">
      ${catBadge}${sub}${stockBadge}<h3>${escapeHtml(product.Name)}</h3>
      ${priceHtml(product, variant)}
      <button onclick="event.stopPropagation(); openProductFromCard('${jsCat}','${jsId}','${jsHref}')">View</button>
    </div>
  </article>`;
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
  const holder = document.getElementById('homeCategories');
  if(holder) holder.innerHTML = skeletonCards(8);
  initSearchForm('homeSearchForm','homeSearchInput', q => `catalog.html${q ? '?q=' + encodeURIComponent(q) : ''}`);

  const renderCategories = categories => {
    if(!holder) return;
    holder.classList.remove('skeleton-grid');
    holder.innerHTML = categories.length ? categories.map(categoryCard).join('') : `<div class="empty-card"><h2>No categories added</h2><p>Add categories from the admin panel.</p></div>`;
    attachCategoryWarmup(holder);
  };
  const renderOffers = offers => {
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
  const [categories, offers] = await Promise.all([loadCategories(true), loadOffers(true)]);
  renderOffers(offers);
  renderCategories(categories);
  refreshCategoriesInBackground(renderCategories);
  refreshOffersInBackground(renderOffers);
  categories.slice(0,8).forEach(c => preloadImage(c.image));
  offers.slice(0,4).forEach(o => preloadImage(o.image));
}
async function initCatalog(){
  updateCartCount();
  const params = new URLSearchParams(location.search);
  catalogState.category = params.get('cat') || params.get('category') || '';
  catalogState.query = params.get('q') || '';
  catalogState.subcategory = params.get('sub') || '';
  catalogState.sort = params.get('sort') || 'newest';
  catalogState.global = !catalogState.category && !!catalogState.query;
  const searchInput = document.getElementById('catalogSearchInput');
  if(searchInput) searchInput.value = catalogState.query;
  updateSortButton();
  initCatalogEvents();
  bindCatalogViewPersistence();

  const categories = await loadCategories(true);
  if(!catalogState.category && !catalogState.query){
    document.getElementById('categorySection')?.classList.remove('hidden');
    document.getElementById('productsSection')?.classList.add('hidden');
    renderCategoryHero();
    document.getElementById('activeCategoryTools')?.classList.add('hidden');
    renderCatalogCategories(categories);
    refreshCategoriesInBackground(renderCatalogCategories);
    return;
  }
  document.getElementById('categorySection')?.classList.add('hidden');
  document.getElementById('productsSection')?.classList.remove('hidden');
  document.getElementById('activeCategoryTools')?.classList.remove('hidden');
  if(catalogState.category){
    const realCategory = categories.find(cat => sameName(cat.name, catalogState.category));
    catalogState.category = realCategory ? realCategory.name : catalogState.category;
    catalogState.global = false;
    await renderFilterChips();
  }else{
    catalogState.global = true;
    hideFiltersForGlobalSearch();
  }
  const restored = restoreCatalogView();
  if(restored) setTimeout(() => loadCatalogProducts(true), 160);
  else await loadCatalogProducts(true);
}
function initCatalogEvents(){
  const form = document.getElementById('catalogSearchForm');
  const input = document.getElementById('catalogSearchInput');
  const sortBtn = document.getElementById('sortButton');
  const filterToggle = document.getElementById('filterToggle');
  const more = document.getElementById('loadMoreBtn');
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
  if(more) more.addEventListener('click', () => loadCatalogProducts(false));
}
function updateCatalogUrl(){
  const params = new URLSearchParams();
  if(catalogState.category) params.set('cat', catalogState.category);
  if(catalogState.query) params.set('q', catalogState.query);
  if(catalogState.subcategory && catalogState.category) params.set('sub', catalogState.subcategory);
  if(catalogState.sort && catalogState.sort !== 'newest') params.set('sort', catalogState.sort);
  history.replaceState(null, '', `catalog.html${params.toString() ? '?' + params.toString() : ''}`);
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
async function renderFilterChips(){
  const chipBox = document.getElementById('filterChips');
  if(!chipBox) return;
  chipBox.innerHTML = '<button class="chip active" type="button">All</button>';
  const subs = await loadSubcategories(catalogState.category);
  const chips = [`<button class="chip ${!catalogState.subcategory ? 'active' : ''}" type="button" data-sub="">All</button>`]
    .concat(subs.map(s => `<button class="chip ${sameName(catalogState.subcategory, s) ? 'active' : ''}" type="button" data-sub="${escapeHtml(s)}">${escapeHtml(s)}</button>`));
  chipBox.innerHTML = chips.join('');
  const filterToggle = document.getElementById('filterToggle');
  if(filterToggle) filterToggle.classList.toggle('hidden', !subs.length);
  chipBox.classList.toggle('hidden', !subs.length);
  chipBox.querySelectorAll('[data-sub]').forEach(btn => btn.addEventListener('click', () => {
    catalogState.subcategory = btn.dataset.sub || '';
    catalogState.offset = 0;
    chipBox.querySelectorAll('.chip').forEach(x => x.classList.remove('active'));
    btn.classList.add('active');
    updateCatalogUrl();
    loadCatalogProducts(true);
  }));
}
async function loadCatalogProducts(reset){
  if(catalogState.loading) return;
  catalogState.loading = true;
  const grid = document.getElementById('productGrid');
  const more = document.getElementById('loadMoreBtn');
  if(reset){
    catalogState.offset = 0;
    catalogState.products = [];
    if(grid) grid.innerHTML = skeletonCards(6, 'skeleton-product');
  }
  if(more) more.classList.add('hidden');
  const options = {offset: catalogState.offset, limit: PAGE_LIMIT, query: catalogState.query, subcategory: catalogState.subcategory, sort: catalogState.sort, forceRefresh: true};
  const pack = catalogState.global
    ? await searchGlobalProducts(catalogState.query, options).catch(() => ({products:[], nextOffset:null, total:0}))
    : await loadCategoryPage(catalogState.category, options).catch(() => ({products:[], nextOffset:null, total:0}));
  catalogState.loading = false;
  const newProducts = pack.products || [];
  catalogState.nextOffset = pack.nextOffset;
  catalogState.offset = pack.nextOffset || 0;
  catalogState.products = reset ? newProducts : catalogState.products.concat(newProducts);
  if(!grid) return;
  grid.classList.remove('skeleton-grid');
  if(!catalogState.products.length){
    grid.innerHTML = `<div class="empty-card"><h2>No items found</h2><p>Try another word, filter, or category.</p></div>`;
  }else if(reset){
    grid.innerHTML = newProducts.map(p => productCard(p, p.Category || catalogState.category)).join('');
  }else if(newProducts.length){
    grid.insertAdjacentHTML('beforeend', newProducts.map(p => productCard(p, p.Category || catalogState.category)).join(''));
  }
  requestAnimationFrame(() => newProducts.slice(0,4).forEach(p => preloadImage(firstImage((p.Variants && p.Variants[0] && p.Variants[0].images) || p.Images, p.Image))));
  if(more) more.classList.toggle('hidden', !catalogState.nextOffset);
  renderCategoryHero();
  persistCatalogView();
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
    activeVariantIndex = 0;
    activeSizeIndex = 0;
    activeImageIndex = 0;
    renderProductDetail();
  }else if(holder){
    holder.innerHTML = `<div class="product-detail-skeleton"><div class="shimmer"></div><div><b></b><span></span><span></span><button></button></div></div>`;
  }
  await Promise.all([loadCategories(true), loadTerms(true)]);
  const product = await findProduct(categoryName, productId, {forceRefresh:true});
  if(!product || cleanText(product.Status || 'active') !== 'active' || !holder){
    if(holder) holder.innerHTML = `<div class="empty-card"><h2>Product not found</h2><p>Please open the item again from catalog.</p></div>`;
    return;
  }
  activeProduct = product;
  activeVariantIndex = 0;
  activeSizeIndex = 0;
  activeImageIndex = 0;
  renderProductDetail();
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
function termSymbol(term){
  const label = cleanText(term.label || term.name).toLowerCase();
  if(label.includes('cod') || label.includes('cash')) return '₹';
  if(label.includes('return')) return '7';
  if(label.includes('exchange')) return '↔';
  if(label.includes('refund') || label.includes('non')) return '×';
  return cleanText(term.icon || '✓');
}
function productIsAvailable(product){
  return !!product && cleanText(product.Status || 'active') === 'active' && cleanText(product.StockStatus || 'in_stock') !== 'out_of_stock';
}
function productStockNote(product){
  return productIsAvailable(product) ? '' : '<div class="stock-alert">Currently out of stock. Contact the shop to check availability.</div>';
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
  const terms = selectedTermObjects(product.Terms, termsCache);
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
        ${colorMode ? `<div class="option-block"><b>Choose colour</b><div class="color-variant-options">${product.Variants.map((v,i)=>`<button class="color-variant-choice ${i===activeVariantIndex?'active':''}" type="button" onclick="selectColorVariant(${i})" aria-pressed="${i===activeVariantIndex?'true':'false'}"><span>${escapeHtml(v.color || v.label || 'Colour')}</span></button>`).join('')}</div></div>` : ''}
        ${hasVariants ? `<div class="option-block"><b>Choose ${escapeHtml(optionTitle)}</b><button id="variantPickerButton" class="select-option-button" type="button" onclick="openVariantSheet()"><span>${escapeHtml(selectedVariantText())}</span><i>Change</i></button></div>` : ''}
        ${colorMode && hasVisibleSizes(product, variant) ? `<div class="option-block"><b>Choose size</b><div class="size-variant-options">${sizeOptions.map((size,i)=>`<button class="size-variant-choice ${i===activeSizeIndex?'active':''}" type="button" onclick="selectSizeOption(${i})">${escapeHtml(size)}</button>`).join('')}</div></div>` : ''}
        ${!colorMode && colors.length ? `<div class="option-block"><b>Choose colour</b><div id="colorOptions" class="color-variant-options">${colors.map((c,i)=>`<button class="color-variant-choice ${i===0?'active':''}" type="button" onclick="activateColorChoice(this)" aria-pressed="${i===0?'true':'false'}"><span>${escapeHtml(c)}</span></button>`).join('')}</div></div>` : ''}
        <div class="option-block"><b>Quantity</b><div class="qty"><button type="button" onclick="changeQty(-1)">−</button><span id="qty">1</span><button type="button" onclick="changeQty(1)">+</button></div></div>
      </div>
      ${terms.length ? `<div class="terms-grid compact-terms stylish-terms">${terms.map(t => `<article><span class="term-icon">${escapeHtml(termSymbol(t))}</span><b>${escapeHtml(t.label)}</b>${t.description ? `<small>${escapeHtml(t.description)}</small>` : ''}</article>`).join('')}</div>` : ''}
      ${productStockNote(product)}
      <button class="btn primary full add-cart-button" ${productIsAvailable(product) ? 'onclick="handleAddToCart()"' : 'disabled'}>${productIsAvailable(product) ? 'Add to Cart' : 'Out of stock'}</button>
      <div class="detail-mini-actions"><button class="share-product-btn" type="button" onclick="shareProductLink()">Share product</button><a class="detail-back-link" href="catalog.html">← Back to catalog</a></div>
    </div>`;
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
function selectVariant(index){ activeVariantIndex = index; activeSizeIndex = 0; activeImageIndex = 0; renderProductDetail(); }
function selectColorVariant(index){ activeVariantIndex = index; activeSizeIndex = 0; activeImageIndex = 0; renderProductDetail(); }
function selectSizeOption(index){ activeSizeIndex = index; renderProductDetail(); }
function activateChip(button){
  button.parentElement.querySelectorAll('.chip').forEach(chip => chip.classList.remove('active'));
  button.classList.add('active');
}
function activateColorChoice(button){
  button.parentElement.querySelectorAll('.color-variant-choice').forEach(choice => { choice.classList.remove('active'); choice.setAttribute('aria-pressed','false'); });
  button.classList.add('active');
  button.setAttribute('aria-pressed','true');
}
function changeQty(amount){
  const qty = document.getElementById('qty');
  if(qty) qty.textContent = Math.max(1, Number(qty.textContent || 1) + amount);
}
function handleAddToCart(){
  const product = activeProduct;
  if(!product) return;
  if(!productIsAvailable(product)){ showSoftToast('This item is out of stock. Contact to check availability.'); return; }
  const variant = selectedProductVariant(product);
  const colorMode = isColorVariantMode(product);
  const gallery = productGalleryImages(product, variant);
  const image = firstImage(gallery, product.Image);
  const size = colorMode ? selectedSizeText() : (variant.label || 'Standard');
  const color = colorMode ? (variant.color || variant.label || 'Default') : (document.querySelector('#colorOptions .active')?.textContent || 'Default');
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
    terms: product.Terms
  });
}
function shareProductLink(){
  const product = activeProduct;
  const url = location.href;
  const title = product ? `${product.Name} | Wellone` : 'Wellone product';
  if(navigator.share){
    navigator.share({title, url}).catch(()=>{});
    return;
  }
  navigator.clipboard?.writeText(url).then(() => showSoftToast('Product link copied')).catch(() => { prompt('Copy product link', url); });
}
function initCartPage(){
  if(window.WelloneCart && typeof WelloneCart.renderCartItems === 'function') WelloneCart.renderCartItems();
  else renderCartItems();
}
function renderCartItems(){
  if(window.WelloneCart && WelloneCart.renderCartItems && WelloneCart.renderCartItems !== renderCartItems){
    return WelloneCart.renderCartItems();
  }
}


// v23: server-first refresh when returning to catalog/product tab.
document.addEventListener('visibilitychange', () => {
  if(document.hidden) return;
  if(document.getElementById('productGrid') && (catalogState.category || catalogState.query)) loadCatalogProducts(true);
  if(document.getElementById('productDetail') && activeProduct){
    const params = new URLSearchParams(location.search);
    findProduct(params.get('cat') || '', params.get('id') || '', {forceRefresh:true}).then(p => { if(p){ activeProduct = p; activeVariantIndex = Math.max(0, Math.min(activeVariantIndex, (p.Variants||[]).length-1)); activeSizeIndex = 0; renderProductDetail(); } }).catch(()=>{});
  }
});
