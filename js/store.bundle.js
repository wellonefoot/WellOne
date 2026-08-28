/* bundled from config.js */
const SITE_CONFIG = {
  shopName: 'Wellone',
  supabaseUrl: 'https://wnavzhrkwgnegjdetdno.supabase.co',
  supabaseAnonKey: 'sb_publishable_RbnMrDlHfEijBiejcRNPUg_mop2bqgM',
  storageBucket: 'product-images',
  whatsappNumber: '919746476813',
  defaultCategoryImage: 'https://images.unsplash.com/photo-1594223274512-ad4803739b7c?auto=format&fit=crop&w=900&q=74'
};

/* bundled from cart.js */
'use strict';

const CART_KEY = 'wellone_cart_final_v28';
const ORDER_CART_CLEAR_KEY = 'wellone_order_cart_clear_pending';
const ORDER_REFS_KEY = 'wellone_customer_order_refs_v1';
window.WELLONE_ORDER_REFS_KEY = ORDER_REFS_KEY;
const LEGACY_CART_KEYS = [
  'wellone_cart_final_v27','wellone_cart_final_v25','wellone_cart_final_v24','wellone_cart_final_v23','wellone_cart_final_v22','wellone_cart_final_v21','wellone_cart_final_v20','wellone_cart_final_v19','wellone_cart_final_v18','wellone_cart_final_v17','wellone_cart_final_v16','wellone_cart_final_v7','wellone_cart_final_v1','wellone_kids_saved_cart_v3',
  'wellone_kids_saved_cart_v2','wellone_kids_saved_cart','welloneCart','cart'
];

