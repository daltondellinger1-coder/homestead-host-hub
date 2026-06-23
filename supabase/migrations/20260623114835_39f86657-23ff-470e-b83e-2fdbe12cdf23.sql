-- Explicit SELECT policies so Supabase Realtime filters row broadcasts to admins only.
CREATE POLICY "Admins can view booking_requests"
  ON public.booking_requests FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view guests"
  ON public.guests FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view payments"
  ON public.payments FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view management_fees"
  ON public.management_fees FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view revenue_targets"
  ON public.revenue_targets FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

-- Tighten the maintenance UPDATE policy: prevent maintenance users from reassigning
-- ownership or changing assignee email/name. Admins retain full update via the
-- "Admins manage maintenance_requests" ALL policy.
DROP POLICY IF EXISTS "Maintenance update assigned or open" ON public.maintenance_requests;

CREATE POLICY "Maintenance update assigned or open"
  ON public.maintenance_requests
  FOR UPDATE
  USING (
    has_role(auth.uid(), 'maintenance')
    AND (
      assigned_to_user_id = auth.uid()
      OR assigned_to_user_id IS NULL
    )
  )
  WITH CHECK (
    has_role(auth.uid(), 'maintenance')
    AND (
      assigned_to_user_id IS NULL
      OR assigned_to_user_id = auth.uid()
    )
  );

-- Trigger guard: prevent maintenance role from changing assignment metadata fields
-- (assigned_to_email, assigned_to_name) on UPDATE. Admins are unaffected.
CREATE OR REPLACE FUNCTION public.guard_maintenance_request_assignment_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL
     AND has_role(auth.uid(), 'maintenance')
     AND NOT has_role(auth.uid(), 'admin')
  THEN
    IF NEW.assigned_to_email IS DISTINCT FROM OLD.assigned_to_email THEN
      RAISE EXCEPTION 'Maintenance role cannot modify assigned_to_email';
    END IF;
    IF NEW.assigned_to_name IS DISTINCT FROM OLD.assigned_to_name THEN
      RAISE EXCEPTION 'Maintenance role cannot modify assigned_to_name';
    END IF;
    -- Allow claiming an unassigned request (NULL -> self) but not reassigning
    -- to another user.
    IF NEW.assigned_to_user_id IS DISTINCT FROM OLD.assigned_to_user_id THEN
      IF NOT (OLD.assigned_to_user_id IS NULL AND NEW.assigned_to_user_id = auth.uid()) THEN
        RAISE EXCEPTION 'Maintenance role can only claim unassigned requests for themselves';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_maintenance_request_assignment_fields ON public.maintenance_requests;
CREATE TRIGGER guard_maintenance_request_assignment_fields
  BEFORE UPDATE ON public.maintenance_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_maintenance_request_assignment_fields();