# WellOne Customer v78 — Standalone Offers Page

## What changed
- Removed the promotional offer-product cards from the home page.
- Added a dedicated `offers.html` page that can be linked from any home sliding banner or any other link.
- The home sliding banners remain independent and unchanged.

## Live offer behavior
- Customer opens `offers.html` and sees all active offer products.
- The product's current regular selling price is crossed out in red.
- The promotional offer price is shown prominently.
- Clicking a live offer opens the real product page with a verified offer context.
- Adding that product to cart uses the offer price.
- The cart re-checks the offer before checkout.

## Expired offer behavior
- Expired active offers remain visible on `offers.html`.
- They show a clear `Offer expired` warning.
- Their offer price is no longer used.
- Clicking an expired offer opens the normal product page without an offer context.
- If an offer expires while a product/cart is already open, the UI falls back to the product's current regular price.

## Required Supabase update
Run `supabase/07_offer_expiry_visibility.sql` from the matching admin v75 package once if your existing database was already using the older policy that hid expired offers.

## Banner link
Set a sliding banner redirect to:

`offers.html`

That opens the complete offers page.