function cartText(value, fallback = ''){ return String(value ?? fallback).trim(); }
function cartNumber(value, fallback = 0){
  const n = Number(String(value ?? '').replace(/[₹,]/g,''));
  return Number.isFinite(n) ? n : fallback;
}
function cartFormatMoney(value){
  const n = cartNumber(value, 0);
  return `₹${n.toLocaleString('en-IN')}`;
}
function cartPriceText(value, fallback = 'Ask price'){
  const n = cartNumber(value, 0);
  return n ? `₹${n.toLocaleString('en-IN')}` : fallback;
}
function cartItemKey(item){
  return [item.category, item.id, item.name, item.variant || item.size, item.color]
    .map(v => cartText(v).toLowerCase()).join('||');
}
function cartEscape(value){
  return String(value ?? '').replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
}
function cartSafeJs(value){ return String(value ?? '').replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/\n/g,' '); }
function cartImage(url, size = 520){
  try{
    if(typeof optimizeImageUrl === 'function') return optimizeImageUrl(url || SITE_CONFIG.defaultCategoryImage, size);
  }catch(e){}
  return url || (window.SITE_CONFIG && SITE_CONFIG.defaultCategoryImage) || '';
}
function cartProductRelativeLink(item){
  const params = new URLSearchParams();
  const category = cartText(item && item.category);
  const id = cartText(item && item.id);
  const variant = cartText(item && (item.variant || item.size), 'Standard');
  const color = cartText(item && item.color, 'Default');
  if(category) params.set('cat', category);
  if(id) params.set('id', id);
  if(cartText(item && item.offerId) && cartText(item && item.offerStatus) === 'live') params.set('offer', cartText(item.offerId));
  if(variant && variant.toLowerCase() !== 'standard') params.set('variant', variant);
  if(color && color.toLowerCase() !== 'default'){
    params.set('color', color);
    if(variant && variant.toLowerCase() !== 'standard') params.set('size', variant);
  }
  return `product.html${params.toString() ? '?' + params.toString() : ''}`;
}
function cartAbsoluteUrl(relativeUrl){
  try{
    const base = location.origin && !location.href.startsWith('file:')
      ? location.origin + location.pathname.replace(/[^/]*$/, '')
      : location.href.replace(/[^/]*$/, '');
    return new URL(relativeUrl, base).href;
  }catch(e){ return relativeUrl || ''; }
}
function normalizeTerms(value){
  const clean = term => {
    if(!term) return '';
    if(typeof term === 'object'){
      return cartText(term.label || term.name || term.title || term.description || '');
    }
    const text = cartText(term);
    if(!text || text === '[object Object]' || text.toLowerCase() === 'object object') return '';
    return text;
  };
  const source = Array.isArray(value) ? value : cartText(value).split(/[|,\n]+/);
  return source.map(clean).map(x => x.trim()).filter(Boolean);
}
function normalizeCart(rawItems){
  const merged = new Map();
  (Array.isArray(rawItems) ? rawItems : []).forEach(raw => {
    if(!raw) return;
    const variant = cartText(raw.variant || raw.size || raw.Size || raw.option || raw.Option, 'Standard');
    const item = {
      id: cartText(raw.id || raw.ID || raw.Id || raw.productId || raw.name || raw.Name, 'item'),
      variantId: cartText(raw.variantId || raw.variant_id || ''),
      name: cartText(raw.name || raw.Name, 'Product'),
      category: cartText(raw.category || raw.Category, ''),
      subcategory: cartText(raw.subcategory || raw.Subcategory, ''),
      price: cartNumber(raw.price || raw.Price, 0),
      mrp: cartNumber(raw.mrp || raw.MRP, 0),
      image: cartText(raw.image || raw.Image || ''),
      variant,
      size: variant,
      color: cartText(raw.color || raw.Color || raw.option || raw.Option, 'Default'),
      terms: normalizeTerms(raw.terms || raw.Terms),
      stockStatus: cartText(raw.stockStatus || raw.StockStatus || raw.stock_status || 'in_stock'),
      trackInventory: raw.trackInventory === true || raw.TrackInventory === true || raw.track_inventory === true,
      stockQuantity: Math.max(0, Math.floor(cartNumber(raw.stockQuantity ?? raw.StockQuantity ?? raw.stock_quantity, 0))),
      offerId: cartText(raw.offerId || raw.offer_id || ''),
      offerValidUntil: cartText(raw.offerValidUntil || raw.offer_valid_until || ''),
      offerPrice: cartNumber(raw.offerPrice ?? raw.offer_price, 0),
      offerStatus: cartText(raw.offerStatus || raw.offer_status || ''),
      offerMessage: cartText(raw.offerMessage || raw.offer_message || ''),
      availabilityStatus: cartText(raw.availabilityStatus || raw.availability_status || 'ok'),
      availabilityMessage: cartText(raw.availabilityMessage || raw.availability_message || ''),
      qty: Math.max(1, Math.floor(cartNumber(raw.qty || raw.quantity || raw.Qty, 1)))
    };
    const key = cartItemKey(item);
    if(merged.has(key)){
      const old = merged.get(key);
      old.qty += item.qty;
      if(!old.image && item.image) old.image = item.image;
      if(!old.price && item.price) old.price = item.price;
      if(!old.mrp && item.mrp) old.mrp = item.mrp;
      if(!old.terms.length && item.terms.length) old.terms = item.terms;
      if(item.trackInventory){ old.trackInventory = true; old.stockQuantity = item.stockQuantity; }
      if(item.offerId){
        old.offerId = item.offerId;
        old.offerValidUntil = item.offerValidUntil;
        old.offerPrice = item.offerPrice;
        old.offerStatus = item.offerStatus || 'live';
        old.offerMessage = item.offerMessage || '';
        if(item.price) old.price = item.price;
        if(item.mrp) old.mrp = item.mrp;
      }
    }else{
      item.key = key;
      merged.set(key, item);
    }
  });
  return Array.from(merged.values());
}
function migrateOldCartOnce(){
  if(localStorage.getItem(CART_KEY) !== null) return;
  for(const key of LEGACY_CART_KEYS){
    try{
      const saved = localStorage.getItem(key);
      if(!saved) continue;
      const cart = normalizeCart(JSON.parse(saved));
      if(cart.length){ localStorage.setItem(CART_KEY, JSON.stringify(cart)); break; }
    }catch(e){}
  }
}
function clearLegacyCartKeys(){ LEGACY_CART_KEYS.forEach(key => { try{ if(key !== CART_KEY) localStorage.removeItem(key); }catch(e){} }); }
function getCart(){
  migrateOldCartOnce();
  let cart = [];
  try{ cart = normalizeCart(JSON.parse(localStorage.getItem(CART_KEY) || '[]')); }catch(e){ cart = []; }
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  clearLegacyCartKeys();
  return cart;
}
function saveCart(items){
  const cart = normalizeCart(items);
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  clearLegacyCartKeys();
  updateCartCount(cart);
  if(typeof renderCartItems === 'function') renderCartItems();
  return cart;
}
function getCartQuantity(cart = getCart()){ return cart.reduce((sum, item) => sum + Math.max(1, Math.floor(cartNumber(item.qty, 1))), 0); }
function getCartTotal(cart = getCart()){ return cart.reduce((sum, item) => sum + cartNumber(item.price, 0) * Math.max(1, cartNumber(item.qty, 1)), 0); }
function updateCartCount(cart = getCart()){
  const count = getCartQuantity(cart);
  document.querySelectorAll('#cartCount,#floatCartCount,.cart-count,[data-cart-count]').forEach(el => {
    el.textContent = String(count);
    el.setAttribute('aria-label', `${count} items in cart`);
  });
  document.querySelectorAll('[data-cart-total]').forEach(el => el.textContent = cartFormatMoney(getCartTotal(cart)));
}
function addCartItem(product, selected = {}){
  const price = cartNumber(selected.price || product.Price || product.price, 0);
  const mrp = cartNumber(selected.mrp || product.MRP || product.mrp, 0);
  const variant = cartText(selected.variant || selected.size, 'Standard');
  const trackInventory = selected.trackInventory === true || product.TrackInventory === true || product.track_inventory === true;
  const stockQuantity = Math.max(0, Math.floor(cartNumber(selected.stockQuantity ?? product.StockQuantity ?? product.stock_quantity, 0)));
  if(trackInventory && stockQuantity <= 0){ showSoftToast('Selected item is out of stock'); return; }
  const item = {
    id: cartText(product.ID || product.Id || product.id || product.Name || product.name, 'item'),
    variantId: cartText(selected.variantId || selected.variant_id || ''),
    name: cartText(product.Name || product.name, 'Product'),
    category: cartText(selected.category || product.Category || product.category, ''),
    subcategory: cartText(selected.subcategory || product.Subcategory || ''),
    price,
    mrp,
    image: cartText(selected.image || product.Image || product.image || ''),
    variant,
    size: variant,
    color: cartText(selected.color, 'Default'),
    terms: normalizeTerms(selected.terms || product.Terms),
    stockStatus: cartText(selected.stockStatus || product.StockStatus || product.stock_status || 'in_stock'),
    trackInventory,
    stockQuantity,
    offerId: cartText(selected.offerId || ''),
    offerValidUntil: cartText(selected.offerValidUntil || ''),
    offerPrice: cartNumber(selected.offerPrice, 0),
    offerStatus: cartText(selected.offerStatus || ''),
    offerMessage: cartText(selected.offerMessage || ''),
    qty: Math.max(1, Math.floor(cartNumber(selected.qty, 1)))
  };
  if(item.trackInventory) item.qty = Math.min(item.qty, item.stockQuantity);
  const cart = getCart();
  const key = cartItemKey(item);
  const existing = cart.find(x => cartItemKey(x) === key);
  if(existing){
    const requested = existing.qty + item.qty;
    if(item.trackInventory && requested > item.stockQuantity){
      existing.qty = item.stockQuantity;
      existing.trackInventory = true;
      existing.stockQuantity = item.stockQuantity;
      if(item.image) existing.image = item.image;
      existing.price = item.price;
      existing.mrp = item.mrp;
      existing.offerId = item.offerId;
      existing.offerValidUntil = item.offerValidUntil;
      existing.offerPrice = item.offerPrice;
      existing.offerStatus = item.offerStatus;
      existing.offerMessage = item.offerMessage;
      saveCart(cart);
      showSoftToast(`Only ${item.stockQuantity} left in stock`);
      return;
    }
    existing.qty = requested;
    existing.trackInventory = item.trackInventory;
    existing.stockQuantity = item.stockQuantity;
    if(item.image) existing.image = item.image;
    existing.price = item.price;
    existing.mrp = item.mrp;
    existing.offerId = item.offerId;
    existing.offerValidUntil = item.offerValidUntil;
    existing.offerPrice = item.offerPrice;
    existing.offerStatus = item.offerStatus;
    existing.offerMessage = item.offerMessage;
  }else{
    item.key = key;
    cart.push(item);
  }
  saveCart(cart);
  showSoftToast('Added to cart');
  setTimeout(() => openCartDrawer(false), 170);
}
function removeCartItem(keyOrIndex){
  const cart = getCart();
  const next = typeof keyOrIndex === 'number'
    ? cart.filter((_, index) => index !== keyOrIndex)
    : cart.filter(item => cartItemKey(item) !== String(keyOrIndex));
  saveCart(next);
}
function changeCartQty(key, amount){
  const cart = getCart();
  const item = cart.find(x => cartItemKey(x) === String(key));
  if(!item) return;
  const requested = Math.max(1, Math.floor(cartNumber(item.qty, 1) + amount));
  if(amount > 0 && item.trackInventory === true && requested > Math.max(0, cartNumber(item.stockQuantity, 0))){
    showSoftToast(`Only ${Math.max(0, cartNumber(item.stockQuantity, 0))} left in stock`);
    return;
  }
  item.qty = requested;
  saveCart(cart);
}
function clearCart(){
  localStorage.setItem(CART_KEY, '[]');
  clearLegacyCartKeys();
  updateCartCount([]);
  if(typeof renderCartItems === 'function') renderCartItems();
  showSoftToast('Cart cleared');
}
function clearSubmittedOrderCart(){
  localStorage.setItem(ORDER_CART_CLEAR_KEY, String(Date.now()));
  localStorage.setItem(CART_KEY, '[]');
  clearLegacyCartKeys();
  updateCartCount([]);
  if(typeof renderCartItems === 'function') renderCartItems();
}
function finishPendingOrderCartClear(){
  if(!localStorage.getItem(ORDER_CART_CLEAR_KEY)) return;
  localStorage.setItem(CART_KEY, '[]');
  clearLegacyCartKeys();
  localStorage.removeItem(ORDER_CART_CLEAR_KEY);
}
function cartItemHtml(item, index){
  const key = cartItemKey(item);
  const safeKey = cartSafeJs(key);
  const qty = Math.max(1, cartNumber(item.qty, 1));
  const lineTotal = cartNumber(item.price, 0) * qty;
  const saving = item.mrp && item.price && item.mrp > item.price ? (item.mrp - item.price) * qty : 0;
  const availabilityStatus = cartText(item.availabilityStatus || 'ok').toLowerCase();
  const hasAvailabilityIssue = availabilityStatus && availabilityStatus !== 'ok';
  const availabilityTitle = availabilityStatus === 'removed' ? 'Removed from shop' : availabilityStatus === 'out_of_stock' ? 'Out of stock' : availabilityStatus === 'insufficient_stock' ? 'Limited Stock' : 'Availability Update';
  const availabilityMessage = cartText(item.availabilityMessage || `${availabilityTitle}. Contact ${shopPhonePretty()} for support and latest availability.`);
  const meta = [
    item.variant && item.variant !== 'Standard' ? `<span>${item.color && item.color !== 'Default' ? 'Size' : 'Option'} <b>${cartEscape(item.variant)}</b></span>` : '',
    item.color && item.color !== 'Default' ? `<span>Color <b>${cartEscape(item.color)}</b></span>` : '',
    item.subcategory ? `<span>${cartEscape(item.subcategory)}</span>` : '',
    item.offerStatus === 'live' && item.offerId ? '<span class="cart-offer-chip"><b>Offer price</b></span>' : '',
    item.trackInventory === true ? `<span><b>${Math.max(0, Math.floor(cartNumber(item.stockQuantity, 0)))}</b> in stock</span>` : ''
  ].filter(Boolean).join('');
  const offerWarning = item.offerStatus === 'expired' ? `<div class="cart-offer-warning"><b>Offer expired</b><span>${cartEscape(item.offerMessage || 'The regular product price is now applied.')}</span></div>` : '';
  const productHref = cartProductRelativeLink(item);
  const safeProductHref = cartEscape(productHref);
  return `<article class="premium-cart-item cart-item-clickable ${hasAvailabilityIssue ? 'cart-item-issue' : ''}" data-product-url="${safeProductHref}" tabindex="0" role="link" aria-label="Open ${cartEscape(item.name)}">
    <a class="premium-cart-img cart-item-image-link shimmer" href="${safeProductHref}" aria-label="Open ${cartEscape(item.name)}"><img loading="lazy" decoding="async" src="${cartImage(item.image, 420)}" onload="this.parentElement.classList.remove('shimmer')" onerror="this.src=SITE_CONFIG.defaultCategoryImage" alt="${cartEscape(item.name)}"></a>
    <div class="premium-cart-info">
      <div class="premium-cart-top"><h3><a class="cart-item-title-link" href="${safeProductHref}">${index+1}. ${cartEscape(item.name)}</a></h3><button class="cart-remove-x" type="button" onclick="removeCartItem('${safeKey}')" aria-label="Remove ${cartEscape(item.name)}">×</button></div>
      <p class="premium-cart-cat">${cartEscape(item.category || 'Product')}${item.subcategory ? ' • ' + cartEscape(item.subcategory) : ''}</p>
      ${meta ? `<div class="premium-cart-meta">${meta}</div>` : ''}
      <div class="premium-cart-price"><strong>${cartPriceText(lineTotal)}</strong>${item.mrp && item.mrp > item.price ? `<del>${cartPriceText(item.mrp * qty)}</del>` : ''}${saving ? `<em>Save ${cartPriceText(saving)}</em>` : ''}</div>
      ${hasAvailabilityIssue ? `<div class="cart-item-warning"><b>${cartEscape(availabilityTitle)}</b><span>${cartEscape(availabilityMessage)}</span><a href="${shopPhoneHref()}">Contact ${cartEscape(shopPhonePretty())}</a></div>` : ''}
      ${offerWarning}
      ${item.terms && item.terms.length ? `<div class="premium-cart-terms">${item.terms.slice(0,3).map(t => `<span>${cartEscape(t)}</span>`).join('')}</div>` : ''}
      <div class="premium-cart-actions">
        <div class="premium-qty" aria-label="Quantity control"><button type="button" onclick="changeCartQty('${safeKey}', -1)">−</button><b>${qty}</b><button type="button" onclick="changeCartQty('${safeKey}', 1)">+</button></div>
        <small>${cartPriceText(item.price)} each</small>
      </div>
    </div>
  </article>`;
}
function cartCheckoutSource(source = 'auto'){
  return source === 'page' || source === 'drawer' ? source : 'auto';
}
function customerField(idBase, source = 'auto'){
  const drawerId = 'drawer' + idBase[0].toUpperCase() + idBase.slice(1);
  const ids = cartCheckoutSource(source) === 'page'
    ? [idBase]
    : cartCheckoutSource(source) === 'drawer'
      ? [drawerId]
      : [idBase, drawerId];
  for(const id of ids){
    const value = document.getElementById(id)?.value?.trim();
    if(value) return value;
  }
  return '';
}
function customerPaymentMethod(source = 'auto'){
  const context = cartCheckoutSource(source);
  const ids = context === 'page' ? ['paymentMethod'] : context === 'drawer' ? ['drawerPaymentMethod'] : ['paymentMethod','drawerPaymentMethod'];
  for(const id of ids){
    const value = cartText(document.getElementById(id)?.value).toLowerCase();
    if(value === 'online' || value === 'cod') return value;
  }
  return 'cod';
}
function readOrderRefs(){
  try{ const data=JSON.parse(localStorage.getItem(ORDER_REFS_KEY)||'[]'); return Array.isArray(data)?data:[]; }catch(_error){ return []; }
}
function saveOrderRef(order){
  if(!order?.order_id || !order?.tracking_token) return;
  const refs=readOrderRefs().filter(item=>cartText(item.id)!==cartText(order.order_id));
  refs.unshift({id:order.order_id,number:order.order_number||'',token:order.tracking_token,createdAt:new Date().toISOString()});
  localStorage.setItem(ORDER_REFS_KEY,JSON.stringify(refs.slice(0,100)));
}
async function broadcastCustomerStockChange(action='customer-order'){
  try{
    const client = typeof supabaseClient === 'function' ? supabaseClient() : (window.__welloneSupabase || window.supabase.createClient(SITE_CONFIG.supabaseUrl,SITE_CONFIG.supabaseAnonKey));
    const channel=client.channel('wellone-store-events-v1',{config:{broadcast:{self:false,ack:true}}});
    await new Promise(resolve=>{ const timer=setTimeout(resolve,650); channel.subscribe(status=>{ if(status==='SUBSCRIBED'){clearTimeout(timer);resolve();} }); });
    await channel.send({type:'broadcast',event:'store-change',payload:{tables:['products','product_variants','orders'],action,eventId:`order-${Date.now()}-${Math.random().toString(36).slice(2)}`,at:Date.now()}}).catch(()=>{});
    client.removeChannel(channel);
  }catch(_error){}
}
function cartNoticeTarget(source = 'auto'){
  const context = cartCheckoutSource(source);
  if(context === 'page') return document.getElementById('cartItems');
  if(context === 'drawer'){
    ensureCartDrawer();
    return document.getElementById('cartDrawerItems');
  }
  return document.getElementById('cartDrawerItems') || document.getElementById('cartItems');
}
function clearCartNotices(source = 'auto'){
  const target = cartNoticeTarget(source);
  target?.parentElement?.querySelectorAll('.cart-notice').forEach(x => x.remove());
}
function showCartNotice(text, type = 'warn', source = 'auto'){
  const target = cartNoticeTarget(source);
  clearCartNotices(source);
  const notice = document.createElement('div');
  notice.className = `cart-notice ${type}`;
  notice.textContent = text;
  target?.parentElement?.insertBefore(notice, target);
}
function cartProductAvailable(product){
  return !!product && cartText(product.Status || 'active') === 'active' && cartText(product.StockStatus || 'in_stock') !== 'out_of_stock' && !(product.TrackInventory === true && cartNumber(product.StockQuantity, 0) <= 0);
}
async function getLiveCartProduct(item){
  if(typeof findProduct === 'function'){
    return await findProduct(item.category, item.id, {forceRefresh:true});
  }
  if(window.supabase && window.SITE_CONFIG){
    const client = window.__welloneSupabase || window.supabase.createClient(SITE_CONFIG.supabaseUrl, SITE_CONFIG.supabaseAnonKey);
    window.__welloneSupabase = client;
    const {data, error} = await client.from('products').select('id,name,mrp,price,status,stock_status,stock_quantity,track_inventory,main_image_url,sizes,colors,option_title,product_variants(id,label,unit,color,size,mrp,price,image_url,image_urls,stock,stock_status,sort_order)').eq('id', item.id).maybeSingle();
    if(error) throw error;
    if(!data) return null;
    return {ID:data.id, Name:data.name, MRP:data.mrp, Price:data.price, Status:data.status, StockStatus:data.stock_status, TrackInventory:data.track_inventory === true, StockQuantity:Math.max(0, cartNumber(data.stock_quantity, 0)), Image:data.main_image_url, Sizes:data.sizes, Colors:data.colors, VariantMode:(data.product_variants||[]).some(v=>cartText(v.color || v.unit))?'color':'option', Variants:(data.product_variants||[]).map(v=>({id:cartText(v.id), label:cartText(v.size || v.label || 'Standard'), color:cartText(v.color || v.unit || ''), size:cartText(v.size || v.label || 'Standard'), sizeOptions:cartText(v.size || v.label).split(/[|,\n]+/).map(x=>x.trim()).filter(Boolean), price:v.price || data.price, mrp:v.mrp || data.mrp, images:(v.image_urls&&v.image_urls.length?v.image_urls:[v.image_url].filter(Boolean)), stock:Math.max(0, cartNumber(v.stock, 0)), stockStatus:cartText(v.stock_status || 'in_stock'), inventorySource:'variant'}))};
  }
  return null;
}
function cartOfferProductId(link){
  const raw = cartText(link);
  if(!raw) return '';
  try{
    const base = (typeof location !== 'undefined' && location.href) ? location.href : 'https://wellone.in/';
    return cartText(new URL(raw, base).searchParams.get('id'));
  }catch(_error){ return ''; }
}
function cartOfferExpired(validUntil){
  const text = cartText(validUntil);
  if(!text) return false;
  const time = new Date(text).getTime();
  return Number.isFinite(time) && time <= Date.now();
}
async function getLiveCartOffer(item){
  const offerId = cartText(item && item.offerId);
  if(!offerId) return null;
  const client = (typeof supabaseClient === 'function')
    ? supabaseClient()
    : (window.__welloneSupabase || window.supabase.createClient(SITE_CONFIG.supabaseUrl, SITE_CONFIG.supabaseAnonKey));
  window.__welloneSupabase = client;
  const {data, error} = await client
    .from('offer_items')
    .select('id,item_link,offer_price,valid_until,is_active')
    .eq('id', offerId)
    .maybeSingle();
  if(error) throw error;
  return data || null;
}
function cartInventoryVariants(live){
  const roots=Array.isArray(live?.Variants)?live.Variants:[];
  const exact=[];
  roots.forEach(root=>{
    if(Array.isArray(root?.sizeVariants) && root.sizeVariants.length){
      root.sizeVariants.forEach(child=>exact.push({...child,color:clean(child.color || root.color || root.unit || '')}));
    }else exact.push(root);
  });
  return exact;
}

