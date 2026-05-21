
-- ============================================================
-- 1) ROLES
-- ============================================================
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'maintenance');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  display_name text,
  role public.app_role NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
CREATE INDEX IF NOT EXISTS user_roles_email_idx ON public.user_roles (lower(email));
CREATE INDEX IF NOT EXISTS user_roles_user_id_idx ON public.user_roles (user_id);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role AND active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.claim_admin_if_first()
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_email text;
  v_admin_count int;
BEGIN
  IF v_uid IS NULL THEN RETURN false; END IF;
  SELECT count(*) INTO v_admin_count FROM public.user_roles WHERE role = 'admin' AND active = true;
  IF v_admin_count > 0 THEN RETURN false; END IF;
  SELECT email INTO v_email FROM auth.users WHERE id = v_uid;
  INSERT INTO public.user_roles (user_id, email, role, display_name, active)
    VALUES (v_uid, v_email, 'admin', split_part(coalesce(v_email,''), '@', 1), true)
    ON CONFLICT (user_id, role) DO NOTHING;
  RETURN true;
END; $$;

CREATE OR REPLACE FUNCTION public.link_pending_roles_for_current_user()
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_email text;
  v_count int := 0;
BEGIN
  IF v_uid IS NULL THEN RETURN 0; END IF;
  SELECT email INTO v_email FROM auth.users WHERE id = v_uid;
  IF v_email IS NULL THEN RETURN 0; END IF;
  WITH upd AS (
    UPDATE public.user_roles
       SET user_id = v_uid, updated_at = now()
     WHERE user_id IS NULL AND lower(email) = lower(v_email)
     RETURNING 1
  )
  SELECT count(*) INTO v_count FROM upd;
  RETURN v_count;
END; $$;

CREATE OR REPLACE FUNCTION public.handle_new_user_link_roles()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.email IS NOT NULL THEN
    UPDATE public.user_roles
       SET user_id = NEW.id, updated_at = now()
     WHERE user_id IS NULL AND lower(email) = lower(NEW.email);
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS on_auth_user_created_link_roles ON auth.users;
CREATE TRIGGER on_auth_user_created_link_roles
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_link_roles();

DROP POLICY IF EXISTS "Users can read own roles" ON public.user_roles;
CREATE POLICY "Users can read own roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins manage user_roles" ON public.user_roles;
CREATE POLICY "Admins manage user_roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- 2) MAINTENANCE_REQUESTS COLUMNS
-- ============================================================
ALTER TABLE public.maintenance_requests
  ADD COLUMN IF NOT EXISTS assigned_to_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assigned_to_name text,
  ADD COLUMN IF NOT EXISTS assigned_to_email text,
  ADD COLUMN IF NOT EXISTS closed_at timestamptz;

CREATE INDEX IF NOT EXISTS maintenance_requests_assigned_to_idx
  ON public.maintenance_requests (assigned_to_user_id);
CREATE INDEX IF NOT EXISTS maintenance_requests_status_idx
  ON public.maintenance_requests (status);

-- ============================================================
-- 3) MAINTENANCE_UPDATES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.maintenance_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.maintenance_requests(id) ON DELETE CASCADE,
  author_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name text,
  status_from public.maintenance_status,
  status_to public.maintenance_status,
  note text,
  photo_urls text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS maintenance_updates_request_id_idx
  ON public.maintenance_updates (request_id, created_at DESC);
ALTER TABLE public.maintenance_updates ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 4) STATUS-CHANGE TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION public.log_maintenance_status_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_author_name text;
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF auth.uid() IS NOT NULL THEN
      SELECT display_name INTO v_author_name FROM public.user_roles
       WHERE user_id = auth.uid() AND active = true LIMIT 1;
    END IF;
    INSERT INTO public.maintenance_updates
      (request_id, author_user_id, author_name, status_from, status_to)
    VALUES (NEW.id, auth.uid(), v_author_name, OLD.status, NEW.status);

    IF NEW.status = 'completed' AND NEW.completed_at IS NULL THEN
      NEW.completed_at := now();
    END IF;
    IF NEW.status = 'closed_verified' AND NEW.closed_at IS NULL THEN
      NEW.closed_at := now();
    END IF;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS maintenance_status_change_trigger ON public.maintenance_requests;
CREATE TRIGGER maintenance_status_change_trigger
BEFORE UPDATE ON public.maintenance_requests
FOR EACH ROW EXECUTE FUNCTION public.log_maintenance_status_change();

-- ============================================================
-- 5) RLS — MAINTENANCE
-- ============================================================
DROP POLICY IF EXISTS "Allow public read maintenance_requests" ON public.maintenance_requests;
DROP POLICY IF EXISTS "Allow public insert maintenance_requests" ON public.maintenance_requests;
DROP POLICY IF EXISTS "Allow public update maintenance_requests" ON public.maintenance_requests;
DROP POLICY IF EXISTS "Allow public delete maintenance_requests" ON public.maintenance_requests;

CREATE POLICY "Admins manage maintenance_requests" ON public.maintenance_requests
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Maintenance read assigned or open" ON public.maintenance_requests
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'maintenance')
    AND (
      assigned_to_user_id = auth.uid()
      OR (assigned_to_user_id IS NULL AND status IN ('new','assigned','in_progress','waiting_on_tenant','waiting_on_parts'))
    )
  );

