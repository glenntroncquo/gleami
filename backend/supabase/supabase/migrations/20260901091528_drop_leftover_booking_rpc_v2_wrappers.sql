-- Drop leftover SalonFlow *_v2 RPC wrappers after callers use v1 names.
-- FILE ONLY — do not apply from CI or an agent. Glenn applies after review.
--
-- Requires 20260830160000_fold_booking_rpcs_v2_into_v1.sql to already be
-- applied (v1 names own the segment write path; *_v2 are thin wrappers).
--
-- Does NOT drop nearby_companies_v2.
-- Does NOT undeploy live edge functions (Glenn does that separately).
-- Does NOT drop leftover tables (treatment / price_option / …).

DROP FUNCTION IF EXISTS public.staff_is_on_schedule_v2(uuid, uuid, timestamp with time zone, timestamp with time zone);
DROP FUNCTION IF EXISTS public.create_appointment_v2(uuid, uuid, uuid, numeric, text, integer, timestamp with time zone, timestamp with time zone, timestamp with time zone, timestamp with time zone, text, jsonb);
DROP FUNCTION IF EXISTS public.create_appointment_staff_v2(uuid, uuid, uuid, numeric, text, integer, timestamp with time zone, timestamp with time zone, timestamp with time zone, timestamp with time zone, text, jsonb, text);
DROP FUNCTION IF EXISTS public.create_appointment_with_referral_v2(uuid, uuid, text, text, text, text, numeric, text, integer, timestamp with time zone, timestamp with time zone, timestamp with time zone, timestamp with time zone, text, jsonb, text);