async function checkCartAvailabilityAndRefresh(){
  const cart = getCart();
  const unavailable = [];
  let changed = false;
  for(const item of cart){
    try{
      const live = await getLiveCartProduct(item);
      const oldStatus = cartText(item.availabilityStatus || 'ok');
      const oldMessage = cartText(item.availabilityMessage || '');
      let status = 'ok';
      let message = '';
      let matched = null;

      if(!live){
        status = 'removed';
        message = `${item.name} was removed from the shop. Contact ${shopPhonePretty()} to check support or alternatives.`;
      }else if(cartText(live.Status || 'active') !== 'active'){
        status = 'removed';
        message = `${item.name} is not listed now. Contact ${shopPhonePretty()} to check availability.`;
      }else if(cartText(live.StockStatus || 'in_stock') === 'out_of_stock' || (live.TrackInventory === true && cartNumber(live.StockQuantity, 0) <= 0)){
        status = 'out_of_stock';
        message = `${item.name} is out of stock now. Contact ${shopPhonePretty()} for latest availability.`;
      }else{
        const variants = cartInventoryVariants(live);
        const colorMode = live.VariantMode === 'color' || variants.some(v => cartText(v.color));
        const wantedSize = cartText(item.size || item.variant || 'Standard');
        const wantedColor = cartText(item.color || 'Default');
        if(item.variantId) matched = variants.find(v => cartText(v.id) === cartText(item.variantId)) || null;
        if(matched){
          // Exact true colour + size combination selected from the product page.
        }else if(colorMode){
          matched = variants.find(v => cartText(v.color || v.label).toLowerCase() === wantedColor.toLowerCase() && (wantedSize.toLowerCase()==='standard' || cartText(v.size || v.label || 'Standard').toLowerCase()===wantedSize.toLowerCase()))
            || variants.find(v => cartText(v.color || v.label).toLowerCase() === wantedColor.toLowerCase()) || null;
          if(wantedColor.toLowerCase() !== 'default' && variants.length && !matched){
            status = 'removed';
            message = `${item.name} colour ${wantedColor} is not available now. Contact ${shopPhonePretty()} to check support.`;
          }else if(matched){
            const sizes = Array.isArray(matched.sizeOptions) && matched.sizeOptions.length ? matched.sizeOptions.map(cartText) : cartText(live.Sizes || 'Standard').split(/[|,\n]+/).map(x=>x.trim()).filter(Boolean);
            if(wantedSize.toLowerCase() !== 'standard' && sizes.length && !sizes.some(size => size.toLowerCase() === wantedSize.toLowerCase())){
              status = 'removed';
              message = `${item.name} size ${wantedSize} is not available in ${wantedColor}. Contact ${shopPhonePretty()} to check support.`;
            }
          }
        }else{
          const wanted = wantedSize.toLowerCase();
          matched = variants.find(v => cartText(v.label || 'Standard').toLowerCase() === wanted) || null;
          if(wanted !== 'standard' && variants.length && !matched){
            status = 'removed';
            message = `${item.name} option ${wantedSize} is not available now. Contact ${shopPhonePretty()} to check support.`;
          }
        }
        if(status === 'ok' && matched?.id && cartText(item.variantId) !== cartText(matched.id)){
          item.variantId=cartText(matched.id);
          changed=true;
        }
        if(status === 'ok' && matched && cartText(matched.stockStatus || matched.stock_status || 'in_stock') === 'out_of_stock'){
          status = 'out_of_stock';
          const selectedLabel = colorMode && wantedColor.toLowerCase() !== 'default' ? `colour ${wantedColor}` : `option ${wantedSize}`;
          message = `${item.name} ${selectedLabel} is out of stock now. Contact ${shopPhonePretty()} for latest availability.`;
        }
        if(status === 'ok' && live.TrackInventory === true){
          const availableQty = Math.max(0, Math.floor(cartNumber(matched && matched.stock != null ? matched.stock : live.StockQuantity, 0)));
          if(availableQty <= 0){
            status = 'out_of_stock';
            message = `${item.name} is out of stock now. Contact ${shopPhonePretty()} for latest availability.`;
          }else if(Math.max(1, Math.floor(cartNumber(item.qty, 1))) > availableQty){
            status = 'insufficient_stock';
            message = `Only ${availableQty} unit${availableQty === 1 ? '' : 's'} of ${item.name} are available now. Reduce the quantity to continue.`;
          }
          if(item.trackInventory !== true || item.stockQuantity !== availableQty){
            item.trackInventory = true;
            item.stockQuantity = availableQty;
            changed = true;
          }
        }else if(status === 'ok' && item.trackInventory){
          item.trackInventory = false;
          item.stockQuantity = 0;
          changed = true;
        }
      }

      if(status !== 'ok'){
        if(oldStatus !== status || oldMessage !== message){
          item.availabilityStatus = status;
          item.availabilityMessage = message;
          changed = true;
        }
        unavailable.push({name:item.name, reason:status === 'removed' ? 'removed' : status === 'insufficient_stock' ? 'quantity unavailable' : 'out of stock', message});
        continue;
      }

      if(oldStatus !== 'ok' || oldMessage){
        item.availabilityStatus = 'ok';
        item.availabilityMessage = '';
        changed = true;
      }

      const variants = cartInventoryVariants(live);
      matched = matched || variants.find(v => item.variantId && cartText(v.id) === cartText(item.variantId)) || (live.VariantMode === 'color' ? variants.find(v => cartText(v.color || v.label).toLowerCase() === cartText(item.color || 'Default').toLowerCase() && cartText(v.size || v.label || 'Standard').toLowerCase() === cartText(item.size || item.variant || 'Standard').toLowerCase()) : variants.find(v => cartText(v.label || 'Standard').toLowerCase() === cartText(item.variant || 'Standard').toLowerCase())) || variants[0] || live;
      const regularPrice = cartNumber(matched.price || live.Price, item.price);
      const regularMrp = cartNumber(matched.mrp || live.MRP, item.mrp);
      let newPrice = regularPrice;
      let newMrp = regularMrp;

      if(item.offerId){
        const liveOffer = await getLiveCartOffer(item);
        const linkedProductId = liveOffer ? cartOfferProductId(liveOffer.item_link) : '';
        const offerMatchesProduct = !!liveOffer && (!linkedProductId || linkedProductId === cartText(item.id));
        const offerStillLive = offerMatchesProduct && liveOffer.is_active !== false && !cartOfferExpired(liveOffer.valid_until) && cartNumber(liveOffer.offer_price, 0) > 0;
        if(offerStillLive){
          newPrice = cartNumber(liveOffer.offer_price, regularPrice);
          newMrp = regularPrice || regularMrp;
          const validUntil = cartText(liveOffer.valid_until);
          if(item.offerPrice !== newPrice || item.offerValidUntil !== validUntil || item.offerStatus !== 'live' || item.offerMessage){
            item.offerPrice = newPrice;
            item.offerValidUntil = validUntil;
            item.offerStatus = 'live';
            item.offerMessage = '';
            changed = true;
          }
        }else{
          item.offerId = '';
          item.offerValidUntil = '';
          item.offerPrice = 0;
          item.offerStatus = 'expired';
          item.offerMessage = 'The promotion has ended. The current regular product price is now applied.';
          changed = true;
        }
      }

      if(newPrice && newPrice !== item.price){ item.price = newPrice; changed = true; }
      if(newMrp !== item.mrp){ item.mrp = newMrp; changed = true; }
      const newImage = cartText((matched.images && matched.images[0]) || live.Image || item.image);
      if(newImage && newImage !== item.image){ item.image = newImage; changed = true; }
      item.stockStatus = cartText(matched.stockStatus || matched.stock_status || live.StockStatus || 'in_stock');
      if(live.TrackInventory === true){
        const currentStock = Math.max(0, Math.floor(cartNumber(matched && matched.stock != null ? matched.stock : live.StockQuantity, 0)));
        if(item.trackInventory !== true || item.stockQuantity !== currentStock){ item.trackInventory = true; item.stockQuantity = currentStock; changed = true; }
      }
    }catch(e){
      // If live check fails due to network, do not block customer. WhatsApp message still asks final confirmation.
    }
  }
  if(changed) saveCart(cart);
  return unavailable;
}

async function proceedToCheckout(source = 'drawer'){
  const context = cartCheckoutSource(source) === 'page' ? 'page' : 'drawer';
  const cart = getCart();
  if(!cart.length){ showSoftToast('Cart is empty'); return; }
  showCartNotice('Checking latest availability...', 'info', context);
  const unavailable = await checkCartAvailabilityAndRefresh();
  if(unavailable.length){
    const details = unavailable.map(x => `${x.name} (${x.reason})`).join(', ');
    showOrderProblem('Some selected items need support', details, context);
    showSoftToast('Item unavailable');
    return;
  }
  clearCartNotices(context);
  showCheckoutForm(context, true);
}

