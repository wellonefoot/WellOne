'use strict';

const CART_KEY = 'wellone_cart_final_v27';
const LEGACY_CART_KEYS = [
  'wellone_cart_final_v25','wellone_cart_final_v24','wellone_cart_final_v23','wellone_cart_final_v22','wellone_cart_final_v21','wellone_cart_final_v20','wellone_cart_final_v19','wellone_cart_final_v18','wellone_cart_final_v17','wellone_cart_final_v16','wellone_cart_final_v7','wellone_cart_final_v1','wellone_kids_saved_cart_v3',
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
  const item = {
    id: cartText(product.ID || product.Id || product.id || product.Name || product.name, 'item'),
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
    qty: Math.max(1, Math.floor(cartNumber(selected.qty, 1)))
  };
  const cart = getCart();
  const key = cartItemKey(item);
  const existing = cart.find(x => cartItemKey(x) === key);
  if(existing){
    existing.qty += item.qty;
    if(item.image) existing.image = item.image;
    existing.price = item.price;
    existing.mrp = item.mrp;
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
  item.qty = Math.max(1, Math.floor(cartNumber(item.qty, 1) + amount));
  saveCart(cart);
}
function clearCart(){
  localStorage.setItem(CART_KEY, '[]');
  updateCartCount([]);
  if(typeof renderCartItems === 'function') renderCartItems();
  showSoftToast('Cart cleared');
}
function cartItemHtml(item, index){
  const key = cartItemKey(item);
  const safeKey = cartSafeJs(key);
  const qty = Math.max(1, cartNumber(item.qty, 1));
  const lineTotal = cartNumber(item.price, 0) * qty;
  const saving = item.mrp && item.price && item.mrp > item.price ? (item.mrp - item.price) * qty : 0;
  const availabilityStatus = cartText(item.availabilityStatus || 'ok').toLowerCase();
  const hasAvailabilityIssue = availabilityStatus && availabilityStatus !== 'ok';
  const availabilityTitle = availabilityStatus === 'removed' ? 'Removed from shop' : availabilityStatus === 'out_of_stock' ? 'Out of stock' : 'Need availability check';
  const availabilityMessage = cartText(item.availabilityMessage || `${availabilityTitle}. Contact ${shopPhonePretty()} for support and latest availability.`);
  const meta = [
    item.variant && item.variant !== 'Standard' ? `<span>${item.color && item.color !== 'Default' ? 'Size' : 'Option'} <b>${cartEscape(item.variant)}</b></span>` : '',
    item.color && item.color !== 'Default' ? `<span>Color <b>${cartEscape(item.color)}</b></span>` : '',
    item.subcategory ? `<span>${cartEscape(item.subcategory)}</span>` : ''
  ].filter(Boolean).join('');
  return `<article class="premium-cart-item ${hasAvailabilityIssue ? 'cart-item-issue' : ''}">
    <div class="premium-cart-img shimmer"><img loading="lazy" decoding="async" src="${cartImage(item.image, 420)}" onload="this.parentElement.classList.remove('shimmer')" onerror="this.src=SITE_CONFIG.defaultCategoryImage" alt="${cartEscape(item.name)}"></div>
    <div class="premium-cart-info">
      <div class="premium-cart-top"><h3>${index+1}. ${cartEscape(item.name)}</h3><button class="cart-remove-x" type="button" onclick="removeCartItem('${safeKey}')" aria-label="Remove ${cartEscape(item.name)}">×</button></div>
      <p class="premium-cart-cat">${cartEscape(item.category || 'Product')}${item.subcategory ? ' • ' + cartEscape(item.subcategory) : ''}</p>
      ${meta ? `<div class="premium-cart-meta">${meta}</div>` : ''}
      <div class="premium-cart-price"><strong>${cartPriceText(lineTotal)}</strong>${item.mrp && item.mrp > item.price ? `<del>${cartPriceText(item.mrp * qty)}</del>` : ''}${saving ? `<em>Save ${cartPriceText(saving)}</em>` : ''}</div>
      ${hasAvailabilityIssue ? `<div class="cart-item-warning"><b>${cartEscape(availabilityTitle)}</b><span>${cartEscape(availabilityMessage)}</span><a href="${shopPhoneHref()}">Contact ${cartEscape(shopPhonePretty())}</a></div>` : ''}
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
  return !!product && cartText(product.Status || 'active') === 'active' && cartText(product.StockStatus || 'in_stock') !== 'out_of_stock';
}
async function getLiveCartProduct(item){
  if(typeof findProduct === 'function'){
    return await findProduct(item.category, item.id, {forceRefresh:true});
  }
  if(window.supabase && window.SITE_CONFIG){
    const client = window.__welloneSupabase || window.supabase.createClient(SITE_CONFIG.supabaseUrl, SITE_CONFIG.supabaseAnonKey);
    window.__welloneSupabase = client;
    const {data, error} = await client.from('products').select('id,name,mrp,price,status,stock_status,main_image_url,sizes,colors,option_title,product_variants(label,unit,mrp,price,image_url,image_urls,stock,stock_status,sort_order)').eq('id', item.id).maybeSingle();
    if(error) throw error;
    if(!data) return null;
    return {ID:data.id, Name:data.name, MRP:data.mrp, Price:data.price, Status:data.status, StockStatus:data.stock_status, Image:data.main_image_url, Sizes:data.sizes, Colors:data.colors, VariantMode:(data.product_variants||[]).some(v=>cartText(v.unit))?'color':'option', Variants:(data.product_variants||[]).map(v=>({label:v.unit || v.label || 'Standard', color:v.unit || '', sizeOptions:cartText(v.label).split(/[|,\n]+/).map(x=>x.trim()).filter(Boolean), price:v.price || data.price, mrp:v.mrp || data.mrp, images:(v.image_urls&&v.image_urls.length?v.image_urls:[v.image_url].filter(Boolean)), stock:v.stock, stockStatus:cartText(v.stock_status || 'in_stock')}))};
  }
  return null;
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
      }else if(cartText(live.StockStatus || 'in_stock') === 'out_of_stock'){
        status = 'out_of_stock';
        message = `${item.name} is out of stock now. Contact ${shopPhonePretty()} for latest availability.`;
      }else{
        const variants = Array.isArray(live.Variants) ? live.Variants : [];
        const colorMode = live.VariantMode === 'color' || variants.some(v => cartText(v.color));
        const wantedSize = cartText(item.size || item.variant || 'Standard');
        const wantedColor = cartText(item.color || 'Default');
        if(colorMode){
          matched = variants.find(v => cartText(v.color || v.label).toLowerCase() === wantedColor.toLowerCase()) || null;
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
        if(status === 'ok' && matched && cartText(matched.stockStatus || matched.stock_status || 'in_stock') === 'out_of_stock'){
          status = 'out_of_stock';
          const selectedLabel = colorMode && wantedColor.toLowerCase() !== 'default' ? `colour ${wantedColor}` : `option ${wantedSize}`;
          message = `${item.name} ${selectedLabel} is out of stock now. Contact ${shopPhonePretty()} for latest availability.`;
        }
      }

      if(status !== 'ok'){
        if(oldStatus !== status || oldMessage !== message){
          item.availabilityStatus = status;
          item.availabilityMessage = message;
          changed = true;
        }
        unavailable.push({name:item.name, reason:status === 'removed' ? 'removed' : 'out of stock', message});
        continue;
      }

      if(oldStatus !== 'ok' || oldMessage){
        item.availabilityStatus = 'ok';
        item.availabilityMessage = '';
        changed = true;
      }

      const variants = Array.isArray(live.Variants) ? live.Variants : [];
      matched = matched || (live.VariantMode === 'color' ? variants.find(v => cartText(v.color || v.label).toLowerCase() === cartText(item.color || 'Default').toLowerCase()) : variants.find(v => cartText(v.label || 'Standard').toLowerCase() === cartText(item.variant || 'Standard').toLowerCase())) || variants[0] || live;
      const newPrice = cartNumber(matched.price || live.Price, item.price);
      const newMrp = cartNumber(matched.mrp || live.MRP, item.mrp);
      if(newPrice && newPrice !== item.price){ item.price = newPrice; changed = true; }
      if(newMrp !== item.mrp){ item.mrp = newMrp; changed = true; }
      const newImage = cartText((matched.images && matched.images[0]) || live.Image || item.image);
      if(newImage && newImage !== item.image){ item.image = newImage; changed = true; }
      item.stockStatus = cartText(matched.stockStatus || matched.stock_status || live.StockStatus || 'in_stock');
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
  try{
    const base = location.origin && !location.href.startsWith('file:') ? location.origin + location.pathname.replace(/[^/]*$/, '') : location.href.replace(/[^/]*$/, '');
    return new URL(`product.html?cat=${encodeURIComponent(item.category || '')}&id=${encodeURIComponent(item.id || '')}`, base).href;
  }catch(e){ return ''; }
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

function orderMessage(customerName, customerPhone, customerAddress){
  const cart = getCart();
  let total = 0;
  const ref = orderRef();
  let message = `*${SITE_CONFIG.shopName} Order Request*\n`;
  message += `Order ID: ${ref}\n`;
  message += `Shop Support: ${shopPhonePretty()}\n\n`;
  message += `*Customer Details*\nName: ${customerName}\nPhone: ${customerPhone}\nAddress: ${customerAddress}\n\n`;
  message += `*Selected Items*\n`;
  cart.forEach((item, index) => {
    const qty = Math.max(1, cartNumber(item.qty, 1));
    const lineTotal = cartNumber(item.price, 0) * qty;
    total += lineTotal;
    const productLink = orderProductLink(item);
    message += `\n${index+1}. ${item.name}\n`;
    message += `Product ID: ${item.id}\n`;
    message += `Category: ${item.category || 'Product'}${item.subcategory ? ' / ' + item.subcategory : ''}\n`;
    if(item.variant && item.variant !== 'Standard') message += `${item.color && item.color !== 'Default' ? 'Size' : 'Option'}: ${item.variant}\n`;
    if(item.color && item.color !== 'Default') message += `Colour: ${item.color}\n`;
    message += `Qty: ${qty}\n`;
    message += `Rate: ${cartPriceText(item.price)}\n`;
    if(item.mrp && item.mrp > item.price) message += `MRP: ${cartPriceText(item.mrp)}\n`;
    message += `Item Total: ${cartPriceText(lineTotal)}\n`;
    if(productLink) message += `Product Link: ${productLink}\n`;
    if(item.image) message += `Image: ${item.image}\n`;
    if(item.terms && item.terms.length) message += `Terms: ${item.terms.join(', ')}\n`;
  });
  message += `\n*Grand Total: ${cartFormatMoney(total)}*\n\nPlease confirm item availability and delivery details.`;
  return message;
}
async function confirmOrderToWhatsApp(source = 'auto'){
  const context = cartCheckoutSource(source);
  const cart = getCart();
  if(!cart.length){ showSoftToast('Cart is empty'); return; }
  const customerName = customerField('customerName', context);
  const customerPhone = customerField('customerPhone', context);
  const customerAddress = customerField('customerAddress', context);
  if(!customerName || !customerPhone || !customerAddress){
    showCheckoutForm(context, true);
    showSoftToast('Add name, phone and address');
    const target = context === 'page'
      ? document.getElementById('customerName')
      : document.getElementById('drawerCustomerName') || document.getElementById('customerName');
    target?.focus();
    return;
  }
  showCartNotice('Checking latest availability...', 'info', context);
  const unavailable = await checkCartAvailabilityAndRefresh();
  if(unavailable.length){
    const details = unavailable.map(x => `${x.name} (${x.reason})`).join(', ');
    showOrderProblem('Some selected items need support', details, context);
    showSoftToast('Item unavailable');
    return;
  }
  clearCartNotices(context);
  const whatsappUrl = `https://wa.me/${SITE_CONFIG.whatsappNumber}?text=${encodeURIComponent(orderMessage(customerName, customerPhone, customerAddress))}`;
  window.location.assign(whatsappUrl);
}
function checkoutWhatsApp(source = 'auto'){ confirmOrderToWhatsApp(source); }
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
      <button class="btn primary full whatsapp-checkout" type="submit">Place Order</button>
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

function setupCartTriggers(){
  ensureCartDrawer();
  document.querySelectorAll('a[href="cart.html"], .floating-cart').forEach(el => {
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
function initCartSystem(){ setupCartTriggers(); initMobileMenu(); refreshCartEverywhere(); }
window.WelloneCart = { getCart, saveCart, addCartItem, removeCartItem, changeCartQty, clearCart, renderCartItems, openCartDrawer, closeCartDrawer, checkoutWhatsApp, showCheckoutForm, proceedToCheckout, checkCartAvailabilityAndRefresh };
window.addEventListener('pageshow', refreshCartEverywhere);
window.addEventListener('storage', refreshCartEverywhere);
document.addEventListener('visibilitychange', () => { if(!document.hidden) refreshCartEverywhere(); });
if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initCartSystem);
else initCartSystem();
