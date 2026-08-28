# WellOne Customer v79 — Orders + exact inventory variants

## Required before deployment
1. In Supabase SQL Editor, run `supabase/08_orders_employees_variants.sql` once, after the existing inventory/offers migrations.
2. Deploy this customer folder.
3. Deploy the matching v79 admin folder from the supplied admin ZIP.

## Added
- Customer order confirmation saved in Supabase.
- Green Order Confirmed screen with Go to Order Page button.
- My Orders section with order details, status, payment method/status, help menu, cancellation reason and status history.
- Customer cancellation restores reserved tracked stock and keeps the order in history as Cancelled.
- Confirmed orders reserve/deduct exact product or colour+size variant stock.
- Exact colour + size variant handling.
- Live inventory refresh through the existing WellOne store-change channel.
- Improved home offer section spacing.

## Important
- The current customer site has no customer account/login identity. For privacy, the order lookup token is saved only in that customer's browser/device. Clearing browser storage or changing device will remove the local My Orders references. A future OTP/account system can make history portable across devices.
- `Online payment` is available as an order payment method/status, but no new payment gateway was connected by this update. Connect the approved gateway separately if online collection is required.