function shopPhonePretty(){
  const n = cartText(SITE_CONFIG.whatsappNumber || '');
  return n ? `+${n}` : 'shop WhatsApp number';
}
function shopPhoneHref(){
  const n = cartText(SITE_CONFIG.whatsappNumber || '');
  return n ? `tel:+${n}` : '#';
}
function orderProductLink(item){
  return cartAbsoluteUrl(cartProductRelativeLink(item));
}
function orderRef(){
  const date = new Date();
  const stamp = date.toISOString().slice(0,10).replace(/-/g,'') + '-' + String(date.getHours()).padStart(2,'0') + String(date.getMinutes()).padStart(2,'0');
  return `WEL-${stamp}-${Math.floor(1000 + Math.random()*9000)}`;
}
function showOrderProblem(title, details, source = 'auto'){
  const phone = shopPhonePretty();
  showCartNotice(`${title}. ${details || ''} Contact ${phone} for support and latest availability.`, 'warn', source);
}

function orderPayloadItems(cart = getCart()){
  return cart.map(item => ({
    product_id:cartText(item.id),
    variant_id:cartText(item.variantId || ''),
    color:cartText(item.color || 'Default'),
    size:cartText(item.size || item.variant || 'Standard'),
    quantity:Math.max(1,Math.floor(cartNumber(item.qty,1))),
    offer_id:cartText(item.offerId || '')
  }));
}
async function confirmOrderToDatabase(source = 'auto'){
  const context = cartCheckoutSource(source);
  const cart = getCart();
  if(!cart.length){ showSoftToast('Cart is empty'); return; }
  const customerName = customerField('customerName', context);
  const customerPhone = customerField('customerPhone', context);
  const customerAddress = customerField('customerAddress', context);
  const paymentMethod = customerPaymentMethod(context);
  if(!customerName || !customerPhone || !customerAddress){
    showCheckoutForm(context, true);
    showSoftToast('Add name, phone and address');
    const target = context === 'page' ? document.getElementById('customerName') : document.getElementById('drawerCustomerName') || document.getElementById('customerName');
    target?.focus();
    return;
  }
  showCartNotice('Confirming your order and reserving stock...', 'info', context);
  const unavailable = await checkCartAvailabilityAndRefresh();
  if(unavailable.length){
    const details = unavailable.map(x => `${x.name} (${x.reason})`).join(', ');
    showOrderProblem('Some selected items need support', details, context);
    showSoftToast('Item unavailable');
    return;
  }
  try{
    const client = typeof supabaseClient === 'function' ? supabaseClient() : (window.__welloneSupabase || window.supabase.createClient(SITE_CONFIG.supabaseUrl,SITE_CONFIG.supabaseAnonKey));
    const {data,error}=await client.rpc('create_customer_order',{
      p_customer_name:customerName,
      p_customer_phone:customerPhone,
      p_customer_address:customerAddress,
      p_payment_method:paymentMethod,
      p_items:orderPayloadItems(cart)
    });
    if(error) throw error;
    if(!data?.order_id || !data?.tracking_token) throw new Error('Order confirmation did not return a tracking reference.');
    saveOrderRef(data);
    clearSubmittedOrderCart();
    broadcastCustomerStockChange('customer-order-confirmed').catch(()=>{});
    window.location.assign(`order-confirmed.html?id=${encodeURIComponent(data.order_id)}`);
  }catch(error){
    const message=cartText(error?.message || 'Could not confirm the order. Please try again.').replace(/^.*?exception:\s*/i,'');
    showCartNotice(message,'warn',context);
    showSoftToast('Order not confirmed');
  }
}
function checkoutWhatsApp(source = 'auto'){ confirmOrderToDatabase(source); }
function confirmOrderToWhatsApp(source = 'auto'){ confirmOrderToDatabase(source); }
function placeOrder(){ openCartDrawer(false); proceedToCheckout('drawer'); }
function openOrderModal(){ openCartDrawer(false); proceedToCheckout('drawer'); }
function closeOrderModal(){ closeCartDrawer(); }
function showSoftToast(text){
  let toast = document.getElementById('toast');
  if(!toast){ toast = document.createElement('div'); toast.id = 'toast'; toast.className = 'toast'; document.body.appendChild(toast); }
  toast.textContent = text;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 1400);
}
function ensureCartDrawer(){
  if(document.getElementById('cartDrawer')) return;
  document.body.insertAdjacentHTML('beforeend', `<div class="cart-overlay" id="cartOverlay" onclick="closeCartDrawer()"></div>
  <aside class="cart-drawer" id="cartDrawer" aria-label="Shopping cart" aria-hidden="true">
    <div class="cart-head"><div><p class="tag">shopping cart</p><h2>Your cart</h2><p class="cart-support-top">Support: <a href="${shopPhoneHref()}">${shopPhonePretty()}</a></p></div><button class="cart-close" type="button" onclick="closeCartDrawer()" aria-label="Close cart"><span>×</span></button></div>
    <div class="cart-drawer-total"><span><b data-cart-count>0</b> item(s)</span><strong data-cart-total>₹0</strong></div>
    <div id="cartDrawerItems" class="cart-items"></div>
    <div id="cartDrawerAction" class="cart-action-footer"><button class="btn primary full" type="button" onclick="proceedToCheckout('drawer')">Proceed to order</button></div>
    <form id="drawerCheckoutForm" class="checkout-form checkout-hidden" onsubmit="event.preventDefault(); confirmOrderToWhatsApp('drawer');">
      <label>Name<input id="drawerCustomerName" autocomplete="name" placeholder="Your name"></label>
      <label>Phone<input id="drawerCustomerPhone" autocomplete="tel" inputmode="tel" placeholder="Your phone"></label>
      <label>Address<textarea id="drawerCustomerAddress" rows="2" placeholder="Delivery address"></textarea></label>
      <label>Payment<select id="drawerPaymentMethod"><option value="cod">Cash on delivery</option><option value="online">Online payment</option></select></label>
      <button class="btn primary full whatsapp-checkout" type="submit">Confirm Order</button>
    </form>
  </aside>`);
}
function showCheckoutForm(source = 'auto', focus = false){
  if(typeof source === 'boolean'){
    focus = source;
    source = 'auto';
  }
  const context = cartCheckoutSource(source);
  const form = context === 'page'
    ? document.getElementById('pageCheckoutForm')
    : context === 'drawer'
      ? document.getElementById('drawerCheckoutForm')
      : document.getElementById('drawerCheckoutForm') || document.getElementById('pageCheckoutForm');
  const action = context === 'page'
    ? document.getElementById('pageCartAction')
    : context === 'drawer'
      ? document.getElementById('cartDrawerAction')
      : document.getElementById('cartDrawerAction') || document.getElementById('pageCartAction');
  form?.classList.remove('checkout-hidden');
  action?.classList.add('hide');
  if(focus){
    const input = context === 'page'
      ? document.getElementById('customerName')
      : document.getElementById('drawerCustomerName') || document.getElementById('customerName');
    setTimeout(() => input?.focus(), 80);
  }
}
function resetDrawerCheckoutState(){
  document.getElementById('drawerCheckoutForm')?.classList.add('checkout-hidden');
  const action = document.getElementById('cartDrawerAction');
  action?.classList.toggle('hide', !getCart().length);
  clearCartNotices('drawer');
}
function openCartDrawer(focusForm = false){
  ensureCartDrawer();
  if(!focusForm) resetDrawerCheckoutState();
  renderCartItems();
  document.getElementById('cartOverlay')?.classList.add('open');
  const drawer = document.getElementById('cartDrawer');
  drawer?.classList.add('open');
  drawer?.setAttribute('aria-hidden','false');
  document.body.classList.add('cart-open');
  if(focusForm) proceedToCheckout('drawer');
}
function closeCartDrawer(){
  document.getElementById('cartOverlay')?.classList.remove('open');
  const drawer = document.getElementById('cartDrawer');
  drawer?.classList.remove('open');
  drawer?.setAttribute('aria-hidden','true');
  document.body.classList.remove('cart-open');
}
function renderCartItems(){
  const cart = getCart();
  updateCartCount(cart);
  const total = getCartTotal(cart);
  const html = cart.length
    ? cart.map((item, index) => cartItemHtml(item, index)).join('')
    : `<div class="cart-empty"><h3>Your cart is empty</h3><p>Open catalog and add products.</p><a class="btn primary" href="catalog.html">Open Catalog</a></div>`;
  document.querySelectorAll('#cartDrawerItems,#cartItems').forEach(holder => { holder.innerHTML = html; });
  document.querySelectorAll('#cartTotal').forEach(el => { el.textContent = total.toLocaleString('en-IN'); });
  document.querySelectorAll('[data-cart-total]').forEach(el => { el.textContent = cartFormatMoney(total); });
  document.querySelectorAll('#cartDrawerAction,#pageCartAction').forEach(el => el.classList.toggle('hide', !cart.length));
  document.querySelectorAll('#drawerCheckoutForm,#pageCheckoutForm').forEach(el => el.classList.toggle('checkout-hidden', !cart.length || el.classList.contains('checkout-hidden')));
}

function setupCartItemNavigation(){
  if(document.documentElement.dataset.cartItemNavigationBound) return;
  document.documentElement.dataset.cartItemNavigationBound = '1';
  document.addEventListener('click', event => {
    const card = event.target.closest?.('.premium-cart-item[data-product-url]');
    if(!card || event.target.closest('a,button,input,textarea,select,label,form')) return;
    const url = card.dataset.productUrl;
    if(url) location.href = url;
  });
  document.addEventListener('keydown', event => {
    if(event.key !== 'Enter' && event.key !== ' ') return;
    const card = event.target.closest?.('.premium-cart-item[data-product-url]');
    if(!card || event.target.closest('a,button,input,textarea,select,label,form')) return;
    event.preventDefault();
    const url = card.dataset.productUrl;
    if(url) location.href = url;
  });
}
function headerBackFallback(){
  const page = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  if(page === 'product.html'){
    const category = new URLSearchParams(location.search).get('cat') || '';
    return `catalog.html${category ? '?cat=' + encodeURIComponent(category) : ''}`;
  }
  if(page === 'catalog.html' || page === 'about.html' || page === 'contact.html' || page === 'orders.html') return 'index.html';
  if(page === 'cart.html') return 'catalog.html';
  return '';
}
function goBackFromHeader(){
  try{
    if(window.navigation && window.navigation.canGoBack){
      window.navigation.back();
      return;
    }
    if(history.length > 1){
      history.back();
      return;
    }
  }catch(e){}
  const fallback = headerBackFallback();
  if(fallback) location.assign(fallback);
  else showSoftToast('You are on the home page');
}
function initHeaderBackButtons(){
  document.querySelectorAll('[data-header-back]').forEach(button => {
    if(button.dataset.bound) return;
    button.dataset.bound = '1';
    button.addEventListener('click', goBackFromHeader);
  });
}

