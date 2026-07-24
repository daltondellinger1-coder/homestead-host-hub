-- Repair the V1 reservation RPC against the current guests table. The legacy
-- guests owner column does not exist; ownership is recorded on reservations.
CREATE OR REPLACE FUNCTION public.create_reservation_with_guest(
  _unit_id uuid,
  _guest_name text,
  _guest_phone text,
  _guest_email text,
  _booking_source text,
  _check_in_date date,
  _check_out_date date,
  _check_in_time time DEFAULT '15:00',
  _check_out_time time DEFAULT '11:00',
  _special_notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_guest_id uuid;
  v_reservation_id uuid;
  v_legacy_source public.booking_source;
BEGIN
  IF NOT public.has_any_role(ARRAY['admin', 'property_manager']) THEN
    RAISE EXCEPTION 'Not authorized.';
  END IF;
  IF nullif(trim(_guest_name), '') IS NULL THEN
    RAISE EXCEPTION 'Guest name is required.';
  END IF;
  IF _check_out_date IS NULL OR _check_out_date <= _check_in_date THEN
    RAISE EXCEPTION 'Checkout must be after check-in.';
  END IF;

  v_legacy_source := CASE _booking_source
    WHEN 'airbnb' THEN 'airbnb'::public.booking_source
    WHEN 'furnished_finder' THEN 'furnished_finder'::public.booking_source
    WHEN 'direct' THEN 'direct'::public.booking_source
    WHEN 'long_term' THEN 'long_term'::public.booking_source
    WHEN 'lease' THEN 'lease'::public.booking_source
    ELSE 'other'::public.booking_source
  END;

  INSERT INTO public.guests (
    unit_id, name, phone, email, source, check_in, check_out,
    is_current, record_type
  ) VALUES (
    _unit_id, trim(_guest_name), nullif(trim(_guest_phone), ''),
    nullif(lower(trim(_guest_email)), ''), v_legacy_source,
    _check_in_date, _check_out_date, false, 'guest'
  )
  RETURNING id INTO v_guest_id;

  INSERT INTO public.reservations (
    guest_id, unit_id, booking_source, status, check_in_date, check_out_date,
    check_in_time, check_out_time, special_notes, created_by, updated_by
  ) VALUES (
    v_guest_id, _unit_id, _booking_source, 'confirmed',
    _check_in_date, _check_out_date, _check_in_time, _check_out_time,
    _special_notes, auth.uid(), auth.uid()
  )
  RETURNING id INTO v_reservation_id;

  RETURN v_reservation_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_reservation_with_guest(
  uuid, text, text, text, text, date, date, time, time, text
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_reservation_with_guest(
  uuid, text, text, text, text, date, date, time, time, text
) TO authenticated;
