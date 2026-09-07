(function(){
  'use strict';

  const WISHLIST_KEY = 'wellone_wishlist_v1';

  function text(value, fallback = ''){ return String(value ?? fallback).trim(); }
  function number(value, fallback = 0){
    const parsed = Number(String(value ?? '').replace(/[₹,]/g, ''));
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  function escapeHtml(value){
    return text(value).replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
  }
  function keyFor(item){
    const productId = text(item && item.id).toLowerCase();
    const variantId = text(item && (item.variantId || item.variant_id)).toLowerCase();
    return [variantId ? 'variant' : 'option', productId, variantId, item && item.color, item && (item.size || item.variant)]
      .map(value => text(value).toLowerCase()).join('||');
  }
  function normalize(item){
    const size = text(item && (item.size || item.variant), 'Standard');
    const normalized = {
      id:text(item && item.id),
      variantId:text(item && (item.variantId || item.variant_id)),
      barcode:text(item && item.barcode),
      barcodeEnabled:item && item.barcodeEnabled === true,
      name:text(item && item.name, 'Product'),
      category:text(item && item.category),
      subcategory:text(item && item.subcategory),
      optionTitle:text(item && item.optionTitle, 'Size'),
      price:number(item && item.price),
      mrp:number(item && item.mrp),
      image:text(item && item.image),
      variant:size,
      size,
      color:text(item && item.color, 'Default'),
      href:text(item && item.href, 'catalog.html'),
      stockStatus:text(item && item.stockStatus, 'in_stock'),
      trackInventory:item && item.trackInventory === true,
      stockQuantity:item && item.stockQuantity !== null && item.stockQuantity !== undefined ? Math.max(0, number(item.stockQuantity)) : null,
      offerId:text(item && item.offerId),
      offerValidUntil:text(item && item.offerValidUntil),
      offerPrice:number(item && item.offerPrice),
      offerStatus:text(item && item.offerStatus),
      savedAt:Number(item && item.savedAt) || Date.now()
    };
    normalized.key = keyFor(normalized);
    return normalized;
  }
  function getAll(){
    try{
      const parsed = JSON.parse(localStorage.getItem(WISHLIST_KEY) || '[]');
      return (Array.isArray(parsed) ? parsed : []).map(normalize).filter(item => item.id);
    }catch(_error){ return []; }
  }
  function save(items){
    const unique = new Map();
    (items || []).map(normalize).forEach(item => { if(item.id) unique.set(item.key, item); });
    const list = Array.from(unique.values()).sort((a,b) => b.savedAt - a.savedAt);
    localStorage.setItem(WISHLIST_KEY, JSON.stringify(list));
    refresh();
    return list;
  }
  function has(item){
    const wanted = typeof item === 'string' ? item : keyFor(item || {});
    return getAll().some(saved => saved.key === wanted);
  }
  function toggle(item){
    const normalized = normalize(item || {});
    if(!normalized.id) return false;
    const items = getAll();
    const index = items.findIndex(saved => saved.key === normalized.key);
    if(index >= 0){ items.splice(index, 1); save(items); return false; }
    items.unshift(normalized);
    save(items);
    return true;
  }
  function remove(key){ save(getAll().filter(item => item.key !== key)); }
  function money(value){
    const amount = number(value);
    return amount ? `₹${amount.toLocaleString('en-IN')}` : 'Ask price';
  }
  function productHref(item){
    if(item.href && item.href !== 'catalog.html') return item.href;
    const params = new URLSearchParams();
    if(item.category) params.set('cat', item.category);
    if(item.id) params.set('id', item.id);
    if(item.color && item.color.toLowerCase() !== 'default') params.set('color', item.color);
    if(item.size && item.size.toLowerCase() !== 'standard'){
      params.set('variant', item.color && item.color.toLowerCase() !== 'default' ? item.color : item.size);
      if(item.color && item.color.toLowerCase() !== 'default') params.set('size', item.size);
    }
    return `product.html?${params.toString()}`;
  }
  function injectHeader(){
    document.querySelectorAll('.header-actions').forEach(actions => {
      if(actions.querySelector('.header-wishlist')) return;
      const link = document.createElement('a');
      link.className = 'header-icon header-wishlist';
      link.href = 'wishlist.html';
      link.setAttribute('aria-label', 'Open wishlist');
      link.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 4.9a5.5 5.5 0 0 0-7.8 0L12 6l-1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.3a5.5 5.5 0 0 0 0-7.8Z"></path></svg><span class="header-wishlist-count" data-wishlist-count>0</span>';
      const cart = actions.querySelector('.header-cart');
      actions.insertBefore(link, cart || actions.querySelector('.menu-toggle') || null);
    });
  }
  function refreshButtons(items){
    const keys = new Set(items.map(item => item.key));
    document.querySelectorAll('[data-wishlist-key]').forEach(button => {
      const saved = keys.has(button.dataset.wishlistKey || '');
      button.classList.toggle('is-saved', saved);
      button.setAttribute('aria-pressed', saved ? 'true' : 'false');
      button.setAttribute('aria-label', saved ? 'Remove selected option from wishlist' : 'Save selected option to wishlist');
    });
  }
  function refresh(){
    injectHeader();
    const items = getAll();
    document.querySelectorAll('[data-wishlist-count]').forEach(element => {
      element.textContent = String(items.length);
      element.classList.toggle('is-empty', items.length === 0);
    });
    document.querySelectorAll('.header-wishlist').forEach(link => link.classList.toggle('has-items', items.length > 0));
    refreshButtons(items);
    if(document.getElementById('wishlistGrid')) renderPage();
  }
  function itemCard(item){
    const href = escapeHtml(productHref(item));
    const unavailable = item.stockStatus === 'out_of_stock' || (item.trackInventory && Number(item.stockQuantity) <= 0);
    const optionParts = [
      item.color && item.color.toLowerCase() !== 'default' ? `<span>Colour <b>${escapeHtml(item.color)}</b></span>` : '',
      item.size && item.size.toLowerCase() !== 'standard' ? `<span>${escapeHtml(item.optionTitle || 'Option')} <b>${escapeHtml(item.size)}</b></span>` : ''
    ].filter(Boolean).join('');
    return `<article class="wishlist-card ${unavailable ? 'is-out-stock' : ''}" data-wishlist-item="${escapeHtml(item.key)}">
      <a class="wishlist-image" href="${href}" aria-label="Open ${escapeHtml(item.name)}"><img loading="lazy" decoding="async" src="${escapeHtml(item.image)}" onerror="this.src=SITE_CONFIG.defaultCategoryImage" alt="${escapeHtml(item.name)}"></a>
      <div class="wishlist-copy">
        <div class="wishlist-card-top"><div><h2><a href="${href}">${escapeHtml(item.name)}</a></h2></div><button class="wishlist-remove" type="button" data-key="${escapeHtml(item.key)}" onclick="WelloneWishlist.removeByButton(this)" aria-label="Remove from wishlist">×</button></div>
        ${item.category ? `<p>${escapeHtml(item.category)}${item.subcategory ? ' • ' + escapeHtml(item.subcategory) : ''}</p>` : ''}
        ${optionParts ? `<div class="wishlist-options">${optionParts}</div>` : ''}
        <div class="wishlist-price"><strong>${money(item.price)}</strong>${item.mrp > item.price ? `<del>${money(item.mrp)}</del>` : ''}</div>
        <div class="wishlist-actions"><a class="btn light" href="${href}">View product</a><button class="btn primary" type="button" data-key="${escapeHtml(item.key)}" onclick="WelloneWishlist.addToCartByButton(this)" ${unavailable ? 'disabled' : ''}>${unavailable ? 'Out of stock' : 'Add to cart'}</button></div>
      </div>
    </article>`;
  }
  function renderPage(){
    const grid = document.getElementById('wishlistGrid');
    const empty = document.getElementById('wishlistEmpty');
    if(!grid) return;
    const items = getAll();
    grid.innerHTML = items.map(itemCard).join('');
    grid.classList.toggle('hidden', items.length === 0);
    if(empty) empty.classList.toggle('hidden', items.length > 0);
  }
  function removeByButton(button){ remove(text(button && button.dataset.key)); }
  function addToCartByButton(button){
    const item = getAll().find(saved => saved.key === text(button && button.dataset.key));
    if(!item || !window.WelloneCart || typeof WelloneCart.addCartItem !== 'function') return;
    WelloneCart.addCartItem({
      ID:item.id, Name:item.name, Category:item.category, Subcategory:item.subcategory,
      Barcode:item.barcode, Image:item.image, Price:item.price, MRP:item.mrp,
      StockStatus:item.stockStatus, TrackInventory:item.trackInventory, StockQuantity:item.stockQuantity
    }, {
      variantId:item.variantId, variant:item.variant, size:item.size, color:item.color,
      optionTitle:item.optionTitle, image:item.image, price:item.price, mrp:item.mrp,
      stockStatus:item.stockStatus, trackInventory:item.trackInventory,
      stockQuantity:item.stockQuantity, offerId:item.offerId,
      offerValidUntil:item.offerValidUntil, offerPrice:item.offerPrice,
      offerStatus:item.offerStatus, qty:1
    });
  }
  function initWishlistPage(){ refresh(); renderPage(); }

  window.WelloneWishlist = {keyFor,getAll,has,toggle,remove,refresh,renderPage,removeByButton,addToCartByButton};
  window.initWishlistPage = initWishlistPage;
  window.addEventListener('storage', event => { if(event.key === WISHLIST_KEY) refresh(); });
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', refresh);
  else refresh();
})();