function setupCartTriggers(){
  ensureCartDrawer();
  document.querySelectorAll('.floating-cart').forEach(el => {
    el.addEventListener('click', event => {
      if(document.body.classList.contains('cart-page')) return;
      event.preventDefault();
      openCartDrawer(false);
    });
  });
  document.querySelectorAll('.floating-cart').forEach(el => {
    el.classList.add('cart-float');
    el.innerHTML = `<span class="cart-icon" aria-hidden="true"><svg viewBox="0 0 32 32" width="30" height="30"><path d="M7 8h2.2l2.1 11.1c.2 1.1 1.2 1.9 2.3 1.9h9.7c1 0 1.9-.6 2.2-1.6l2-6.4H11" fill="none" stroke="currentColor" stroke-width="2.7" stroke-linecap="round" stroke-linejoin="round"/><circle cx="14" cy="25" r="2" fill="currentColor"/><circle cx="23" cy="25" r="2" fill="currentColor"/></svg></span><span class="cart-count" id="floatCartCount">0</span>`;
    el.setAttribute('href','#cart');
  });
}
function refreshCartEverywhere(){ updateCartCount(); renderCartItems(); }
function initMobileMenu(){
  const header = document.querySelector('.header');
  const button = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.nav');
  if(!header || !button || !nav) return;
  if(button.dataset.bound) return;
  button.dataset.bound = '1';
  button.addEventListener('click', () => {
    const isOpen = header.classList.toggle('menu-open');
    button.setAttribute('aria-expanded', String(isOpen));
  });
  nav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
    header.classList.remove('menu-open');
    button.setAttribute('aria-expanded', 'false');
  }));
  document.addEventListener('click', event => {
    if(!header.contains(event.target)){
      header.classList.remove('menu-open');
      button.setAttribute('aria-expanded', 'false');
    }
  });
}
function injectOrdersNavigation(){
  document.querySelectorAll('.nav').forEach(nav=>{
    if(nav.querySelector('a[href*="orders.html"]')) return;
    const link=document.createElement('a'); link.href='orders.html'; link.textContent='Orders';
    const contact=Array.from(nav.querySelectorAll('a')).find(a=>/contact/i.test(a.textContent||''));
    if(contact) nav.insertBefore(link,contact); else nav.appendChild(link);
  });
}
function initCartSystem(){ finishPendingOrderCartClear(); injectOrdersNavigation(); setupCartTriggers(); setupCartItemNavigation(); initHeaderBackButtons(); initMobileMenu(); refreshCartEverywhere(); }
let cartLiveUpdateTimer = null;
window.addEventListener('wellone:store-update', event => {
  const tables = Array.isArray(event.detail && event.detail.tables) ? event.detail.tables : [];
  if(tables.length && !tables.some(table => ['products','product_variants','product_images','categories','subcategories'].includes(table))) return;
  clearTimeout(cartLiveUpdateTimer);
  cartLiveUpdateTimer = setTimeout(async () => {
    try{
      await checkCartAvailabilityAndRefresh();
      refreshCartEverywhere();
    }catch(_error){}
  }, 30);
});
window.WelloneCart = { getCart, saveCart, addCartItem, removeCartItem, changeCartQty, clearCart, renderCartItems, openCartDrawer, closeCartDrawer, checkoutWhatsApp, showCheckoutForm, proceedToCheckout, checkCartAvailabilityAndRefresh, cartProductRelativeLink, goBackFromHeader };
window.addEventListener('pageshow', () => { finishPendingOrderCartClear(); refreshCartEverywhere(); });
window.addEventListener('storage', refreshCartEverywhere);
document.addEventListener('visibilitychange', () => { if(!document.hidden) refreshCartEverywhere(); });
if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initCartSystem);
else initCartSystem();

/* bundled from supabase-data.js */
/* Wellone customer data v77 — inventory, promotional items and admin-success event updates
   Supabase Database + Supabase Storage only.
*/
'use strict';

let categoryCache = null;
let termsCache = null;
let offersCache = null;
let offerItemsCache = null;
const productCacheByKey = new Map();
const FAST_CACHE_MS = 2 * 60 * 1000; // fast repeat visits; live store events explicitly invalidate affected data
const STORE_CHANNEL_NAME = 'wellone-store-events-v1';
const STORE_EVENT_NAME = 'store-change';
const storeUpdateListeners = new Set();
const subcategoryCache = new Map();
const subcategoryIdCache = new Map();
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
  id,name,slug,description,mrp,price,main_image_url,status,stock_status,stock_quantity,track_inventory,sizes,colors,option_title,terms,created_at,updated_at,sort_order,
  categories(id,name,image_url),
  subcategories(id,name),
  product_images(id,image_url,storage_path,sort_order),
  product_variants(id,label,color,size,mrp,price,image_url,image_urls,terms,unit,stock,stock_status,sort_order)
