WellOne Customer v83 — fixed/optimized
- Separate deployment; index.html is at ZIP root.
- v83 replaces the broken v82 navigation cache. Product/catalog/cart/offers/orders pages are never replaced by index.html.
- Public product images are runtime-cached; live Supabase data remains network-fresh.
- Old customer cache namespaces are removed automatically when v83 activates.
- Customer colour + size stock, orders, offers, cancellation/history and realtime inventory logic remain.
- No new database migration is required for this v83 performance/fix pass. If you never ran the earlier realtime setup, use supabase/09_realtime_exact_variant_sync.sql once.
