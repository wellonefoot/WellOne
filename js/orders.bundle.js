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

const CART_KEY = 'wellone_cart_final_v29';
const ORDER_CART_CLEAR_KEY = 'wellone_order_cart_clear_pending';
const ORDER_REFS_KEY = 'wellone_customer_order_refs_v1';
window.WELLONE_ORDER_REFS_KEY = ORDER_REFS_KEY;
const LEGACY_CART_KEYS = [
  'wellone_cart_final_v28','wellone_cart_final_v27','wellone_cart_final_v25','wellone_cart_final_v24','wellone_cart_final_v23','wellone_cart_final_v22','wellone_cart_final_v21','wellone_cart_final_v20','wellone_cart_final_v19','wellone_cart_final_v18','wellone_cart_final_v17','wellone_cart_final_v16','wellone_cart_final_v7','wellone_cart_final_v1','wellone_kids_saved_cart_v3',
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
  const productId=cartText(item?.id).toLowerCase();
  const variantId=cartText(item?.variantId || item?.variant_id).toLowerCase();
  if(variantId) return `variant||${productId}||${variantId}`;
  return [item?.category, productId, item?.name, item?.variant || item?.size, item?.color]
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
function normalizeCartTerms(value){
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
      barcode: cartText(raw.barcode || raw.Barcode || raw.productBarcode || raw.product_barcode || ''),
      name: cartText(raw.name || raw.Name, 'Product'),
      category: cartText(raw.category || raw.Category, ''),
      subcategory: cartText(raw.subcategory || raw.Subcategory, ''),
      optionTitle: cartText(raw.optionTitle || raw.option_title || raw.OptionTitle || 'Size', 'Size'),
      price: cartNumber(raw.price || raw.Price, 0),
      mrp: cartNumber(raw.mrp || raw.MRP, 0),
      image: cartText(raw.image || raw.Image || ''),
      variant,
      size: variant,
      color: cartText(raw.color || raw.Color || raw.option || raw.Option, 'Default'),
      terms: normalizeCartTerms(raw.terms || raw.Terms),
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
    barcode: cartText(selected.barcode || product.Barcode || product.barcode || ''),
    name: cartText(product.Name || product.name, 'Product'),
    category: cartText(selected.category || product.Category || product.category, ''),
    subcategory: cartText(selected.subcategory || product.Subcategory || ''),
    optionTitle: cartText(selected.optionTitle || product.OptionTitle || product.option_title || 'Size', 'Size'),
    price,
    mrp,
    image: cartText(selected.image || product.Image || product.image || ''),
    variant,
    size: variant,
    color: cartText(selected.color, 'Default'),
    terms: normalizeCartTerms(selected.terms || product.Terms),
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
      existing.variantId = item.variantId || existing.variantId;
      existing.barcode = item.barcode || existing.barcode;
      existing.color = item.color || existing.color;
      existing.size = item.size || existing.size;
      existing.variant = item.variant || existing.variant;
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
    existing.variantId = item.variantId || existing.variantId;
    existing.barcode = item.barcode || existing.barcode;
    existing.color = item.color || existing.color;
    existing.size = item.size || existing.size;
    existing.variant = item.variant || existing.variant;
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
function clearSubmittedOrderCart(confirmedItems = []){
  // Remove only the exact lines submitted with this order. This avoids a stale
  // "clear pending" flag deleting items the customer adds after checkout.
  const submitted = normalizeCart(confirmedItems);
  const removeQty = new Map(submitted.map(item => [cartItemKey(item), Math.max(1, cartNumber(item.qty, 1))]));
  const next = [];
  getCart().forEach(item => {
    const key = cartItemKey(item);
    const remaining = Math.max(0, Math.floor(cartNumber(item.qty, 1)) - (removeQty.get(key) || 0));
    if(remaining > 0) next.push({...item, qty:remaining});
  });
  localStorage.removeItem(ORDER_CART_CLEAR_KEY);
  saveCart(next);
}
function finishPendingOrderCartClear(){
  // Older builds could leave this marker behind and later empty a newly-created cart.
  // Clearing the marker without touching cart contents safely repairs that state.
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
    item.variant && item.variant !== 'Standard' ? `<span>${cartEscape(item.optionTitle || (item.color && item.color !== 'Default' ? 'Size' : 'Option'))} <b>${cartEscape(item.variant)}</b></span>` : '',
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
  const context=cartCheckoutSource(source);
  if(context==='drawer'){
    const slot=document.getElementById('cartDrawerNotice');
    if(slot){ slot.textContent=''; slot.className='cart-drawer-notice-slot'; }
    return;
  }
  const target = cartNoticeTarget(source);
  target?.parentElement?.querySelectorAll('.cart-notice').forEach(x => x.remove());
}
function showCartNotice(text, type = 'warn', source = 'auto'){
  const context=cartCheckoutSource(source);
  if(context==='drawer'){
    ensureCartDrawer();
    const slot=document.getElementById('cartDrawerNotice');
    if(slot){ slot.textContent=text; slot.className=`cart-drawer-notice-slot cart-notice ${type}`; }
    return;
  }
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
    const {data, error} = await client.from('products').select('id,name,mrp,price,barcode,status,stock_status,stock_quantity,track_inventory,main_image_url,sizes,colors,option_title,product_variants(id,label,unit,color,size,mrp,price,image_url,image_urls,stock,stock_status,sort_order)').eq('id', item.id).maybeSingle();
    if(error) throw error;
    if(!data) return null;
    return {ID:data.id, Name:data.name, MRP:data.mrp, Price:data.price, Barcode:cartText(data.barcode || ''), Status:data.status, StockStatus:data.stock_status, TrackInventory:data.track_inventory === true, StockQuantity:Math.max(0, cartNumber(data.stock_quantity, 0)), Image:data.main_image_url, Sizes:data.sizes, Colors:data.colors, VariantMode:(data.product_variants||[]).some(v=>cartText(v.color || v.unit))?'color':'option', Variants:(data.product_variants||[]).filter(v=>cartText(v.stock_status || 'in_stock')!=='hidden').map(v=>({id:cartText(v.id), label:cartText(v.size || v.label || 'Standard'), color:cartText(v.color || v.unit || ''), size:cartText(v.size || v.label || 'Standard'), sizeOptions:cartText(v.size || v.label).split(/[|,\n]+/).map(x=>x.trim()).filter(Boolean), price:v.price || data.price, mrp:v.mrp || data.mrp, images:(v.image_urls&&v.image_urls.length?v.image_urls:[v.image_url].filter(Boolean)), stock:Math.max(0, cartNumber(v.stock, 0)), stockStatus:cartText(v.stock_status || 'in_stock'), inventorySource:'variant'}))};
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
    const rootColor=cartText(root?.color || root?.unit || '');
    if(Array.isArray(root?.sizeVariants) && root.sizeVariants.length){
      root.sizeVariants.forEach(child=>exact.push({...child,color:cartText(child.color || rootColor)}));
      return;
    }
    const options=Array.isArray(root?.sizeOptions) ? root.sizeOptions.map(x=>cartText(x)).filter(Boolean) : [];
    if(options.length>1){
      options.forEach(size=>exact.push({...root,color:rootColor,size,label:size,sizeOptions:[size]}));
      return;
    }
    exact.push({...root,color:rootColor});
  });
  return exact;
}
function cartIsDefaultValue(value, fallback){
  const v=cartText(value || fallback).toLowerCase();
  return !v || v===String(fallback||'').toLowerCase();
}
function cartExactVariantMatch(live,item){
  const variants=cartInventoryVariants(live);
  if(!variants.length) return null;
  const wantedId=cartText(item?.variantId || item?.variant_id);
  const wantedColor=cartText(item?.color || 'Default');
  const wantedSize=cartText(item?.size || item?.variant || 'Standard');
  const colorRelevant=!cartIsDefaultValue(wantedColor,'Default');
  const sizeRelevant=!cartIsDefaultValue(wantedSize,'Standard');
  if(wantedId){
    const byId=variants.find(v=>cartText(v.id)===wantedId);
    if(byId){
      const colorOk=!colorRelevant || cartText(byId.color || byId.unit || '').toLowerCase()===wantedColor.toLowerCase();
      const sizeOk=!sizeRelevant || cartText(byId.size || byId.label || 'Standard').toLowerCase()===wantedSize.toLowerCase();
      if(colorOk && sizeOk) return byId;
    }
  }
  const candidates=variants.filter(v=>{
    const vc=cartText(v.color || v.unit || '').toLowerCase();
    const vs=cartText(v.size || v.label || 'Standard').toLowerCase();
    return (!colorRelevant || vc===wantedColor.toLowerCase()) && (!sizeRelevant || vs===wantedSize.toLowerCase());
  });
  if(colorRelevant && sizeRelevant) return candidates[0] || null;
  // If a dimension is missing, only auto-resolve when there is exactly one possible exact record.
  return candidates.length===1 ? candidates[0] : null;
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
      }else{
        const variants = cartInventoryVariants(live);
        const hasExactVariants = variants.length > 0;
        if(!hasExactVariants && (cartText(live.StockStatus || 'in_stock') === 'out_of_stock' || (live.TrackInventory === true && cartNumber(live.StockQuantity, 0) <= 0))){
          status = 'out_of_stock';
          message = `${item.name} is out of stock now. Contact ${shopPhonePretty()} for latest availability.`;
        }
        if(status !== 'ok'){
          // For simple products the parent stock row is authoritative. For option products,
          // exact variant stock below is authoritative so stale parent totals cannot block checkout.
        }else{
        const colorMode = live.VariantMode === 'color' || variants.some(v => cartText(v.color));
        const wantedSize = cartText(item.size || item.variant || 'Standard');
        const wantedColor = cartText(item.color || 'Default');
        matched = cartExactVariantMatch(live,item);
        if(!matched && variants.length){
          const wantedColorIsDefault=wantedColor.toLowerCase()==='default';
          const wantedSizeIsDefault=wantedSize.toLowerCase()==='standard';
          const sameColor=colorMode && !wantedColorIsDefault ? variants.filter(v=>cartText(v.color || v.unit || '').toLowerCase()===wantedColor.toLowerCase()) : [];
          const sameSize=!wantedSizeIsDefault ? variants.filter(v=>cartText(v.size || v.label || 'Standard').toLowerCase()===wantedSize.toLowerCase()) : [];
          status='removed';
          if(colorMode && !wantedColorIsDefault && !sameColor.length) message=`${item.name} colour ${wantedColor} is no longer available. Please select another colour.`;
          else if(!wantedSizeIsDefault && !sameSize.length) message=`${item.name} ${wantedSize} is no longer available. Please select another ${cartText(live.OptionTitle || 'option').toLowerCase()}.`;
          else message=`${item.name} needs an exact ${colorMode?'colour and ':''}${cartText(live.OptionTitle || 'option').toLowerCase()} selection. Please open the product and select it again.`;
        }
        if(status === 'ok' && matched){
          const exactId=cartText(matched.id || item.variantId);
          const exactColor=cartText(matched.color || matched.unit || wantedColor || 'Default','Default');
          const exactSize=cartText(matched.size || matched.label || wantedSize || 'Standard','Standard');
          if(exactId && cartText(item.variantId)!==exactId){ item.variantId=exactId; changed=true; }
          if(exactColor && cartText(item.color || 'Default').toLowerCase()!==exactColor.toLowerCase()){ item.color=exactColor; changed=true; }
          if(exactSize && cartText(item.size || item.variant || 'Standard').toLowerCase()!==exactSize.toLowerCase()){ item.size=exactSize; item.variant=exactSize; changed=true; }
          const liveBarcode=cartText(live.Barcode || live.barcode || item.barcode || '');
          if(liveBarcode && cartText(item.barcode)!==liveBarcode){ item.barcode=liveBarcode; changed=true; }
        }
        if(status === 'ok' && variants.length && !matched){
          status='removed';
          message=`${item.name} selected option is no longer available. Please select it again.`;
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
  return cart.map(item => {
    const color=cartText(item.color || 'Default');
    const size=cartText(item.size || item.variant || 'Standard');
    return {
      product_id:cartText(item.id),
      variant_id:cartText(item.variantId || ''),
      selected_variant_id:cartText(item.variantId || ''),
      color:color.toLowerCase()==='default'?'':color,
      selected_color:color.toLowerCase()==='default'?'':color,
      size:size.toLowerCase()==='standard'?'':size,
      selected_option:size.toLowerCase()==='standard'?'':size,
      variant:size.toLowerCase()==='standard'?'':size,
      product_barcode:cartText(item.barcode || ''),
      quantity:Math.max(1,Math.floor(cartNumber(item.qty,1))),
      offer_id:cartText(item.offerId || '')
    };
  });
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
  // Availability refresh may repair an older cart line with its exact variant id.
  // Reload the repaired cart before calling the order RPC instead of sending the stale pre-check array.
  const orderCart=getCart();
  try{
    const client = typeof supabaseClient === 'function' ? supabaseClient() : (window.__welloneSupabase || window.supabase.createClient(SITE_CONFIG.supabaseUrl,SITE_CONFIG.supabaseAnonKey));
    const {data,error}=await client.rpc('create_customer_order',{
      p_customer_name:customerName,
      p_customer_phone:customerPhone,
      p_customer_address:customerAddress,
      p_payment_method:paymentMethod,
      p_items:orderPayloadItems(orderCart)
    });
    if(error) throw error;
    if(!data?.order_id || !data?.tracking_token) throw new Error('Order confirmation did not return a tracking reference.');
    saveOrderRef(data);
    clearSubmittedOrderCart(orderCart);
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
    <div id="cartDrawerNotice" class="cart-drawer-notice-slot" aria-live="polite"></div>
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
function cacheKey(name){ return 'wellone_supabase_v97_' + name; }
function now(){ return Date.now(); }
function readAnyCache(name){ try{ const raw = localStorage.getItem(cacheKey(name)); if(!raw) return null; const pack = JSON.parse(raw); return pack && pack.data ? pack.data : null; }catch(e){ return null; } }
function readFastCache(name){ try{ const raw = localStorage.getItem(cacheKey(name)); if(!raw) return null; const pack = JSON.parse(raw); if(!pack || !pack.time || now() - pack.time > FAST_CACHE_MS) return null; return pack.data || null; }catch(e){ return null; } }
function pruneWelloneCache(maxEntries = 42){
  try{
    const prefix = 'wellone_supabase_v97_';
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
    const currentPrefix = 'wellone_supabase_v97_';
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
      const colourGallerySource = group.sizeVariants[0] && group.sizeVariants[0].hasOwnImages && Array.isArray(group.sizeVariants[0].images) && group.sizeVariants[0].images.length ? group.sizeVariants[0] : null;
      group.images = colourGallerySource ? colourGallerySource.images : product.Images;
      group.hasOwnImages = Boolean(colourGallerySource);
      group.sizeVariants.forEach(child => {
        if(!child.hasOwnImages) child.images = group.images;
      });
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
    const prefix = 'wellone_supabase_v97_';
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

/* bundled from orders.js */
'use strict';

const ORDER_PAGE_REFS_KEY = window.WELLONE_ORDER_REFS_KEY || 'wellone_customer_order_refs_v1';
const ORDER_PAGE_CACHE_KEY = 'wellone_customer_orders_cache_v88';
let customerOrdersCache = [];
let ordersRefreshTimer = null;

function orderText(value, fallback=''){ return String(value ?? fallback).trim(); }
function orderEsc(value){ return String(value ?? '').replace(/[&<>'"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch])); }
function orderMoney(value){ const n=Number(value||0); return `₹${Number.isFinite(n)?n.toLocaleString('en-IN'):0}`; }
function orderDate(value){ try{return new Date(value).toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'short'});}catch(_e){return orderText(value);} }
function orderRefs(){ try{const rows=JSON.parse(localStorage.getItem(ORDER_PAGE_REFS_KEY)||'[]'); return Array.isArray(rows)?rows:[];}catch(_e){return [];} }

function readOrdersCache(){ try{const pack=JSON.parse(localStorage.getItem(ORDER_PAGE_CACHE_KEY)||'null');return pack&&Array.isArray(pack.orders)?pack.orders:[];}catch(_e){return [];} }
function writeOrdersCache(orders){ try{localStorage.setItem(ORDER_PAGE_CACHE_KEY,JSON.stringify({time:Date.now(),orders:(orders||[]).slice(0,100)}));}catch(_e){} }
function orderClient(){
  if(typeof supabaseClient==='function') return supabaseClient();
  if(window.__welloneSupabase) return window.__welloneSupabase;
  if(!window.supabase || !window.SITE_CONFIG) throw new Error('Store connection is not ready.');
  window.__welloneSupabase=window.supabase.createClient(SITE_CONFIG.supabaseUrl,SITE_CONFIG.supabaseAnonKey,{auth:{persistSession:false}});
  return window.__welloneSupabase;
}
function orderStatusMeta(status){
  const s=orderText(status,'placed');
  const map={
    placed:['Order placed','placed'],
    confirmed:['Order confirmed','confirmed'],
    packed:['Packed','packed'],
    out_for_delivery:['Out for delivery','delivery'],
    delivered:['Delivered','delivered'],
    cancelled:['Cancelled','cancelled']
  };
  return map[s]||[s.replaceAll('_',' '),'placed'];
}
function paymentLabel(method,status){
  const m=method==='online'?'Online payment':'Cash on delivery';
  const p=orderText(status,'pending');
  if(method==='cod') return m;
  return `${m} · ${p[0].toUpperCase()+p.slice(1)}`;
}
async function fetchCustomerOrder(ref){
  const {data,error}=await orderClient().rpc('get_customer_order',{p_order_id:ref.id,p_tracking_token:ref.token});
  if(error) throw error;
  return data ? {...data,__ref:ref} : null;
}
async function loadCustomerOrders(showLoader=true){
  const holder=document.getElementById('ordersList');
  const refs=orderRefs();
  const cachedOrders=readOrdersCache().filter(order=>refs.some(ref=>orderText(ref.id)===orderText(order.id)));
  if(holder && cachedOrders.length){ customerOrdersCache=cachedOrders; renderCustomerOrders(holder,cachedOrders,false); }
  else if(showLoader && holder) holder.innerHTML='<div class="orders-loading">Loading your orders…</div>';
  if(!refs.length){
    customerOrdersCache=[];
    if(holder) holder.innerHTML='<div class="orders-empty"><h2>No orders yet</h2><p>Your placed orders will appear here.</p><a class="btn primary" href="catalog.html">Shop products</a></div>';
    return [];
  }
  const settled=await Promise.all(refs.map(async ref=>{try{return await fetchCustomerOrder(ref);}catch(error){return {__error:error,__ref:ref};}}));
  customerOrdersCache=settled.filter(row=>row && !row.__error);
  writeOrdersCache(customerOrdersCache);
  if(holder) renderCustomerOrders(holder,customerOrdersCache,settled.some(row=>row?.__error));
  return customerOrdersCache;
}
function orderItemsHtml(order){
  const items=Array.isArray(order.items)?order.items:[];
  return items.map(item=>`<article class="order-item-line">
    <img loading="lazy" decoding="async" src="${orderEsc(typeof optimizeImageUrl==='function'?optimizeImageUrl(item.image_url || SITE_CONFIG.defaultCategoryImage,220):(item.image_url || SITE_CONFIG.defaultCategoryImage))}" alt="${orderEsc(item.product_name)}">
    <div><b>${orderEsc(item.product_name)}</b><small>${[item.color&&item.color!=='Default'?`Colour: ${item.color}`:'',item.size&&item.size!=='Standard'?`${orderText(item.option_name,'Size / option')}: ${item.size}`:'',item.product_barcode?`Barcode: ${item.product_barcode}`:''].filter(Boolean).join(' · ') || 'Standard item'}</small><small>Qty ${Number(item.quantity||1)} × ${orderMoney(item.unit_price)}</small></div>
    <strong>${orderMoney(item.line_total)}</strong>
  </article>`).join('');
}
function orderTimelineHtml(order){
  const history=Array.isArray(order.history)?order.history:[];
  return history.map((entry,index)=>{const meta=orderStatusMeta(entry.status);return `<div class="order-timeline-row"><span class="timeline-dot ${meta[1]}"></span><div><b>${orderEsc(meta[0])}</b>${entry.note?`<small>${orderEsc(entry.note)}</small>`:''}<small>${orderEsc(orderDate(entry.created_at))}</small></div></div>`;}).join('');
}
function orderCardHtml(order){
  const [statusLabel,statusClass]=orderStatusMeta(order.status);
  const canCancel=!['delivered','cancelled'].includes(order.status);
  return `<article class="order-card" data-order-id="${orderEsc(order.id)}">
    <div class="order-card-head">
      <div><span class="order-status ${statusClass}">${orderEsc(statusLabel)}</span><h2>${orderEsc(order.order_number)}</h2><small>${orderEsc(orderDate(order.created_at))}</small></div>
      <div class="order-menu-wrap"><button class="order-menu-button" type="button" data-order-menu="${orderEsc(order.id)}" aria-label="Order options">⋮</button><div class="order-menu" id="orderMenu-${orderEsc(order.id)}"><button type="button" data-order-help="${orderEsc(order.id)}">Help</button>${canCancel?`<button class="danger" type="button" data-order-cancel="${orderEsc(order.id)}">Cancel order</button>`:''}</div></div>
    </div>
    <div class="order-summary-grid"><span><small>Total</small><b>${orderMoney(order.total)}</b></span><span><small>Payment</small><b>${orderEsc(paymentLabel(order.payment_method,order.payment_status))}</b></span><span><small>Items</small><b>${(order.items||[]).reduce((sum,item)=>sum+Number(item.quantity||1),0)}</b></span></div>
    ${order.status==='cancelled'&&order.cancellation_reason?`<div class="order-cancel-note"><b>Cancellation reason</b><span>${orderEsc(order.cancellation_reason)}</span></div>`:''}
    <button class="order-detail-toggle" type="button" data-order-toggle="${orderEsc(order.id)}">View order details</button>
    <div class="order-details" id="orderDetails-${orderEsc(order.id)}">
      <div class="order-address"><b>Delivery details</b><span>${orderEsc(order.customer_name)} · ${orderEsc(order.customer_phone)}</span><p>${orderEsc(order.customer_address)}</p></div>
      <div class="order-items-list">${orderItemsHtml(order)}</div>
      <div class="order-timeline"><h3>Order history</h3>${orderTimelineHtml(order)}</div>
    </div>
  </article>`;
}
function renderCustomerOrders(holder,orders,hadError=false){
  holder.innerHTML=(hadError?'<div class="orders-sync-note">Some orders could not refresh. Check your connection and try again.</div>':'') + (orders.length?orders.map(orderCardHtml).join(''):'<div class="orders-empty"><h2>No available orders</h2><p>Orders placed from this device will appear here.</p></div>');
}
function closeOrderMenus(){ document.querySelectorAll('.order-menu.open').forEach(menu=>menu.classList.remove('open')); }
function selectedCachedOrder(id){return customerOrdersCache.find(order=>orderText(order.id)===orderText(id));}
function openHelpModal(orderId){
  const order=selectedCachedOrder(orderId); if(!order)return;
  document.getElementById('orderSupportModal')?.remove();
  document.body.insertAdjacentHTML('beforeend',`<div id="orderSupportModal" class="order-modal" role="dialog" aria-modal="true" onclick="if(event.target===this)this.remove()"><div class="order-modal-card"><div class="order-modal-head"><div><p class="tag">order help</p><h2>${orderEsc(order.order_number)}</h2></div><button type="button" onclick="document.getElementById('orderSupportModal').remove()">×</button></div><div class="help-question-list"><button type="button" data-help-answer="tracking">Where is my order?</button><button type="button" data-help-answer="payment">I have a payment question</button><button type="button" data-help-answer="delivery">I need help with delivery details</button><button type="button" data-help-answer="item">I have an item problem</button></div><div id="helpAnswer" class="help-answer">Choose a question above.</div><a class="btn light full" href="tel:+${orderEsc(SITE_CONFIG.whatsappNumber)}">Call shop support</a></div></div>`);
}
function helpAnswer(kind){
  const box=document.getElementById('helpAnswer'); if(!box)return;
  const answers={tracking:'Your latest order status is shown in the order history above. The shop updates it when the order is packed, sent for delivery, or delivered.',payment:'For online-payment or payment-status questions, contact Wellone support and keep your order number ready.',delivery:'Contact Wellone support if the delivery address or phone number needs attention after confirmation.',item:'For damaged, wrong, missing, or availability-related item questions, contact Wellone support with your order number.'};
  box.textContent=answers[kind]||'Contact Wellone support for help with this order.';
}
function openCancelModal(orderId){
  const order=selectedCachedOrder(orderId); if(!order)return;
  document.getElementById('orderCancelModal')?.remove();
  document.body.insertAdjacentHTML('beforeend',`<div id="orderCancelModal" class="order-modal" role="dialog" aria-modal="true" onclick="if(event.target===this)this.remove()"><form class="order-modal-card" onsubmit="submitCustomerCancellation(event,'${orderEsc(order.id)}')"><div class="order-modal-head"><div><p class="tag">cancel order</p><h2>${orderEsc(order.order_number)}</h2></div><button type="button" onclick="document.getElementById('orderCancelModal').remove()">×</button></div><label>Reason for cancellation<textarea id="cancelReason" rows="4" placeholder="Tell us why you want to cancel" required></textarea></label><p class="cancel-warning">If the order can still be cancelled, reserved stock will be returned automatically and this order will remain in your history as Cancelled.</p><button class="btn danger full" type="submit">Cancel Order</button></form></div>`);
}
async function submitCustomerCancellation(event,orderId){
  event.preventDefault();
  const order=selectedCachedOrder(orderId); if(!order)return;
  const reason=orderText(document.getElementById('cancelReason')?.value);
  if(!reason){ if(typeof showSoftToast==='function')showSoftToast('Enter cancellation reason'); return; }
  const button=event.submitter; if(button){button.disabled=true;button.textContent='Cancelling…';}
  try{
    const {error}=await orderClient().rpc('cancel_customer_order',{p_order_id:order.id,p_tracking_token:order.__ref.token,p_reason:reason});
    if(error)throw error;
    document.getElementById('orderCancelModal')?.remove();
    if(typeof broadcastCustomerStockChange==='function') await broadcastCustomerStockChange('customer-order-cancelled');
    await loadCustomerOrders(false);
    if(typeof showSoftToast==='function')showSoftToast('Order cancelled');
  }catch(error){ if(typeof showSoftToast==='function')showSoftToast(orderText(error.message,'Could not cancel order')); if(button){button.disabled=false;button.textContent='Cancel Order';} }
}
function bindOrdersPage(){
  document.addEventListener('click',event=>{
    const toggle=event.target.closest('[data-order-toggle]'); if(toggle){document.getElementById(`orderDetails-${toggle.dataset.orderToggle}`)?.classList.toggle('open');return;}
    const menuButton=event.target.closest('[data-order-menu]'); if(menuButton){const menu=document.getElementById(`orderMenu-${menuButton.dataset.orderMenu}`);const open=!menu?.classList.contains('open');closeOrderMenus();if(open)menu?.classList.add('open');event.stopPropagation();return;}
    const help=event.target.closest('[data-order-help]'); if(help){closeOrderMenus();openHelpModal(help.dataset.orderHelp);return;}
    const cancel=event.target.closest('[data-order-cancel]'); if(cancel){closeOrderMenus();openCancelModal(cancel.dataset.orderCancel);return;}
    const answer=event.target.closest('[data-help-answer]'); if(answer){helpAnswer(answer.dataset.helpAnswer);return;}
    if(!event.target.closest('.order-menu-wrap'))closeOrderMenus();
  });
}
async function initOrdersPage(){
  bindOrdersPage();
  if(typeof subscribeToStoreUpdates==='function' && !window.__welloneOrdersLiveBound){
    window.__welloneOrdersLiveBound=true;
    subscribeToStoreUpdates(change=>{
      const tables=Array.isArray(change?.tables)?change.tables:[];
      if(!tables.includes('orders'))return;
      clearTimeout(window.__welloneOrdersLiveTimer);
      window.__welloneOrdersLiveTimer=setTimeout(()=>loadCustomerOrders(false).catch(()=>{}),120);
    });
  }
  await loadCustomerOrders(true);
  const targetId=new URLSearchParams(location.search).get('order');
  if(targetId){
    const details=document.getElementById(`orderDetails-${targetId}`);
    const card=Array.from(document.querySelectorAll('[data-order-id]')).find(el=>el.dataset.orderId===targetId);
    details?.classList.add('open');
    card?.scrollIntoView({behavior:'smooth',block:'center'});
  }
  clearInterval(ordersRefreshTimer);
  ordersRefreshTimer=setInterval(()=>{if(!document.hidden)loadCustomerOrders(false).catch(()=>{});},60000);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)loadCustomerOrders(false).catch(()=>{});});
}
async function initOrderConfirmationPage(){
  const id=new URLSearchParams(location.search).get('id')||'';
  const ref=orderRefs().find(item=>orderText(item.id)===orderText(id));
  const number=document.getElementById('confirmedOrderNumber');
  const total=document.getElementById('confirmedOrderTotal');
  const payment=document.getElementById('confirmedOrderPayment');
  const button=document.getElementById('goToOrderButton');
  if(button)button.href=`orders.html${id?'?order='+encodeURIComponent(id):''}`;
  if(!ref){ if(number)number.textContent='Order placed'; return; }
  try{
    const order=await fetchCustomerOrder(ref);
    if(number)number.textContent=order?.order_number||ref.number||'Order placed';
    if(total)total.textContent=orderMoney(order?.total||0);
    if(payment)payment.textContent=paymentLabel(order?.payment_method,order?.payment_status);
  }catch(_error){ if(number)number.textContent=ref.number||'Order placed'; }
}

window.initOrdersPage=initOrdersPage;
window.initOrderConfirmationPage=initOrderConfirmationPage;
window.submitCustomerCancellation=submitCustomerCancellation;
