-- SUPERSEDED. DO NOT APPLY to live SalonFlow (kvhinnhnwgvdpzggdnxs).
--
-- This file previously bundled booking RPC SQL and included DROP FUNCTION
-- statements. It is a no-op so a mistaken apply cannot touch live v1
-- create_appointment / create_appointment_staff /
-- create_appointment_with_referral.
--
-- Glenn applies only:
--   supabase/migrations/20260829140000_booking_rpcs_v2.sql
-- which CREATE OR REPLACE the additive *_v2 RPCs and contains zero DROP.

SELECT 1;
