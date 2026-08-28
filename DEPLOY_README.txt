WellOne Customer v85 — cart, variants and order tracking
Deploy the CONTENTS of this ZIP at the site root.
After deployment, open wellone.in and refresh once. The v85 worker activates immediately and removes old WellOne customer caches. HTML navigation is no longer handled by the service worker, preventing ERR_FAILED on catalog.html?cat=... and product.html?id=....
Before deployment, run supabase/10_v85_heavy_commerce_flow.sql once. Cart lines now persist correctly, only submitted lines are cleared after a successful order, exact colour/option availability is enforced, and placed orders appear in My Orders.
