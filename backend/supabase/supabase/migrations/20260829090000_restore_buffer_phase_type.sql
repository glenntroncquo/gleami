-- ALREADY APPLIED on live SalonFlow (kvhinnhnwgvdpzggdnxs) 2026-08-29.
-- Repo history only. Do not re-apply.
--
-- Restores phase_type CHECKs to busy | free | buffer and the overlap lock
-- staff_busy_no_overlap WHERE (phase_type IN ('busy','buffer') AND allow_overlap = false).
-- Free phases stay offerable. No chairs/rooms/resources.

ALTER TABLE public.service_variant_phase
  DROP CONSTRAINT IF EXISTS service_variant_phase_type_chk;

ALTER TABLE public.service_variant_phase
  ADD CONSTRAINT service_variant_phase_type_chk
  CHECK (phase_type = ANY (ARRAY['busy'::text, 'free'::text, 'buffer'::text]));

ALTER TABLE public.appointment_segment_phase
  DROP CONSTRAINT IF EXISTS appointment_segment_phase_type_chk;

ALTER TABLE public.appointment_segment_phase
  ADD CONSTRAINT appointment_segment_phase_type_chk
  CHECK (phase_type = ANY (ARRAY['busy'::text, 'free'::text, 'buffer'::text]));

ALTER TABLE public.appointment_segment_phase
  DROP CONSTRAINT IF EXISTS staff_busy_no_overlap;

ALTER TABLE public.appointment_segment_phase
  ADD CONSTRAINT staff_busy_no_overlap
  EXCLUDE USING gist (
    staff_id WITH =,
    tstzrange(starts_at, ends_at) WITH &&
  )
  WHERE (
    (phase_type = ANY (ARRAY['busy'::text, 'buffer'::text]))
    AND (allow_overlap = false)
  );