CREATE POLICY "Maintenance update assigned or open" ON public.maintenance_requests
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'maintenance')
    AND (assigned_to_user_id = auth.uid() OR assigned_to_user_id IS NULL)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'maintenance')
    AND (assigned_to_user_id = auth.uid() OR assigned_to_user_id IS NULL)
  );

CREATE POLICY "Anon can insert maintenance_requests" ON public.maintenance_requests
  FOR INSERT TO anon
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admins manage maintenance_updates" ON public.maintenance_updates;
CREATE POLICY "Admins manage maintenance_updates" ON public.maintenance_updates
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Maintenance read related updates" ON public.maintenance_updates
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'maintenance')
    AND EXISTS (
      SELECT 1 FROM public.maintenance_requests r
      WHERE r.id = maintenance_updates.request_id
        AND (r.assigned_to_user_id = auth.uid() OR r.assigned_to_user_id IS NULL)
    )
  );

CREATE POLICY "Maintenance insert related updates" ON public.maintenance_updates
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'maintenance')
    AND EXISTS (
      SELECT 1 FROM public.maintenance_requests r
      WHERE r.id = maintenance_updates.request_id
        AND (r.assigned_to_user_id = auth.uid() OR r.assigned_to_user_id IS NULL)
    )
  );

-- ============================================================
-- 6) RLS — RESTRICT OTHER TABLES TO ADMINS
-- ============================================================
DROP POLICY IF EXISTS "Allow public read guests" ON public.guests;
DROP POLICY IF EXISTS "Allow public insert guests" ON public.guests;
DROP POLICY IF EXISTS "Allow public update guests" ON public.guests;
DROP POLICY IF EXISTS "Allow public delete guests" ON public.guests;
CREATE POLICY "Admins manage guests" ON public.guests
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Allow public read payments" ON public.payments;
DROP POLICY IF EXISTS "Allow public insert payments" ON public.payments;
DROP POLICY IF EXISTS "Allow public update payments" ON public.payments;
DROP POLICY IF EXISTS "Allow public delete payments" ON public.payments;
CREATE POLICY "Admins manage payments" ON public.payments
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Allow public read management_fees" ON public.management_fees;
DROP POLICY IF EXISTS "Allow public insert management_fees" ON public.management_fees;
DROP POLICY IF EXISTS "Allow public update management_fees" ON public.management_fees;
DROP POLICY IF EXISTS "Allow public delete management_fees" ON public.management_fees;
CREATE POLICY "Admins manage management_fees" ON public.management_fees
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Allow public read revenue_targets" ON public.revenue_targets;
DROP POLICY IF EXISTS "Allow public insert revenue_targets" ON public.revenue_targets;
DROP POLICY IF EXISTS "Allow public update revenue_targets" ON public.revenue_targets;
DROP POLICY IF EXISTS "Allow public delete revenue_targets" ON public.revenue_targets;
CREATE POLICY "Admins manage revenue_targets" ON public.revenue_targets
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Allow public read units" ON public.units;
DROP POLICY IF EXISTS "Allow public insert units" ON public.units;
DROP POLICY IF EXISTS "Allow public update units" ON public.units;
DROP POLICY IF EXISTS "Allow public delete units" ON public.units;
CREATE POLICY "Admins manage units" ON public.units
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Maintenance can read units" ON public.units
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'maintenance'));

DROP POLICY IF EXISTS "Allow public read booking_requests" ON public.booking_requests;
DROP POLICY IF EXISTS "Allow public update booking_requests" ON public.booking_requests;
DROP POLICY IF EXISTS "Allow public delete booking_requests" ON public.booking_requests;
CREATE POLICY "Admins manage booking_requests" ON public.booking_requests
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Allow public read webhook_payload_log" ON public.webhook_payload_log;
DROP POLICY IF EXISTS "Allow public insert webhook_payload_log" ON public.webhook_payload_log;
DROP POLICY IF EXISTS "Allow public delete webhook_payload_log" ON public.webhook_payload_log;
CREATE POLICY "Admins read webhook_payload_log" ON public.webhook_payload_log
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- 7) STORAGE BUCKET
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('maintenance-photos', 'maintenance-photos', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Maintenance photos public read" ON storage.objects;
CREATE POLICY "Maintenance photos public read" ON storage.objects
  FOR SELECT USING (bucket_id = 'maintenance-photos');

DROP POLICY IF EXISTS "Maintenance photos staff upload" ON storage.objects;
CREATE POLICY "Maintenance photos staff upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'maintenance-photos'
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'maintenance'))
  );

DROP POLICY IF EXISTS "Maintenance photos staff delete" ON storage.objects;
CREATE POLICY "Maintenance photos staff delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'maintenance-photos'
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'maintenance'))
  );

-- ============================================================
-- 8) UPDATED_AT TRIGGERS
-- ============================================================
DROP TRIGGER IF EXISTS user_roles_updated_at ON public.user_roles;
CREATE TRIGGER user_roles_updated_at
BEFORE UPDATE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
