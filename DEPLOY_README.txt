WellOne Customer v86 — cart, exact variants, live stock and orders

DATABASE FIRST
- If migration 10 is not already installed, run supabase/10_v85_heavy_commerce_flow.sql.
- Then run supabase/11_v86_exact_options_manual_stock_live.sql.

DEPLOY
- Deploy the contents of this folder to the customer site root.
- The v86 service worker updates code network-first and removes older WellOne customer cache namespaces automatically.

V86
- Cart persists between pages and uses exact variant_id identity.
- Successful checkout removes only the quantities included in that confirmed order.
- Exact colour + size/ml/pack availability is enforced again in Supabase at checkout.
- Manual-stock products obey Admin In stock / Out of stock without fake quantity tracking.
- Realtime stock and shorter fallback caching reduce stale product state.
