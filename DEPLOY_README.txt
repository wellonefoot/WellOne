WellOne Customer v88 — 20-product infinite catalog + live exact stock

DATABASE
- v88 performance changes require NO new SQL.
- Existing exact-option/manual-stock/order features still require migrations 10 and 11 if they were never installed.

DEPLOY
- Deploy the CONTENTS of this folder to the customer site root.

V88 PERFORMANCE / RELIABILITY
- Catalog loads exactly 20 products per page request, then automatically requests the next 20 near the end of the list.
- Returning to a catalog no longer renders/re-downloads 60/80/100 cached products in one shot; restore starts with 20 again.
- Live product/variant events patch the affected loaded product when its product ID is known instead of bulk reloading the entire visible catalog.
- Broad live refreshes only refresh the first 20 and preserve already-loaded later pages.
- Old v86 product/catalog local caches are removed by the v88 namespace.
- Service worker does not cache Supabase API/auth responses or page navigations; code is network-first and images stay bounded-cache.

COMMERCE FEATURES RETAINED
- Persistent cart.
- Confirmed order removes only submitted/confirmed cart lines/quantities.
- Exact colour + size/ml/pack variant identity.
- Manual In stock / Out of stock items.
- Live stock and availability updates.
