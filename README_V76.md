# WellOne Customer v76

Customer storefront compatibility update for the WellOne Admin inventory/barcode/offers release.

## Included
- Optional product/variant quantity tracking from Supabase.
- Automatic out-of-stock handling for individual variants.
- Cart quantity limits and a live availability re-check before WhatsApp checkout.
- Barcode search/scanner on Home and Catalog. Product barcodes are used only for lookup and are not displayed on product cards or product details.
- Separate Offer Items section connected to `offer_items`, while preserving existing `offer_slides` sliding banners.
- Responsive/mobile optimized UI for all new controls.

## Database
Run `supabase/05_inventory_barcode_offers.sql` once if it has not already been run for the matching admin release.
