-- The order item webhook no longer claims events. pgflow runs the stock
-- adjustment, and nothing in the app reads this log.

drop function if exists public.claim_order_item_webhook(text, uuid, text);

drop table if exists public.order_item_webhook_event;
