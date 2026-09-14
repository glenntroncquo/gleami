-- Fold find-or-create client + client_company into create_appointment_staff.
-- FILE ONLY — do not apply from CI or an agent. Glenn applies after review.
--
-- Staff Afspraak Maken was inserting into public.client from the browser.
-- client RLS ("Company Acces") requires an existing client_company row, so a
-- new person INSERT always fails (chicken-egg). Do NOT punch a hole in that
-- INSERT policy. Person create/link happens here (SECURITY DEFINER), same
-- pattern as create_appointment_with_referral.
--
-- Body after person-resolve is the LIVE SalonFlow create_appointment_staff
-- (pg_get_functiondef), not the old repo sql/ copy. Leftover appointment
-- columns actual_start / actual_end / duration_in_minutes were DROPPED.
-- Keep those names in the FUNCTION SIGNATURE (PostgREST still passes them)
-- but do NOT write them onto appointment — occupancy is phases.
--
-- DROP is required: extra defaulted person args change the signature.
-- Callers that still pass only p_client_id keep working (new args default null).
-- p_client_id stays in place (pass JSON null for walk-in / email create). A
-- DEFAULT in the middle would force defaults on every later arg (Postgres).
-- Does NOT drop leftover tables/columns. Does NOT change client RLS.

DROP FUNCTION IF EXISTS public.create_appointment_staff(uuid, uuid, uuid, numeric, text, integer, timestamp with time zone, timestamp with time zone, timestamp with time zone, timestamp with time zone, text, jsonb, text);

CREATE OR REPLACE FUNCTION public.create_appointment_staff(
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
  p_staff_notes text DEFAULT NULL,
  p_email text DEFAULT NULL,
  p_first_name text DEFAULT NULL,
  p_last_name text DEFAULT NULL,
  p_phone text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_appointment_id uuid;
  v_client_id uuid;
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
  -- Authenticated/anon (PostgREST) must belong to p_company_id.
  -- service_role / edge supabaseAdmin / direct SQL skip this.
  IF auth.role() IN ('authenticated', 'anon') THEN
    IF p_company_id IS NULL
       OR NOT (
         COALESCE(auth.jwt() -> 'app_metadata' -> 'company_ids', '[]'::jsonb)
         ? p_company_id::text
       )
    THEN
      RETURN jsonb_build_object('error', 'UNAUTHORIZED');
    END IF;
  END IF;

  IF p_segments IS NULL OR jsonb_typeof(p_segments) <> 'array' OR jsonb_array_length(p_segments) = 0 THEN
    RETURN jsonb_build_object('error', 'NO_SEGMENTS');
  END IF;

  -- Resolve client (find-or-create). Nested unique_violation so a raced
  -- client_email_key insert is not mapped to CONFLICT_DETECTED below.
  IF p_email IS NOT NULL AND btrim(p_email) <> '' THEN
    SELECT c.id
      INTO v_client_id
    FROM public.client c
    WHERE c.email = p_email;

    IF v_client_id IS NULL THEN
      BEGIN
        INSERT INTO public.client (email, first_name, last_name, phone, updated_at)
        VALUES (p_email, p_first_name, p_last_name, COALESCE(p_phone, ''), now())
        RETURNING id INTO v_client_id;
      EXCEPTION
        WHEN unique_violation THEN
          SELECT c.id
            INTO v_client_id
          FROM public.client c
          WHERE c.email = p_email;
      END;
    END IF;

    IF v_client_id IS NULL THEN
      RETURN jsonb_build_object('error', 'CLIENT_RESOLVE_FAILED');
    END IF;

    -- Fill empty first/last (and phone) only; do not overwrite a populated name.
    UPDATE public.client
    SET
      first_name = COALESCE(NULLIF(first_name, ''), NULLIF(p_first_name, '')),
      last_name  = COALESCE(NULLIF(last_name, ''), NULLIF(p_last_name, '')),
      phone      = COALESCE(NULLIF(phone, ''), NULLIF(p_phone, '')),
      updated_at = now()
    WHERE id = v_client_id;

  ELSIF p_client_id IS NOT NULL THEN
    v_client_id := p_client_id;

    IF COALESCE(NULLIF(p_first_name, ''), NULLIF(p_last_name, ''), NULLIF(p_phone, '')) IS NOT NULL THEN
      UPDATE public.client
      SET
        first_name = COALESCE(NULLIF(first_name, ''), NULLIF(p_first_name, '')),
        last_name  = COALESCE(NULLIF(last_name, ''), NULLIF(p_last_name, '')),
        phone      = COALESCE(NULLIF(phone, ''), NULLIF(p_phone, '')),
        updated_at = now()
      WHERE id = v_client_id;
    END IF;

  ELSE
    INSERT INTO public.client (email, first_name, last_name, phone, updated_at)
    VALUES (
      NULL,
      COALESCE(NULLIF(p_first_name, ''), 'Walk-in'),
      COALESCE(NULLIF(p_last_name, ''), 'Client'),
      COALESCE(p_phone, ''),
      now()
    )
    RETURNING id INTO v_client_id;
  END IF;

  INSERT INTO public.client_company (client_id, company_id)
  VALUES (v_client_id, p_company_id)
  ON CONFLICT (client_id, company_id) DO NOTHING;

  -- Live segment/phase body from here (p_duration_in_minutes / p_actual_start /
  -- p_actual_end remain in the signature for PostgREST; they are not written).
  v_segment := p_segments -> 0;
  v_header_staff_id := COALESCE(
    NULLIF(v_segment->>'staff_id', '')::uuid,
    p_staff_id
  );
  v_cursor := p_start;
  v_client_end := p_start;

  INSERT INTO public.appointment (
    company_id, staff_id, client_id,
    price, notes, staff_notes,
    "start", "end", image_path,
    allow_overlap
  ) VALUES (
    p_company_id,
    v_header_staff_id,
    v_client_id,
    p_price,
    p_notes,
    p_staff_notes,
    p_start AT TIME ZONE v_brussels,
    p_end AT TIME ZONE v_brussels,
    p_image_path,
    true
  )
  RETURNING id INTO v_appointment_id;

  FOR v_segment IN SELECT value FROM jsonb_array_elements(p_segments)
  LOOP
    v_variant_id := NULLIF(v_segment->>'service_variant_id', '')::uuid;
    v_service_id := NULLIF(v_segment->>'service_id', '')::uuid;
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
    "end" = v_end AT TIME ZONE v_brussels
  WHERE id = v_appointment_id;

  RETURN jsonb_build_object(
    'success', true,
    'id', v_appointment_id,
    'client_id', v_client_id
  );

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

GRANT EXECUTE ON FUNCTION public.create_appointment_staff(uuid, uuid, uuid, numeric, text, integer, timestamp with time zone, timestamp with time zone, timestamp with time zone, timestamp with time zone, text, jsonb, text, text, text, text, text) TO authenticated, service_role;
