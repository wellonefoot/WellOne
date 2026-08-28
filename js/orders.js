'use strict';

const ORDER_PAGE_REFS_KEY = window.WELLONE_ORDER_REFS_KEY || 'wellone_customer_order_refs_v1';
let customerOrdersCache = [];
let ordersRefreshTimer = null;

function orderText(value, fallback=''){ return String(value ?? fallback).trim(); }
function orderEsc(value){ return String(value ?? '').replace(/[&<>'"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch])); }
function orderMoney(value){ const n=Number(value||0); return `₹${Number.isFinite(n)?n.toLocaleString('en-IN'):0}`; }
function orderDate(value){ try{return new Date(value).toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'short'});}catch(_e){return orderText(value);} }
function orderRefs(){ try{const rows=JSON.parse(localStorage.getItem(ORDER_PAGE_REFS_KEY)||'[]'); return Array.isArray(rows)?rows:[];}catch(_e){return [];} }
function orderClient(){
  if(typeof supabaseClient==='function') return supabaseClient();
  if(window.__welloneSupabase) return window.__welloneSupabase;
  if(!window.supabase || !window.SITE_CONFIG) throw new Error('Store connection is not ready.');
  window.__welloneSupabase=window.supabase.createClient(SITE_CONFIG.supabaseUrl,SITE_CONFIG.supabaseAnonKey,{auth:{persistSession:false}});
  return window.__welloneSupabase;
}
function orderStatusMeta(status){
  const s=orderText(status,'confirmed');
  const map={
    confirmed:['Order confirmed','confirmed'],
    packed:['Packed','packed'],
    out_for_delivery:['Out for delivery','delivery'],
    delivered:['Delivered','delivered'],
    cancelled:['Cancelled','cancelled']
  };
  return map[s]||[s.replaceAll('_',' '),'confirmed'];
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
  if(showLoader && holder) holder.innerHTML='<div class="orders-loading">Loading your orders…</div>';
  if(!refs.length){
    customerOrdersCache=[];
    if(holder) holder.innerHTML='<div class="orders-empty"><h2>No orders yet</h2><p>Your confirmed orders will appear here.</p><a class="btn primary" href="catalog.html">Shop products</a></div>';
    return [];
  }
  const settled=await Promise.all(refs.map(async ref=>{try{return await fetchCustomerOrder(ref);}catch(error){return {__error:error,__ref:ref};}}));
  customerOrdersCache=settled.filter(row=>row && !row.__error);
  if(holder) renderCustomerOrders(holder,customerOrdersCache,settled.some(row=>row?.__error));
  return customerOrdersCache;
}
function orderItemsHtml(order){
  const items=Array.isArray(order.items)?order.items:[];
  return items.map(item=>`<article class="order-item-line">
    <img src="${orderEsc(item.image_url || SITE_CONFIG.defaultCategoryImage)}" alt="${orderEsc(item.product_name)}">
    <div><b>${orderEsc(item.product_name)}</b><small>${[item.color&&item.color!=='Default'?`Colour: ${item.color}`:'',item.size&&item.size!=='Standard'?`Size: ${item.size}`:''].filter(Boolean).join(' · ') || 'Standard item'}</small><small>Qty ${Number(item.quantity||1)} × ${orderMoney(item.unit_price)}</small></div>
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
  holder.innerHTML=(hadError?'<div class="orders-sync-note">Some orders could not refresh. Check your connection and try again.</div>':'') + (orders.length?orders.map(orderCardHtml).join(''):'<div class="orders-empty"><h2>No available orders</h2><p>Confirmed orders from this device will appear here.</p></div>');
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
  ordersRefreshTimer=setInterval(()=>{if(!document.hidden)loadCustomerOrders(false).catch(()=>{});},15000);
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
  if(!ref){ if(number)number.textContent='Order confirmed'; return; }
  try{
    const order=await fetchCustomerOrder(ref);
    if(number)number.textContent=order?.order_number||ref.number||'Order confirmed';
    if(total)total.textContent=orderMoney(order?.total||0);
    if(payment)payment.textContent=paymentLabel(order?.payment_method,order?.payment_status);
  }catch(_error){ if(number)number.textContent=ref.number||'Order confirmed'; }
}

window.initOrdersPage=initOrdersPage;
window.initOrderConfirmationPage=initOrderConfirmationPage;
window.submitCustomerCancellation=submitCustomerCancellation;
