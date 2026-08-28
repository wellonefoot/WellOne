WellOne Customer v84 — safe navigation + optimized assets
Deploy the CONTENTS of this ZIP at the site root.
After deployment, open wellone.in and refresh once. The v84 worker activates immediately and removes old WellOne customer caches. HTML navigation is no longer handled by the service worker, preventing ERR_FAILED on catalog.html?cat=... and product.html?id=....
No new SQL migration is required for this v84 fix.
