-- Let the first real authenticated property-manager user claim admin access
-- even when an unlinked pre-seeded admin email row exists.
CREATE OR REPLACE FUNCTION public.claim_admin_if_first()
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_email text;
  v_admin_count int;
BEGIN
  IF v_uid IS NULL THEN RETURN false; END IF;

  -- Count only admin roles already linked to a real auth user. Pending email-only
  -- seed rows must not block the first actual property manager from getting in.
  SELECT count(*) INTO v_admin_count
  FROM public.user_roles
  WHERE role = 'admin'
    AND active = true
    AND user_id IS NOT NULL;

  IF v_admin_count > 0 THEN RETURN false; END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = v_uid;

  INSERT INTO public.user_roles (user_id, email, role, display_name, active)
    VALUES (v_uid, v_email, 'admin', split_part(coalesce(v_email,''), '@', 1), true)
    ON CONFLICT (user_id, role) DO UPDATE
      SET active = true,
          email = EXCLUDED.email,
          updated_at = now();

  RETURN true;
END; $$;
