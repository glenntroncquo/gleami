-- ADDITIVE v2 booking RPCs for SalonFlow.
-- Glenn applies THIS FILE ONLY to live (after review). Do not deploy edge
-- functions until these RPCs exist.
--
-- CREATE OR REPLACE on *_v2 names only. ZERO DROP. Does not replace:
--   public.create_appointment
--   public.create_appointment_staff
--   public.create_appointment_with_referral
--   public.staff_is_on_schedule (if present)
-- Live v1 contracts (p_treatments) stay unchanged.
--
-- Writes appointment_segment + appointment_segment_phase (busy/free/buffer).
-- Does not write appointment.treatment_id / appointment.price_option_id.
-- Does not write treatment / price_option / appointment_treatment.
-- No chairs/resources.
-- Overlap lock is existing staff_busy_no_overlap (busy+buffer).
-- Client-facing duration = busy+free. Staff occupancy includes buffer.


-- Additive v2 booking write path (segments + busy/free/buffer).
-- CREATE OR REPLACE on *_v2 names only. Never DROP/CREATE live
-- create_appointment / create_appointment_staff /
-- create_appointment_with_referral / staff_is_on_schedule.
-- Overlap exclusion is staff_busy_no_overlap on appointment_segment_phase
-- (phase_type IN ('busy','buffer') AND allow_overlap = false). Free phases
-- are not exclusive. Buffer locks staff but is not client-facing duration.
-- Glenn applies supabase/migrations/20260829140000_booking_rpcs_v2.sql
-- (this file is the source). Do not apply as a replace of v1.

CREATE OR REPLACE FUNCTION public.staff_is_on_schedule_v2(
  p_company_id uuid,
  p_staff_id uuid,
  p_start timestamp with time zone,
  p_end timestamp with time zone
)
RETURNS boolean
LANGUAGE sql
STABLE
AS $schedule$
  SELECT
    NOT EXISTS (
      SELECT 1
      FROM public.staff_schedule_exception e
      WHERE e.company_id = p_company_id
        AND e.staff_id = p_staff_id
        AND e.kind = 'unavailable'
        AND tstzrange(e.starts_at, e.ends_at) && tstzrange(p_start, p_end)
    )
    AND (
      EXISTS (
        SELECT 1
        FROM public.staff_schedule_rule r
        WHERE r.company_id = p_company_id
          AND r.staff_id = p_staff_id
          AND r.is_active
          AND r.day_of_week = EXTRACT(DOW FROM (p_start AT TIME ZONE 'Europe/Brussels'))::smallint
          AND (r.effective_from IS NULL OR r.effective_from <= (p_start AT TIME ZONE 'Europe/Brussels')::date)
          AND (r.effective_to IS NULL OR r.effective_to >= (p_start AT TIME ZONE 'Europe/Brussels')::date)
          AND (p_start AT TIME ZONE 'Europe/Brussels')::date = (p_end AT TIME ZONE 'Europe/Brussels')::date
          AND (p_start AT TIME ZONE 'Europe/Brussels')::time >= r.start_time
          AND (p_end AT TIME ZONE 'Europe/Brussels')::time <= r.end_time
      )
      OR EXISTS (
        SELECT 1
        FROM public.staff_schedule_exception e
        WHERE e.company_id = p_company_id
          AND e.staff_id = p_staff_id
          AND e.kind = 'available_addition'
          AND e.starts_at <= p_start
          AND e.ends_at >= p_end
      )
    );
$schedule$;