`;
const PRODUCT_LIST_SELECT = `
  id,name,mrp,price,main_image_url,status,stock_status,stock_quantity,track_inventory,updated_at,
  categories(id,name),
  subcategories(id,name),
  product_variants(id,label,color,size,mrp,price,unit,stock,stock_status,sort_order)
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
function cacheKey(name){ return 'wellone_supabase_v83_' + name; }
function now(){ return Date.now(); }
function readAnyCache(name){ try{ const raw = localStorage.getItem(cacheKey(name)); if(!raw) return null; const pack = JSON.parse(raw); return pack && pack.data ? pack.data : null; }catch(e){ return null; } }
function readFastCache(name){ try{ const raw = localStorage.getItem(cacheKey(name)); if(!raw) return null; const pack = JSON.parse(raw); if(!pack || !pack.time || now() - pack.time > FAST_CACHE_MS) return null; return pack.data || null; }catch(e){ return null; } }
function pruneWelloneCache(maxEntries = 42){
  try{
    const prefix = 'wellone_supabase_v83_';
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
    const currentPrefix = 'wellone_supabase_v83_';
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
function offerLinkedProductId(link){
  const raw = cleanText(link);
  if(!raw) return '';
  try{
    const url = new URL(raw, (typeof location !== 'undefined' && location.href) ? location.href : 'https://wellone.in/');
    return cleanText(url.searchParams.get('id'));
  }catch(_error){ return ''; }
}
function normalizeOfferItems(data, productMap = new Map()){
  const current = Date.now();
  return (data || []).map((o,i) => {
    const link = cleanText(o.item_link || 'catalog.html');
    const linkedProductId = offerLinkedProductId(link);
    const product = productMap.get(linkedProductId) || null;
    const validUntil = cleanText(o.valid_until || '');
    const validTime = validUntil ? new Date(validUntil).getTime() : 0;
    const expired = Boolean(validTime && validTime <= current);
    return {
      id: cleanText(o.id || `offer-item-${i+1}`),
      title: cleanText(o.title || (product && product.name) || 'Special offer'),
      link,
      offerPrice: dbPrice(o.offer_price),
      discount: o.discount_percentage === null || o.discount_percentage === undefined ? '' : cleanText(o.discount_percentage),
      validUntil,
      active: o.is_active !== false,
      expired,
      productId: cleanText(linkedProductId),
      productName: cleanText(product && product.name),
      image: optimizeImageUrl(cleanText(product && product.main_image_url), 620),
      mrp: dbPrice(product && product.mrp),
      productPrice: dbPrice(product && product.price),
      stockStatus: cleanText(product && product.stock_status || 'in_stock'),
      trackInventory: product && product.track_inventory === true,
      stockQuantity: Math.max(0, Number(product && product.stock_quantity || 0) || 0)
    };
  }).filter(item => item.active && item.offerPrice);
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
    StockStatus: cleanText(row.stock_status || 'in_stock'),
    TrackInventory: row.track_inventory === true,
    StockQuantity: Math.max(0, Number(row.stock_quantity || 0) || 0)
  };
  const mainSizeOptions = splitOptions(product.Sizes || '').filter(Boolean);
  const fallbackSizes = mainSizeOptions.length ? mainSizeOptions : ['Standard'];
  const dbVariants = (row.product_variants || [])
    .slice()
    .sort((a,b)=>Number(a.sort_order||0)-Number(b.sort_order||0))
    .map(v => {
      const ownImages = parseImages((Array.isArray(v.image_urls) && v.image_urls.length ? v.image_urls : [v.image_url].filter(Boolean)));
      const color = cleanText(v.color || v.unit || '');
      const rawSize = cleanText(v.size || v.label || '');
      const ownSizes = splitOptions(rawSize).filter(Boolean);
      return {
        id: cleanText(v.id || ''),
        label: rawSize || 'Standard',
        color,
        size: rawSize || 'Standard',
        sizeOptions: ownSizes.length ? ownSizes : fallbackSizes,
        price: dbPrice(v.price || row.price),
        mrp: dbPrice(v.mrp || row.mrp),
        unit: color,
        images: ownImages.length ? ownImages : product.Images,
        hasOwnImages: ownImages.length > 0,
        terms: [],
        stock: Math.max(0, Number(v.stock || 0) || 0),
        stockStatus: cleanText(v.stock_status || 'in_stock'),
        trackInventory: product.TrackInventory,
        inventorySource: 'variant'
      };
    });
  const syntheticInventory = dbVariants.length
    ? {stock:0, stockStatus:product.TrackInventory ? 'out_of_stock' : 'in_stock', trackInventory:product.TrackInventory, inventorySource:'synthetic'}
    : {stock:product.StockQuantity, stockStatus:product.StockStatus, trackInventory:product.TrackInventory, inventorySource:'product'};
  const colorDbVariants = dbVariants.filter(v => cleanText(v.color));
  const legacyDbVariants = dbVariants.filter(v => !cleanText(v.color));
  if(colorDbVariants.length){
    const groups = [];
    colorDbVariants.forEach(v => {
      const color = cleanText(v.color || 'Default');
      let group = groups.find(x => cleanKey(x.color) === cleanKey(color));
      if(!group){
        group = {
          id:v.id,
          label:color,
          color,
          sizeOptions:[],
          sizeVariants:[],
          price:v.price || product.Price,
          mrp:v.mrp || product.MRP,
          unit:color,
          images:v.images || product.Images,
          hasOwnImages:v.hasOwnImages,
          terms:[],
          stock:0,
          stockStatus:'out_of_stock',
          trackInventory:product.TrackInventory,
          inventorySource:'group'
        };
        groups.push(group);
      }
      const sizes = Array.isArray(v.sizeOptions) && v.sizeOptions.length ? v.sizeOptions : [v.size || v.label || 'Standard'];
      sizes.forEach((size, index) => {
        const child = {...v, size:cleanText(size || 'Standard'), label:cleanText(size || 'Standard'), sizeOptions:[cleanText(size || 'Standard')]};
        // Old colour rows may contain a comma-separated size list but only one shared stock count.
        // Keep the first child as the stock-owning record and mark the rest as legacy aliases.
        if(index > 0 && sizes.length > 1){ child.id = v.id; child.legacySharedStock = true; }
        group.sizeVariants.push(child);
        if(!group.sizeOptions.some(x => cleanKey(x) === cleanKey(child.size))) group.sizeOptions.push(child.size);
      });
    });
    const mainColors = splitOptions(product.Colors || '').filter(c => cleanKey(c) !== 'default');
    mainColors.forEach(color => {
      if(groups.some(g => cleanKey(g.color) === cleanKey(color))) return;
      groups.push({label:color,color,sizeOptions:fallbackSizes,sizeVariants:[],price:product.Price,mrp:product.MRP,unit:color,images:product.Images,hasOwnImages:false,terms:[],...syntheticInventory});
    });
    groups.forEach(group => {
      const uniqueStockRows = new Map();
      group.sizeVariants.forEach(child => { if(child.id && !uniqueStockRows.has(child.id)) uniqueStockRows.set(child.id, child); });
      const stockRows = [...uniqueStockRows.values()];
      group.stock = stockRows.reduce((sum, child) => sum + Math.max(0, Number(child.stock || 0) || 0), 0);
      group.stockStatus = !product.TrackInventory || stockRows.some(child => cleanText(child.stockStatus || 'in_stock') !== 'out_of_stock' && Number(child.stock || 0) > 0) ? 'in_stock' : 'out_of_stock';
    });
    product.VariantMode = 'color';
    product.Variants = groups;
  }else{
    const samePriceVariants = fallbackSizes.map((size,i) => ({
      id:'', label:size, size, color:'', sizeOptions:[size], price:product.Price, mrp:product.MRP, unit:'', images:product.Images, hasOwnImages:false, terms:[], ...syntheticInventory, isBase:i === 0
    }));
    if(legacyDbVariants.length){
      const merged = [...samePriceVariants];
      legacyDbVariants.forEach(v => {
        const label = cleanText(v.size || v.label || 'Standard');
        const existing = merged.find(x => cleanKey(x.label) === cleanKey(label));
        if(existing) Object.assign(existing, v, {label, size:label, sizeOptions:[label]});
        else merged.push({...v, label, size:label, sizeOptions:[label]});
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
    const prefix = 'wellone_supabase_v83_';
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
    subcategoryIdCache.clear();
    removeStoreCacheEntries(key => key === 'categories' || key.startsWith('subcategories_'));
  }else if(name === 'subcategories'){
    subcategoryCache.clear();
    subcategoryIdCache.clear();
    removeStoreCacheEntries(key => key.startsWith('subcategories_'));
  }
  if(name === 'offer_slides' || !name){
    offersCache = null;
    removeStoreCacheEntries(key => key === 'offers');
  }
  if(name === 'offer_items' || !name){
    offerItemsCache = null;
    removeStoreCacheEntries(key => key === 'offer_items');
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
  try{ window.dispatchEvent(new CustomEvent('wellone:store-update', {detail:batch})); }catch(_error){}
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
  }, 10);
}
function handleDatabaseChange(table, payload){
  emitStoreUpdate({
    tables:[table],
    eventType:cleanText(payload && payload.eventType) || 'DATABASE_CHANGE',
    source:'database',
    eventId:''
  }, 90);
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
    ['categories','subcategories','products','product_images','product_variants','offer_slides','offer_items','terms'].forEach(table => {
      channel.on('postgres_changes', {event:'*', schema:'public', table}, payload => handleDatabaseChange(table, payload));
    });
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
  const cached = !forceRefresh && (readFastCache('categories') || readAnyCache('categories'));
  if(cached){ categoryCache = cached; return cached; }
  const base = await supabaseClient()
    .from('categories')
    .select('id,name,image_url,description,sort_order,is_active,products!inner(id)')
    .eq('is_active', true)
    .eq('products.status', 'active')
    .order('sort_order', {ascending:true})
    .order('name', {ascending:true})
    .limit(1, {foreignTable:'products'});
  if(base.error) throw base.error;
  categoryCache = normalizeCategories(base.data || []);
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
async function loadOfferItems(forceRefresh = false){
  if(!forceRefresh && offerItemsCache) return offerItemsCache;
  const cached = !forceRefresh && (readFastCache('offer_items') || readAnyCache('offer_items'));
  if(cached){ offerItemsCache = cached; return cached; }
  const {data, error} = await supabaseClient()
    .from('offer_items')
    .select('id,title,item_link,offer_price,discount_percentage,valid_until,is_active,sort_order,created_at')
    .eq('is_active', true)
    .order('sort_order', {ascending:true})
    .order('created_at', {ascending:false});
  if(error){
    if(error.code === '42P01' || /relation .*offer_items.*does not exist/i.test(cleanText(error.message))){
      offerItemsCache = [];
      return offerItemsCache;
    }
    throw error;
  }
  const rows = data || [];
  const productIds = uniqueClean(rows.map(row => offerLinkedProductId(row.item_link)));
  const productMap = new Map();
  if(productIds.length){
    const {data:products, error:productError} = await supabaseClient()
      .from('products')
      .select('id,name,mrp,price,main_image_url,status,stock_status,stock_quantity,track_inventory')
      .in('id', productIds)
      .eq('status','active');
    if(!productError) (products || []).forEach(product => productMap.set(cleanText(product.id), product));
  }
  offerItemsCache = normalizeOfferItems(rows, productMap);
  writeFastCache('offer_items', offerItemsCache);
  return offerItemsCache;
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
    if(subcategoryIdCache.has(key)) return stored.slice();
  }
  const category = await getCategoryByName(categoryName);
  if(!category) return [];
  let {data, error} = await supabaseClient().rpc('wellone_active_subcategories', {p_category_id:category.id});
  if(error && /function|schema cache|wellone_active_subcategories/i.test(cleanText(error.message))){
    const fallback = await supabaseClient()
      .from('subcategories')
      .select('id,name,sort_order,is_active,products!inner(id)')
      .eq('category_id', category.id)
      .eq('is_active', true)
      .eq('products.status', 'active')
      .order('sort_order', {ascending:true})
      .order('name', {ascending:true})
      .limit(1, {foreignTable:'products'});
    data = fallback.data;
    error = fallback.error;
  }
  if(error) throw error;
  const ids = new Map();
  (data || []).forEach(item => ids.set(cleanKey(item.name), cleanText(item.id)));
  subcategoryIdCache.set(key, ids);
  const result = uniqueClean((data || []).map(item => item.name));
  subcategoryCache.set(key, {time:now(), data:result});
  writeFastCache(`subcategories_${key}`, result);
  return result.slice();
}
async function getSubcategoryId(categoryName, subcategoryName){
  const categoryKey = cleanKey(categoryName);
  const subKey = cleanKey(subcategoryName);
  if(!subKey) return '';
  let ids = subcategoryIdCache.get(categoryKey);
  if(!ids){
    await loadSubcategories(categoryName, false);
    ids = subcategoryIdCache.get(categoryKey);
  }
  return cleanText(ids && ids.get(subKey));
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
  const rawQuery = cleanText(q);
  const terms = searchTerms(rawQuery).map(value => value.toLowerCase());
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
  const productIds = uniqueClean((variantRes.data || []).map(v => v.product_id)).slice(0, 80);
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
    const subcategoryId = await getSubcategoryId(categoryName, opts.subcategory);
    if(subcategoryId) query = query.eq('subcategory_id', subcategoryId); else return {products:[], nextOffset:null, total:0};
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

/* bundled from app.js */
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
let activeOfferItem = null;
let activeOfferNotice = '';
let activeOfferNoticeTitle = 'Offer unavailable';
let activeOfferExpiryTimer = null;
let offersPageExpiryTimer = null;
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
    product.TrackInventory === true, Number(product.StockQuantity || 0),
    cleanText(product.UpdatedAt), cleanText(variant.label), cleanText(variant.price), cleanText(variant.mrp),
    cleanText(variant.stockStatus), Number(variant.stock || 0), (variant.images || []).join('|')
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
function patchProductCardNode(node, product, categoryName){
  const fresh = productCardElement(product, categoryName);
  if(!node || !fresh) return fresh || node;

  ['class','href','aria-label','onclick','onpointerenter','ontouchstart'].forEach(attribute => {
    const value = fresh.getAttribute(attribute);
    if(value === null) node.removeAttribute(attribute);
    else if(node.getAttribute(attribute) !== value) node.setAttribute(attribute, value);
  });
  node.dataset.productSig = fresh.dataset.productSig || '';

  const image = node.querySelector('[data-card-image]');
  const freshImage = fresh.querySelector('[data-card-image]');
  if(image && freshImage){
    const nextSrc = freshImage.getAttribute('src') || '';
    if(image.getAttribute('src') !== nextSrc){
      image.parentElement?.classList.add('shimmer');
      image.setAttribute('src', nextSrc);
    }
    if(image.alt !== freshImage.alt) image.alt = freshImage.alt;
  }

  const fields = ['badges','name','price'];
  fields.forEach(field => {
    const current = node.querySelector(`[data-card-${field}]`);
    const next = fresh.querySelector(`[data-card-${field}]`);
    if(!current || !next) return;
    if(field === 'name'){
      if(current.textContent !== next.textContent) current.textContent = next.textContent;
    }else if(current.innerHTML !== next.innerHTML){
      current.innerHTML = next.innerHTML;
    }
  });
  return node;
}
function patchProductGrid(grid, products){
  if(!grid) return;
  const existing = new Map();
  Array.from(grid.querySelectorAll(':scope > [data-product-id]')).forEach(node => {
    const id = cleanText(node.dataset.productId);
    if(!existing.has(id)) existing.set(id, []);
    existing.get(id).push(node);
  });
  const desiredIds = new Set();
  const fragment = document.createDocumentFragment();
  (products || []).forEach(product => {
    const id = cleanText(product.ID);
    if(!id || desiredIds.has(id)) return;
    desiredIds.add(id);
    const categoryName = product.Category || catalogState.category;
    const signature = stableProductCardSignature(product, categoryName);
    const matches = existing.get(id) || [];
    let node = matches.shift() || null;
    if(node && node.dataset.productSig !== signature){
      node = patchProductCardNode(node, product, categoryName);
    }
    matches.forEach(duplicate => duplicate.remove());
    existing.set(id, []);
    if(!node){
      node = productCardElement(product, categoryName);
    }
    if(node) fragment.appendChild(node);
  });
  existing.forEach(nodes => nodes.forEach(node => node.remove()));
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
  const unavailable = !productIsAvailable(product);
  const stockBadge = unavailable ? `<span class="product-badge stock-badge">Out of stock</span>` : '';
  return `<a class="product-card clickable-card ${unavailable ? 'is-out-stock' : ''}" data-product-id="${escapeHtml(product.ID)}" data-product-sig="${stableProductCardSignature(product, catName)}" href="${href}" onclick="persistCatalogView();cacheProductForOpen('${jsCat}','${jsId}')" onpointerenter="warmProductFromCard('${jsCat}','${jsId}')" ontouchstart="warmProductFromCard('${jsCat}','${jsId}')" aria-label="View ${escapeHtml(product.Name)}">
    <div class="product-media shimmer"><img data-card-image loading="lazy" decoding="async" src="${optimizeImageUrl(image, 620)}" onload="this.parentElement.classList.remove('shimmer')" onerror="this.src='${fallbackImageSync(catName)}'" alt="${escapeHtml(product.Name)}"></div>
    <div class="product-pad">
      <div data-card-badges>${catBadge}${sub}${stockBadge}</div><h3 data-card-name>${escapeHtml(product.Name)}</h3>
      <div data-card-price>${priceHtml(product, variant)}</div>
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
function safeStoreLink(value, fallback = 'catalog.html'){
  const raw = cleanText(value);
  if(!raw) return fallback;
  try{
    const url = new URL(raw, location.href);
    if(url.protocol !== 'http:' && url.protocol !== 'https:') return fallback;
    return /^[a-z][a-z0-9+.-]*:/i.test(raw) ? url.href : raw;
  }catch(_error){ return fallback; }
}
function offerItemExpiryTime(value){
  const text = cleanText(value);
  if(!text) return 0;
  const date = new Date(text);
  return Number.isFinite(date.getTime()) ? date.getTime() : 0;
}
function offerItemIsExpired(item){
  const time = offerItemExpiryTime(item && item.validUntil);
  return Boolean((item && item.expired === true) || (time && time <= Date.now()));
}
function offerItemIsLive(item){
  return !!item && item.active !== false && !offerItemIsExpired(item) && money(item.offerPrice) > 0;
}
function offerItemExpiryLabel(value){
  const text = cleanText(value);
  if(!text) return '';
  const date = new Date(text);
  if(!Number.isFinite(date.getTime())) return '';
  return `Valid until ${date.toLocaleString('en-IN', {day:'numeric', month:'short', year:'numeric', hour:'numeric', minute:'2-digit'})}`;
}
function offerItemProductLink(item, includeOffer = true){
  const raw = safeStoreLink(item && item.link || 'catalog.html');
  if(!includeOffer || !offerItemIsLive(item) || !cleanText(item && item.id)) return raw;
  const joiner = raw.includes('?') ? '&' : '?';
  return `${raw}${joiner}offer=${encodeURIComponent(item.id)}`;
}
function offerItemRegularPrice(item){
  return money(item && item.productPrice) || money(item && item.mrp);
}
function formatMoneyNumber(value){
  const n = money(value);
  return n ? `₹${n.toLocaleString('en-IN')}` : '';
}
function offerItemCard(item){
  const expired = offerItemIsExpired(item);
  const href = offerItemProductLink(item, !expired);
  const title = item.title || item.productName || 'Special offer';
  const image = item.image || SITE_CONFIG.defaultCategoryImage;
  const offerPrice = money(item.offerPrice);
  const regularPrice = offerItemRegularPrice(item);
  const discount = Number(item.discount || 0);
  const expiry = offerItemExpiryLabel(item.validUntil);
  const unavailable = cleanText(item.stockStatus || 'in_stock') === 'out_of_stock' || (item.trackInventory === true && Number(item.stockQuantity || 0) <= 0);
  const classes = ['offer-item-card'];
  if(unavailable) classes.push('is-out-stock');
  if(expired) classes.push('is-expired');
  const pricing = expired
    ? `<div class="offer-item-price expired-price">${regularPrice ? `<strong>${formatMoneyNumber(regularPrice)}</strong>` : '<strong>View current price</strong>'}</div>`
    : `<div class="offer-item-price live-offer-price">${regularPrice && regularPrice !== offerPrice ? `<del>${formatMoneyNumber(regularPrice)}</del>` : ''}<strong>${offerPrice ? formatMoneyNumber(offerPrice) : 'View offer'}</strong></div>`;
  const status = expired
    ? `<div class="offer-expired-warning"><b>Offer expired</b><span>Regular product price now applies.</span></div>`
    : `${expiry ? `<small>${escapeHtml(expiry)}</small>` : ''}`;
  const cta = expired ? 'View product at regular price' : 'Get this offer';
  return `<a class="${classes.join(' ')}" href="${escapeHtml(href)}" aria-label="${expired ? 'Offer expired. View' : 'View offer for'} ${escapeHtml(title)}">
    <div class="offer-item-media shimmer"><img loading="lazy" decoding="async" src="${optimizeImageUrl(image, 620)}" onload="this.parentElement.classList.remove('shimmer')" onerror="this.src=SITE_CONFIG.defaultCategoryImage" alt="${escapeHtml(title)}"></div>
    <div class="offer-item-copy">
      <div class="offer-item-badges">${expired ? '<span class="offer-expired-badge">Expired</span>' : '<span>Offer</span>'}${!expired && discount > 0 ? `<em>${Math.round(discount)}% off</em>` : ''}${unavailable ? '<em class="offer-item-stock">Out of stock</em>' : ''}</div>
      <h3>${escapeHtml(title)}</h3>
      ${pricing}
      ${status}
      <b class="offer-item-link">${escapeHtml(cta)} <span aria-hidden="true">→</span></b>
    </div>
  </a>`;
}
function productOfferPriceHtml(product, variant){
  if(!offerItemIsLive(activeOfferItem)) return priceHtml(product, variant);
  const regular = money((variant && variant.price) || product.Price || product.price) || money((variant && variant.mrp) || product.MRP || product.mrp);
  const offerPrice = money(activeOfferItem.offerPrice);
  const expiry = offerItemExpiryLabel(activeOfferItem.validUntil);
  return `<div class="price-row product-live-offer-price">${regular && regular !== offerPrice ? `<del>${formatMoneyNumber(regular)}</del>` : ''}<strong>${formatMoneyNumber(offerPrice)}</strong><em>Offer price</em></div>${expiry ? `<div class="product-offer-validity">${escapeHtml(expiry)}</div>` : ''}`;
}
function productOfferNoticeHtml(){
  if(!activeOfferNotice) return '';
  return `<div class="product-offer-expired-notice"><b>${escapeHtml(activeOfferNoticeTitle || 'Offer unavailable')}</b><span>${escapeHtml(activeOfferNotice)}</span></div>`;
}
function scheduleActiveOfferExpiryRefresh(){
  clearTimeout(activeOfferExpiryTimer);
  activeOfferExpiryTimer = null;
  if(!offerItemIsLive(activeOfferItem)) return;
  const expiry = offerItemExpiryTime(activeOfferItem.validUntil);
  if(!expiry) return;
  const delay = expiry - Date.now() + 120;
  if(delay <= 0){
    activeOfferNoticeTitle = 'Offer expired';
    activeOfferNotice = 'This promotion has ended. You can still order this item at its current regular price.';
    activeOfferItem = null;
    renderProductDetail();
    return;
  }
  activeOfferExpiryTimer = setTimeout(() => {
    if(!activeOfferItem) return;
    activeOfferNoticeTitle = 'Offer expired';
    activeOfferNotice = 'This promotion has ended. You can still order this item at its current regular price.';
    activeOfferItem = null;
    renderProductDetail();
  }, Math.min(delay, 2147483000));
}
function scheduleOffersPageExpiryRefresh(items){
  clearTimeout(offersPageExpiryTimer);
  offersPageExpiryTimer = null;
  const future = (items || []).map(item => offerItemExpiryTime(item.validUntil)).filter(time => time > Date.now()).sort((a,b)=>a-b);
  if(!future.length) return;
  const delay = future[0] - Date.now() + 150;
  offersPageExpiryTimer = setTimeout(() => initOffersPage(), Math.min(Math.max(120, delay), 2147483000));
}
async function resolveProductOffer(params, product){
  clearTimeout(activeOfferExpiryTimer);
  activeOfferExpiryTimer = null;
  activeOfferItem = null;
  activeOfferNotice = '';
  activeOfferNoticeTitle = 'Offer unavailable';
  const offerId = cleanText(params && params.get('offer'));
  if(!offerId || !product) return null;
  try{
    const items = await loadOfferItems(false);
    const item = (items || []).find(candidate => cleanText(candidate.id) === offerId) || null;
    if(!item){
      activeOfferNotice = 'This offer is no longer available. The current regular product price applies.';
      return null;
    }
    if(cleanText(item.productId) && cleanText(item.productId) !== cleanText(product.ID)){
      activeOfferNotice = 'This offer does not apply to this product. The current regular product price applies.';
      return null;
    }
    if(offerItemIsExpired(item)){
      activeOfferNoticeTitle = 'Offer expired';
      activeOfferNotice = 'This promotion has ended. You can still order this item at its current regular price.';
      return null;
    }
    if(!offerItemIsLive(item)){
      activeOfferNotice = 'This offer is not available now. The current regular product price applies.';
      return null;
    }
    activeOfferItem = item;
    scheduleActiveOfferExpiryRefresh();
    return item;
  }catch(_error){
    activeOfferNoticeTitle = 'Offer verification unavailable';
    activeOfferNotice = 'The offer could not be verified right now. The regular product price is shown for safety.';
    return null;
  }
}
let offersPageRefreshRunning = false;
async function initOffersPage(){
  if(offersPageRefreshRunning) return;
  offersPageRefreshRunning = true;
  updateCartCount();
  const grid = document.getElementById('offersPageGrid');
  const empty = document.getElementById('offersPageEmpty');
  if(!grid){ offersPageRefreshRunning = false; return; }
  if(!grid.dataset.loaded) grid.innerHTML = skeletonCards(8, 'offer-item-skeleton');
  try{
    const items = await loadOfferItems(true);
    const ordered = (items || []).slice().sort((a,b) => Number(offerItemIsExpired(a)) - Number(offerItemIsExpired(b)));
    grid.innerHTML = ordered.map(offerItemCard).join('');
    grid.dataset.loaded = 'true';
    if(empty) empty.classList.toggle('hidden', ordered.length > 0);
    ordered.slice(0,8).forEach(item => preloadImage(item.image));
    scheduleOffersPageExpiryRefresh(ordered);
    if(!grid.dataset.freshScheduled){
      grid.dataset.freshScheduled='true';
      const refresh=()=>loadOfferItems(true).then(fresh=>{
        const next=(fresh||[]).slice().sort((a,b)=>Number(offerItemIsExpired(a))-Number(offerItemIsExpired(b)));
        if(!isSameData(ordered,next)){ grid.innerHTML=next.map(offerItemCard).join(''); if(empty) empty.classList.toggle('hidden',next.length>0); scheduleOffersPageExpiryRefresh(next); }
      }).catch(()=>{});
      if('requestIdleCallback' in window) requestIdleCallback(refresh,{timeout:1800}); else setTimeout(refresh,700);
    }
  }catch(_error){
    grid.innerHTML = '';
    if(empty){
      empty.classList.remove('hidden');
      empty.innerHTML = '<h2>Offers are unavailable right now</h2><p>Please try again shortly or continue shopping from the catalog.</p><a class="btn primary" href="catalog.html">Browse products</a>';
    }
  }finally{
    offersPageRefreshRunning = false;
  }
  if(typeof subscribeToStoreUpdates === 'function' && !window.__welloneOffersLiveBound){
    window.__welloneOffersLiveBound = true;
    let timer = null;
    subscribeToStoreUpdates(change => {
      const tables = Array.isArray(change && change.tables) ? change.tables.map(cleanText) : [cleanText(change && change.table)].filter(Boolean);
      if(tables.length && !tables.some(table => ['offer_items','products','product_variants'].includes(table))) return;
      clearTimeout(timer);
      timer = setTimeout(() => initOffersPage(), 160);
    });
  }
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
  const staleCategories = typeof readAnyCache === 'function' ? (readAnyCache('categories') || []) : [];
  const staleOffers = typeof readAnyCache === 'function' ? (readAnyCache('offers') || []) : [];
  if(staleCategories.length) renderCategories(staleCategories);
  if(staleOffers.length) renderOffers(staleOffers);
  const [categoryResult, offerResult] = await Promise.allSettled([
    loadCategories(staleCategories.length ? true : false),
    loadOffers(staleOffers.length ? true : false)
  ]);
  const categories = categoryResult.status === 'fulfilled' ? categoryResult.value : staleCategories;
  const offers = offerResult.status === 'fulfilled' ? offerResult.value : staleOffers;
  if(categoryResult.status === 'rejected' && !categories.length && holder){
    holder.classList.remove('skeleton-grid');
    holder.innerHTML = `<div class="empty-card"><h2>Could not load products</h2><p>Check your connection and tap refresh.</p><button class="btn" type="button" onclick="location.reload()">Refresh</button></div>`;
  }else if(!isSameData(renderedCategories,categories)) renderCategories(categories);
  if(offerResult.status === 'fulfilled' && !isSameData(renderedOffers,offers)) renderOffers(offers);
  categories.slice(0,6).forEach(c => preloadImage(c.image));
  offers.slice(0,2).forEach(o => preloadImage(o.image));
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
      forceRefresh: false,
      limit: Math.max(INITIAL_PAGE_LIMIT, catalogState.products.length),
      preserveScrollY: Number(restored.scrollY || 0)
    });
  }else{
    await loadCatalogProducts(true, {forceRefresh:false});
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
    }, 120);
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
  await resolveProductOffer(params, product);
  renderProductDetail();
  bindProductLiveUpdates(categoryName, productId);
}

function bindProductLiveUpdates(categoryName, productId){
  if(window.__welloneProductLiveBound || typeof subscribeToStoreUpdates !== 'function') return;
  window.__welloneProductLiveBound = true;
  subscribeToStoreUpdates(change => {
    const tables = Array.isArray(change && change.tables) ? change.tables.map(cleanText) : [cleanText(change && change.table)].filter(Boolean);
    const relevant = !tables.length || tables.some(table => ['products','product_variants','product_images','categories','subcategories','offer_items'].includes(table));
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
        const offerChanged = tables.includes('offer_items');
        if(isSameData(activeProduct, fresh) && !offerChanged) return;
        const params = new URLSearchParams(location.search);
        activeProduct = fresh;
        applyProductSelectionFromUrl(fresh, params);
        await resolveProductOffer(params, fresh);
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
function sizeVariantForIndex(variant, index = activeSizeIndex){
  const list = Array.isArray(variant && variant.sizeVariants) ? variant.sizeVariants : [];
  return list[index] || list[0] || variant || {};
}
function selectedInventoryVariant(product = activeProduct, variant = selectedProductVariant(product)){
  return isColorVariantMode(product) ? sizeVariantForIndex(variant, activeSizeIndex) : (variant || {});
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
  if(offerItemIsLive(activeOfferItem)) params.set('offer', activeOfferItem.id);
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
  const exactSizes = Array.isArray(variant?.sizeVariants) ? variant.sizeVariants : [];
  const firstAvailableSize = exactSizes.findIndex(item => variantIsAvailable(item, product));
  activeSizeIndex = sizeIndex >= 0 ? sizeIndex : (firstAvailableSize >= 0 ? firstAvailableSize : 0);
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
function updateProductSeo(product = activeProduct, variant = selectedInventoryVariant(product, selectedProductVariant(product)), images = productGalleryImages(product, variant)){
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
function selectedStockQuantity(product, variant = null){
  if(!product || product.TrackInventory !== true) return null;
  if(variant){
    const source = cleanText(variant.inventorySource || '');
    if(source === 'variant' || source === 'synthetic') return Math.max(0, Number(variant.stock || 0) || 0);
    if(source === 'product') return Math.max(0, Number(product.StockQuantity || 0) || 0);
    if(Object.prototype.hasOwnProperty.call(variant, 'stock')) return Math.max(0, Number(variant.stock || 0) || 0);
  }
  return Math.max(0, Number(product.StockQuantity || 0) || 0);
}
function variantIsAvailable(variant, product = activeProduct){
  if(!variant) return true;
  if(cleanText(variant.stockStatus || variant.stock_status || 'in_stock') === 'out_of_stock') return false;
  const stock = selectedStockQuantity(product, variant);
  return stock === null || stock > 0;
}
function variantAvailabilityLabel(product, variant){
  if(!variantIsAvailable(variant, product)) return 'Out of stock';
  const stock = selectedStockQuantity(product, variant);
  if(stock === null) return '';
  return stock <= 5 ? `Only ${stock} left` : `${stock} in stock`;
}
function firstAvailableVariantIndex(product){
  const variants = Array.isArray(product && product.Variants) ? product.Variants : [];
  const index = variants.findIndex(variant => variantIsAvailable(variant, product));
  return index >= 0 ? index : 0;
}
function productIsAvailable(product, variant = null){
  if(!product || cleanText(product.Status || 'active') !== 'active' || cleanText(product.StockStatus || 'in_stock') === 'out_of_stock') return false;
  if(product.TrackInventory === true && Number(product.StockQuantity || 0) <= 0) return false;
  if(variant && !variantIsAvailable(variant, product)) return false;
  const variants = Array.isArray(product.Variants) ? product.Variants : [];
  return !variants.length || variants.some(item => variantIsAvailable(item, product));
}
function productStockNote(product, variant = null){
  if(!productIsAvailable(product, variant)){
    if(product && cleanText(product.StockStatus || 'in_stock') !== 'out_of_stock' && variant && !variantIsAvailable(variant, product)){
      const label = cleanText(variant.color || variant.label || 'Selected option');
      return `<div class="stock-alert">${escapeHtml(label)} is currently out of stock. Please choose another option.</div>`;
    }
    return '<div class="stock-alert">Currently out of stock. Contact the shop to check availability.</div>';
  }
  const stock = selectedStockQuantity(product, variant);
  if(stock === null) return '';
  const label = stock === 1 ? 'Only 1 left in stock.' : stock <= 5 ? `Only ${stock} left in stock.` : `${stock} units in stock.`;
  return `<div class="stock-availability-note">${label}</div>`;
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
  const images = productGalleryImages(activeProduct, selectedInventoryVariant(activeProduct, variant));
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
  const inventoryVariant = selectedInventoryVariant(product, variant);
  if(activeSizeIndex >= sizeOptions.length) activeSizeIndex = 0;
  const images = productGalleryImages(product, inventoryVariant);
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
      ${productOfferNoticeHtml()}
      ${productOfferPriceHtml(product, inventoryVariant)}
      <div class="detail-option-card">
        ${colorMode ? `<div class="option-block"><b>Choose colour</b><div class="color-variant-options">${product.Variants.map((v,i)=>{ const available = variantIsAvailable(v, product); const stockLabel = variantAvailabilityLabel(product, v); return `<button class="color-variant-choice ${i===activeVariantIndex?'active':''} ${available?'':'is-out-stock'}" type="button" onclick="selectColorVariant(${i})" aria-pressed="${i===activeVariantIndex?'true':'false'}" ${available?'':`title="View and share this out-of-stock colour"`}><span>${escapeHtml(v.color || v.label || 'Colour')}</span>${stockLabel?`<small class="variant-stock-label ${available?'is-available':''}">${escapeHtml(stockLabel)}</small>`:''}</button>`; }).join('')}</div></div>` : ''}
        ${hasVariants ? `<div class="option-block"><b>Choose ${escapeHtml(optionTitle)}</b><div class="size-variant-options option-variant-options">${product.Variants.map((v,i)=>{ const available = variantIsAvailable(v, product); const stockLabel = variantAvailabilityLabel(product, v); return `<button class="size-variant-choice ${i===activeVariantIndex?'active':''} ${available?'':'is-out-stock'}" type="button" onclick="selectVariant(${i})" ${available?'':`title="View and share this out-of-stock option"`}><span>${escapeHtml(v.label || 'Standard')}</span>${stockLabel?`<small class="variant-stock-label ${available?'is-available':''}">${escapeHtml(stockLabel)}</small>`:''}</button>`; }).join('')}</div></div>` : ''}
        ${colorMode && hasVisibleSizes(product, variant) ? `<div class="option-block"><b>Choose size</b><div class="size-variant-options">${sizeOptions.map((size,i)=>{ const child=sizeVariantForIndex(variant,i); const available=variantIsAvailable(child,product); const stockLabel=variantAvailabilityLabel(product,child); return `<button class="size-variant-choice ${i===activeSizeIndex?'active':''} ${available?'':'is-out-stock'}" type="button" onclick="selectSizeOption(${i})"><span>${escapeHtml(size)}</span>${stockLabel?`<small class="variant-stock-label ${available?'is-available':''}">${escapeHtml(stockLabel)}</small>`:''}</button>`; }).join('')}</div></div>` : ''}
        ${!colorMode && colors.length ? `<div class="option-block"><b>Choose colour</b><div id="colorOptions" class="color-variant-options">${colors.map((c,i)=>`<button class="color-variant-choice ${i===activeColorIndex?'active':''}" type="button" onclick="activateColorChoice(this,${i})" aria-pressed="${i===activeColorIndex?'true':'false'}"><span>${escapeHtml(c)}</span></button>`).join('')}</div></div>` : ''}
        <div class="option-block"><b>Quantity</b><div class="qty"><button type="button" onclick="changeQty(-1)">−</button><span id="qty">1</span><button type="button" onclick="changeQty(1)">+</button></div></div>
      </div>
      ${terms.length ? `<section class="product-policy-section" aria-label="Product policies"><p class="product-policy-title">Product policies</p><div class="terms-grid compact-terms stylish-terms">${terms.map(term => `<article><span class="term-icon">${policyIconSvg(term.key)}</span><span class="term-copy"><b>${escapeHtml(term.label)}</b><small>${escapeHtml(term.description)}</small></span></article>`).join('')}</div></section>` : ''}
      ${productStockNote(product, inventoryVariant)}
      <button class="btn primary full add-cart-button" ${productIsAvailable(product, inventoryVariant) ? 'onclick="handleAddToCart()"' : 'disabled'}>${productIsAvailable(product, inventoryVariant) ? 'Add to Cart' : 'Out of stock'}</button>
      <div class="detail-mini-actions"><button class="share-product-btn" type="button" onclick="shareProductLink()">Share selected option</button></div>
    </div>`;
  syncProductSelectionUrl(product);
  updateProductSeo(product, inventoryVariant, images);
}
let productImageZoomLevel = 1;
let productImagePinchStartDistance = 0;
let productImagePinchStartZoom = 1;
let productImagePinchStartContentX = 0;
let productImagePinchStartContentY = 0;
let productImagePinchDidZoom = false;
function currentProductGallery(){
  if(!activeProduct) return [];
  return productGalleryImages(activeProduct, selectedInventoryVariant(activeProduct, selectedProductVariant(activeProduct)));
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
  const exactSizes = Array.isArray(variant.sizeVariants) ? variant.sizeVariants : [];
  const firstAvailableSize = exactSizes.findIndex(item => variantIsAvailable(item, activeProduct));
  activeSizeIndex = firstAvailableSize >= 0 ? firstAvailableSize : 0;
  activeImageIndex = 0;
  renderProductDetail();
  if(!variantIsAvailable(variant)) showSoftToast('Out of stock — link can still be shared');
}
function selectSizeOption(index){ activeSizeIndex = index; renderProductDetail(); if(!variantIsAvailable(selectedInventoryVariant(activeProduct, selectedProductVariant(activeProduct)), activeProduct)) showSoftToast('This size is out of stock'); }
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
  if(!qty) return;
  const current = Math.max(1, Number(qty.textContent || 1));
  let next = Math.max(1, current + Number(amount || 0));
  const stock = selectedStockQuantity(activeProduct, selectedInventoryVariant(activeProduct, selectedProductVariant(activeProduct)));
  if(stock !== null && next > stock){
    next = Math.max(1, stock);
    if(Number(amount || 0) > 0) showSoftToast(stock === 1 ? 'Only 1 left in stock' : `Only ${stock} left in stock`);
  }
  qty.textContent = String(next);
}
function handleAddToCart(){
  const product = activeProduct;
  if(!product) return;
  const variantGroup = selectedProductVariant(product);
  const variant = selectedInventoryVariant(product, variantGroup);
  if(!productIsAvailable(product, variant)){ showSoftToast('This selected option is out of stock'); return; }
  const colorMode = isColorVariantMode(product);
  const gallery = productGalleryImages(product, variant);
  const image = firstImage(gallery, product.Image);
  const size = colorMode ? (variant.size || variant.label || selectedSizeText()) : (variant.label || 'Standard');
  const color = colorMode ? (variantGroup.color || variant.color || variantGroup.label || 'Default') : selectedStandaloneColorText(product);
  const regularPrice = money(variant.price || product.Price) || money(variant.mrp || product.MRP);
  const liveOffer = offerItemIsLive(activeOfferItem) ? activeOfferItem : null;
  addCartItem(product, {
    category: product.Category,
    image,
    variant:size,
    variantId: variant.id || '',
    size,
    color,
    qty: document.getElementById('qty')?.textContent || 1,
    price: liveOffer ? money(liveOffer.offerPrice) : (variant.price || product.Price),
    mrp: liveOffer ? regularPrice : (variant.mrp || product.MRP),
    offerId: liveOffer ? liveOffer.id : '',
    offerValidUntil: liveOffer ? liveOffer.validUntil : '',
    offerPrice: liveOffer ? money(liveOffer.offerPrice) : 0,
    offerStatus: liveOffer ? 'live' : '',
    subcategory: product.Subcategory,
    terms: selectedPolicyTerms(product.Terms).map(term => term.label),
    stockStatus: variant.stockStatus || product.StockStatus || 'in_stock',
    trackInventory: product.TrackInventory === true,
    stockQuantity: selectedStockQuantity(product, variant)
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
}
function renderCartItems(){
  if(window.WelloneCart && WelloneCart.renderCartItems && WelloneCart.renderCartItems !== renderCartItems){
    return WelloneCart.renderCartItems();
  }
}