CREATE OR REPLACE FUNCTION public.create_appointment_v2(
  p_company_id uuid,
  p_staff_id uuid,
  p_client_id uuid,
  p_price numeric,
  p_notes text,
  p_duration_in_minutes integer,
  p_start timestamp with time zone,
  p_end timestamp with time zone,
  p_actual_start timestamp with time zone,
  p_actual_end timestamp with time zone,
  p_image_path text,
  p_segments jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
AS $function$
DECLARE
  v_appointment_id uuid;
  v_header_staff_id uuid;
  v_cursor timestamptz;
  v_end timestamptz;
  v_segment jsonb;
  v_sequence integer := 0;
  v_service_id uuid;
  v_variant_id uuid;
  v_segment_staff_id uuid;
  v_segment_id uuid;
  v_seg_start timestamptz;
  v_variant record;
  v_phase record;
  v_phase_start timestamptz;
  v_phase_end timestamptz;
  v_has_phases boolean;
  v_price numeric;
  v_price_net numeric;
  v_seg_client_end timestamptz;
  v_client_end timestamptz;
  v_client_minutes integer := 0;
  v_phase_allow_overlap boolean;
  v_brussels constant text := 'Europe/Brussels';
BEGIN
  IF p_segments IS NULL OR jsonb_typeof(p_segments) <> 'array' OR jsonb_array_length(p_segments) = 0 THEN
    RETURN jsonb_build_object('error', 'NO_SEGMENTS');
  END IF;

  v_segment := p_segments -> 0;
  v_header_staff_id := COALESCE(
    NULLIF(v_segment->>'staff_id', '')::uuid,
    p_staff_id
  );
  v_cursor := p_start;
  v_client_end := p_start;

  INSERT INTO public.appointment (
    company_id, staff_id, client_id,
    price, notes, duration_in_minutes,
    "start", "end", actual_start, actual_end, image_path,
    allow_overlap
  ) VALUES (
    p_company_id,
    v_header_staff_id,
    p_client_id,
    p_price,
    p_notes,
    p_duration_in_minutes,
    p_start AT TIME ZONE v_brussels,
    p_end AT TIME ZONE v_brussels,
    p_actual_start AT TIME ZONE v_brussels,
    p_actual_end AT TIME ZONE v_brussels,
    p_image_path,
    true
  )
  RETURNING id INTO v_appointment_id;

  FOR v_segment IN SELECT value FROM jsonb_array_elements(p_segments)
  LOOP
    v_variant_id := COALESCE(
      NULLIF(v_segment->>'service_variant_id', '')::uuid,
      NULLIF(v_segment->>'price_option_id', '')::uuid
    );
    v_service_id := COALESCE(
      NULLIF(v_segment->>'service_id', '')::uuid,
      NULLIF(v_segment->>'treatment_id', '')::uuid
    );
    v_segment_staff_id := COALESCE(
      NULLIF(v_segment->>'staff_id', '')::uuid,
      p_staff_id
    );

    IF v_variant_id IS NULL OR v_segment_staff_id IS NULL THEN
      DELETE FROM public.appointment WHERE id = v_appointment_id;
      RETURN jsonb_build_object('error', 'INVALID_SEGMENT');
    END IF;

    SELECT sv.id, sv.service_id, sv.price, sv.price_net, sv.client_duration_minutes
      INTO v_variant
    FROM public.service_variant sv
    WHERE sv.id = v_variant_id
      AND sv.company_id = p_company_id
      AND COALESCE(sv.is_deleted, false) = false;

    IF v_variant.id IS NULL THEN
      DELETE FROM public.appointment WHERE id = v_appointment_id;
      RETURN jsonb_build_object('error', 'INVALID_SERVICE_VARIANT');
    END IF;

    v_service_id := COALESCE(v_service_id, v_variant.service_id);
    v_price := v_variant.price;
    v_price_net := v_variant.price_net;
    v_seg_start := v_cursor;
    v_seg_client_end := v_cursor;

    SELECT EXISTS (
      SELECT 1 FROM public.service_variant_phase p
      WHERE p.service_variant_id = v_variant_id
    ) INTO v_has_phases;

    INSERT INTO public.appointment_segment (
      company_id, appointment_id, service_id, service_variant_id, staff_id,
      sequence, starts_at, ends_at, price, price_net, allow_overlap
    ) VALUES (
      p_company_id, v_appointment_id, v_service_id, v_variant_id, v_segment_staff_id,
      v_sequence, v_seg_start, v_seg_start + interval '1 minute', v_price, v_price_net, false
    )
    RETURNING id INTO v_segment_id;

    IF v_has_phases THEN
      FOR v_phase IN
        SELECT sequence, phase_type, duration_minutes
        FROM public.service_variant_phase
        WHERE service_variant_id = v_variant_id
        ORDER BY sequence
      LOOP
        v_phase_start := v_cursor;
        v_phase_end := v_cursor + make_interval(mins => v_phase.duration_minutes::integer);
        v_phase_allow_overlap := (v_phase.phase_type = 'free');

        IF v_phase.phase_type IN ('busy', 'buffer') THEN
          IF NOT public.staff_is_on_schedule_v2(p_company_id, v_segment_staff_id, v_phase_start, v_phase_end) THEN
            DELETE FROM public.appointment WHERE id = v_appointment_id;
            RETURN jsonb_build_object('error', 'NOT_AVAILABLE');
          END IF;
        END IF;

        INSERT INTO public.appointment_segment_phase (
          company_id, appointment_segment_id, staff_id,
          sequence, phase_type, starts_at, ends_at, allow_overlap
        ) VALUES (
          p_company_id, v_segment_id, v_segment_staff_id,
          v_phase.sequence, v_phase.phase_type, v_phase_start, v_phase_end, v_phase_allow_overlap
        );

        IF v_phase.phase_type IN ('busy', 'free') THEN
          v_seg_client_end := v_phase_end;
          v_client_end := v_phase_end;
          v_client_minutes := v_client_minutes + v_phase.duration_minutes::integer;
        END IF;

        v_cursor := v_phase_end;
      END LOOP;
    ELSE
      v_phase_start := v_cursor;
      v_phase_end := v_cursor + make_interval(mins => COALESCE(v_variant.client_duration_minutes, 0)::integer);
      IF v_phase_end <= v_phase_start THEN
        DELETE FROM public.appointment WHERE id = v_appointment_id;
        RETURN jsonb_build_object('error', 'INVALID_SERVICE_VARIANT');
      END IF;
      IF NOT public.staff_is_on_schedule_v2(p_company_id, v_segment_staff_id, v_phase_start, v_phase_end) THEN
        DELETE FROM public.appointment WHERE id = v_appointment_id;
        RETURN jsonb_build_object('error', 'NOT_AVAILABLE');
      END IF;
      INSERT INTO public.appointment_segment_phase (
        company_id, appointment_segment_id, staff_id,
        sequence, phase_type, starts_at, ends_at, allow_overlap
      ) VALUES (
        p_company_id, v_segment_id, v_segment_staff_id,
        0, 'busy', v_phase_start, v_phase_end, false
      );
      v_seg_client_end := v_phase_end;
      v_client_end := v_phase_end;
      v_client_minutes := v_client_minutes + COALESCE(v_variant.client_duration_minutes, 0)::integer;
      v_cursor := v_phase_end;
    END IF;

    UPDATE public.appointment_segment
    SET ends_at = v_seg_client_end
    WHERE id = v_segment_id;

    v_sequence := v_sequence + 1;
  END LOOP;

  v_end := v_client_end;

  UPDATE public.appointment
  SET
    "end" = v_end AT TIME ZONE v_brussels,
    actual_end = v_end AT TIME ZONE v_brussels,
    duration_in_minutes = v_client_minutes
  WHERE id = v_appointment_id;

  RETURN jsonb_build_object('success', true, 'id', v_appointment_id);

EXCEPTION
  WHEN exclusion_violation THEN
    RETURN jsonb_build_object('error', 'CONFLICT_DETECTED');
  WHEN unique_violation THEN
    RETURN jsonb_build_object('error', 'CONFLICT_DETECTED');
  WHEN serialization_failure THEN
    RETURN jsonb_build_object('error', 'CONCURRENCY_RETRY');
  WHEN others THEN
    RETURN jsonb_build_object('error', SQLERRM);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.staff_is_on_schedule_v2(uuid, uuid, timestamp with time zone, timestamp with time zone) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_appointment_v2(uuid, uuid, uuid, numeric, text, integer, timestamp with time zone, timestamp with time zone, timestamp with time zone, timestamp with time zone, text, jsonb) TO authenticated, service_role;


-- Additive v2 staff dashboard booking. Same segments write path as
-- create_appointment_v2 (busy/free/buffer; client-facing = busy+free),
-- but skips schedule checks and sets allow_overlap on all phases so staff
-- can double-book. CREATE OR REPLACE on create_appointment_staff_v2 only.
-- Never DROP/CREATE live create_appointment_staff.

CREATE OR REPLACE FUNCTION public.create_appointment_staff_v2(
  p_company_id uuid,
  p_staff_id uuid,
  p_client_id uuid,
  p_price numeric,
  p_notes text,
  p_duration_in_minutes integer,
  p_start timestamp with time zone,
  p_end timestamp with time zone,
  p_actual_start timestamp with time zone,
  p_actual_end timestamp with time zone,
  p_image_path text,
  p_segments jsonb,
  p_staff_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_appointment_id uuid;
  v_header_staff_id uuid;
  v_cursor timestamptz;
  v_end timestamptz;
  v_segment jsonb;
  v_sequence integer := 0;
  v_service_id uuid;
  v_variant_id uuid;
  v_segment_staff_id uuid;
  v_segment_id uuid;
  v_seg_start timestamptz;
  v_variant record;
  v_phase record;
  v_phase_start timestamptz;
  v_phase_end timestamptz;
  v_has_phases boolean;
  v_price numeric;
  v_price_net numeric;
  v_seg_client_end timestamptz;
  v_client_end timestamptz;
  v_client_minutes integer := 0;
  v_brussels constant text := 'Europe/Brussels';
BEGIN
  IF p_segments IS NULL OR jsonb_typeof(p_segments) <> 'array' OR jsonb_array_length(p_segments) = 0 THEN
    RETURN jsonb_build_object('error', 'NO_SEGMENTS');
  END IF;

  v_segment := p_segments -> 0;
  v_header_staff_id := COALESCE(
    NULLIF(v_segment->>'staff_id', '')::uuid,
    p_staff_id
  );
  v_cursor := p_start;
  v_client_end := p_start;

  INSERT INTO public.appointment (
    company_id, staff_id, client_id,
    price, notes, staff_notes, duration_in_minutes,
    "start", "end", actual_start, actual_end, image_path,
    allow_overlap
  ) VALUES (
    p_company_id,
    v_header_staff_id,
    p_client_id,
    p_price,
    p_notes,
    p_staff_notes,
    p_duration_in_minutes,
    p_start AT TIME ZONE v_brussels,
    p_end AT TIME ZONE v_brussels,
    p_actual_start AT TIME ZONE v_brussels,
    p_actual_end AT TIME ZONE v_brussels,
    p_image_path,
    true
  )
  RETURNING id INTO v_appointment_id;

  FOR v_segment IN SELECT value FROM jsonb_array_elements(p_segments)
  LOOP
    v_variant_id := COALESCE(
      NULLIF(v_segment->>'service_variant_id', '')::uuid,
      NULLIF(v_segment->>'price_option_id', '')::uuid
    );
    v_service_id := COALESCE(
      NULLIF(v_segment->>'service_id', '')::uuid,
      NULLIF(v_segment->>'treatment_id', '')::uuid
    );
    v_segment_staff_id := COALESCE(
      NULLIF(v_segment->>'staff_id', '')::uuid,
      p_staff_id
    );

    IF v_variant_id IS NULL OR v_segment_staff_id IS NULL THEN
      DELETE FROM public.appointment WHERE id = v_appointment_id;
      RETURN jsonb_build_object('error', 'INVALID_SEGMENT');
    END IF;

    SELECT sv.id, sv.service_id, sv.price, sv.price_net, sv.client_duration_minutes
      INTO v_variant
    FROM public.service_variant sv
    WHERE sv.id = v_variant_id
      AND sv.company_id = p_company_id
      AND COALESCE(sv.is_deleted, false) = false;

    IF v_variant.id IS NULL THEN
      DELETE FROM public.appointment WHERE id = v_appointment_id;
      RETURN jsonb_build_object('error', 'INVALID_SERVICE_VARIANT');
    END IF;

    v_service_id := COALESCE(v_service_id, v_variant.service_id);
    v_price := v_variant.price;
    v_price_net := v_variant.price_net;
    v_seg_start := v_cursor;
    v_seg_client_end := v_cursor;

    SELECT EXISTS (
      SELECT 1 FROM public.service_variant_phase p
      WHERE p.service_variant_id = v_variant_id
    ) INTO v_has_phases;

    INSERT INTO public.appointment_segment (
      company_id, appointment_id, service_id, service_variant_id, staff_id,
      sequence, starts_at, ends_at, price, price_net, allow_overlap
    ) VALUES (
      p_company_id, v_appointment_id, v_service_id, v_variant_id, v_segment_staff_id,
      v_sequence, v_seg_start, v_seg_start + interval '1 minute', v_price, v_price_net, true
    )
    RETURNING id INTO v_segment_id;

    IF v_has_phases THEN
      FOR v_phase IN
        SELECT sequence, phase_type, duration_minutes
        FROM public.service_variant_phase
        WHERE service_variant_id = v_variant_id
        ORDER BY sequence
      LOOP
        v_phase_start := v_cursor;
        v_phase_end := v_cursor + make_interval(mins => v_phase.duration_minutes::integer);

        INSERT INTO public.appointment_segment_phase (
          company_id, appointment_segment_id, staff_id,
          sequence, phase_type, starts_at, ends_at, allow_overlap
        ) VALUES (
          p_company_id, v_segment_id, v_segment_staff_id,
          v_phase.sequence, v_phase.phase_type, v_phase_start, v_phase_end, true
        );

        IF v_phase.phase_type IN ('busy', 'free') THEN
          v_seg_client_end := v_phase_end;
          v_client_end := v_phase_end;
          v_client_minutes := v_client_minutes + v_phase.duration_minutes::integer;
        END IF;

        v_cursor := v_phase_end;
      END LOOP;
    ELSE
      v_phase_start := v_cursor;
      v_phase_end := v_cursor + make_interval(mins => COALESCE(v_variant.client_duration_minutes, 0)::integer);
      IF v_phase_end <= v_phase_start THEN
        DELETE FROM public.appointment WHERE id = v_appointment_id;
        RETURN jsonb_build_object('error', 'INVALID_SERVICE_VARIANT');
      END IF;
      INSERT INTO public.appointment_segment_phase (
        company_id, appointment_segment_id, staff_id,
        sequence, phase_type, starts_at, ends_at, allow_overlap
      ) VALUES (
        p_company_id, v_segment_id, v_segment_staff_id,
        0, 'busy', v_phase_start, v_phase_end, true
      );
      v_seg_client_end := v_phase_end;
      v_client_end := v_phase_end;
      v_client_minutes := v_client_minutes + COALESCE(v_variant.client_duration_minutes, 0)::integer;
      v_cursor := v_phase_end;
    END IF;

    UPDATE public.appointment_segment
    SET ends_at = v_seg_client_end
    WHERE id = v_segment_id;

    v_sequence := v_sequence + 1;
  END LOOP;

  v_end := v_client_end;

  UPDATE public.appointment
  SET
    "end" = v_end AT TIME ZONE v_brussels,
    actual_end = v_end AT TIME ZONE v_brussels,
    duration_in_minutes = v_client_minutes
  WHERE id = v_appointment_id;

  RETURN jsonb_build_object('success', true, 'id', v_appointment_id);

EXCEPTION
  WHEN exclusion_violation THEN
    RETURN jsonb_build_object('error', 'CONFLICT_DETECTED');
  WHEN unique_violation THEN
    RETURN jsonb_build_object('error', 'CONFLICT_DETECTED');
  WHEN serialization_failure THEN
    RETURN jsonb_build_object('error', 'CONCURRENCY_RETRY');
  WHEN others THEN
    RETURN jsonb_build_object('error', SQLERRM);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.create_appointment_staff_v2(uuid, uuid, uuid, numeric, text, integer, timestamp with time zone, timestamp with time zone, timestamp with time zone, timestamp with time zone, text, jsonb, text) TO authenticated, service_role;


-- Additive v2 client booking + referral wrapper. Calls create_appointment_v2.
-- CREATE OR REPLACE on create_appointment_with_referral_v2 only.
-- Never DROP/CREATE live create_appointment_with_referral.

CREATE OR REPLACE FUNCTION public.create_appointment_with_referral_v2(p_company_id uuid, p_staff_id uuid, p_email text, p_first_name text, p_last_name text, p_phone text, p_price numeric, p_notes text, p_duration_in_minutes integer, p_start timestamp with time zone, p_end timestamp with time zone, p_actual_start timestamp with time zone, p_actual_end timestamp with time zone, p_image_path text, p_segments jsonb, p_referral_code text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_client_id uuid;
  v_client_was_created boolean := false;
  v_booking jsonb;
  v_appointment_id uuid;

  v_referral_code_id uuid;
  v_referrer_client_id uuid;

  v_existing_link boolean;
BEGIN
  -- Normalize empty referral code to NULL
  IF p_referral_code IS NOT NULL AND btrim(p_referral_code) = '' THEN
    p_referral_code := NULL;
  END IF;

  -- Resolve (or create) client by email
  SELECT c.id
    INTO v_client_id
  FROM public.client c
  WHERE c.email = p_email;

  IF v_client_id IS NULL THEN
    INSERT INTO public.client (email, first_name, last_name, phone, updated_at)
    VALUES (p_email, p_first_name, p_last_name, COALESCE(p_phone, ''), now())
    RETURNING id INTO v_client_id;
    v_client_was_created := true;
  ELSE
    UPDATE public.client
    SET
      first_name = COALESCE(NULLIF(p_first_name, ''), first_name),
      last_name  = COALESCE(NULLIF(p_last_name, ''), last_name),
      phone      = COALESCE(NULLIF(p_phone, ''), phone),
      updated_at = now()
    WHERE id = v_client_id;
  END IF;

  -- Check whether client already linked to this company
  SELECT EXISTS (
    SELECT 1
    FROM public.client_company cc
    WHERE cc.company_id = p_company_id
      AND cc.client_id = v_client_id
  )
  INTO v_existing_link;

  -- Referral validation (if provided)
  IF p_referral_code IS NOT NULL THEN
    SELECT rc.id, rc.referrer_client_id
      INTO v_referral_code_id, v_referrer_client_id
    FROM public.referral_code rc
    WHERE rc.company_id = p_company_id
      AND rc.code = p_referral_code;

    IF v_referral_code_id IS NULL THEN
      IF v_client_was_created THEN
        DELETE FROM public.client WHERE id = v_client_id;
      END IF;
      RETURN jsonb_build_object('error', 'REFERRAL_INVALID');
    END IF;

    IF EXISTS (
      SELECT 1
      FROM public.referral_code rc
      WHERE rc.id = v_referral_code_id
        AND rc.is_active = false
    ) THEN
      IF v_client_was_created THEN
        DELETE FROM public.client WHERE id = v_client_id;
      END IF;
      RETURN jsonb_build_object('error', 'REFERRAL_INACTIVE');
    END IF;

    IF EXISTS (
      SELECT 1
      FROM public.referral_code rc
      WHERE rc.id = v_referral_code_id
        AND rc.expires_at IS NOT NULL
        AND rc.expires_at <= now()
    ) THEN
      IF v_client_was_created THEN
        DELETE FROM public.client WHERE id = v_client_id;
      END IF;
      RETURN jsonb_build_object('error', 'REFERRAL_EXPIRED');
    END IF;

    -- Enforce "new to company" when referral provided
    IF v_existing_link THEN
      IF v_client_was_created THEN
        DELETE FROM public.client WHERE id = v_client_id;
      END IF;
      RETURN jsonb_build_object('error', 'REFERRAL_NOT_NEW_CLIENT');
    END IF;
  END IF;

  -- Create appointment via the additive v2 segments RPC
  v_booking := public.create_appointment_v2(
    p_company_id := p_company_id,
    p_staff_id := p_staff_id,
    p_client_id := v_client_id,
    p_price := p_price,
    p_notes := p_notes,
    p_duration_in_minutes := p_duration_in_minutes,
    p_start := p_start,
    p_end := p_end,
    p_actual_start := p_actual_start,
    p_actual_end := p_actual_end,
    p_image_path := p_image_path,
    p_segments := p_segments
  );

  IF (v_booking ? 'error') THEN
    IF v_client_was_created THEN
      DELETE FROM public.client WHERE id = v_client_id;
    END IF;
    RETURN v_booking;
  END IF;

  v_appointment_id := (v_booking->>'id')::uuid;

  IF v_appointment_id IS NULL THEN
    IF v_client_was_created THEN
      DELETE FROM public.client WHERE id = v_client_id;
    END IF;
    RETURN jsonb_build_object('error', 'BOOKING_FAILED');
  END IF;

  -- Insert redemption (only if referral provided)
  IF p_referral_code IS NOT NULL THEN
    BEGIN
      INSERT INTO public.referral_redemption (
        company_id,
        referral_code_id,
        referrer_client_id,
        referred_client_id,
        appointment_id
      ) VALUES (
        p_company_id,
        v_referral_code_id,
        v_referrer_client_id,
        v_client_id,
        v_appointment_id
      );

    EXCEPTION
      WHEN unique_violation THEN
        -- Covers:
        -- - unique(company_id, referred_client_id)
        -- - unique(appointment_id)
        IF v_client_was_created THEN
          DELETE FROM public.client WHERE id = v_client_id;
        END IF;
        RETURN jsonb_build_object('error', 'REFERRAL_REDEMPTION_CONFLICT');
    END;
  END IF;

  -- Ensure link exists (create it if missing) only after a successful booking (+ optional redemption)
  IF NOT v_existing_link THEN
    INSERT INTO public.client_company (client_id, company_id)
    VALUES (v_client_id, p_company_id)
    ON CONFLICT (client_id, company_id) DO NOTHING;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'id', v_appointment_id,
    'client_id', v_client_id
  );

EXCEPTION
  WHEN serialization_failure THEN
    RETURN jsonb_build_object('error', 'CONCURRENCY_RETRY');
  WHEN others THEN
    RETURN jsonb_build_object('error', SQLERRM);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.create_appointment_with_referral_v2(uuid, uuid, text, text, text, text, numeric, text, integer, timestamp with time zone, timestamp with time zone, timestamp with time zone, timestamp with time zone, text, jsonb, text) TO authenticated, service_role;
