-- Homestead Helper V1 operational layer.
-- Additive by design: existing Host Hub guests, payments, units, and maintenance
-- remain intact while the new daily-operations workflows are introduced.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'property_manager';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'cleaner';

CREATE OR REPLACE FUNCTION public.has_any_role(_roles text[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.user_roles
     WHERE user_id = auth.uid()
       AND active = true
       AND role::text = ANY (_roles)
  );
$$;

GRANT EXECUTE ON FUNCTION public.has_any_role(text[]) TO authenticated;

-- Briana uses the shared booking identity as a full-access administrator.
-- The row can exist before first login; account-linking should attach user_id
-- after Google authentication is enabled for this address.
INSERT INTO public.user_roles (email, display_name, role, active)
SELECT 'booking@homestead-hill.com', 'Briana', 'admin', true
WHERE NOT EXISTS (
  SELECT 1
    FROM public.user_roles
   WHERE lower(email) = 'booking@homestead-hill.com'
     AND role::text = 'admin'
     AND active = true
);

-- Existing guest rows continue to work and can be progressively enriched.
ALTER TABLE public.guests
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS record_type text NOT NULL DEFAULT 'guest'
    CHECK (record_type IN ('guest', 'tenant')),
  ADD COLUMN IF NOT EXISTS emergency_contact text,
  ADD COLUMN IF NOT EXISTS vehicle_notes text,
  ADD COLUMN IF NOT EXISTS pet_information text,
  ADD COLUMN IF NOT EXISTS communication_notes text,
  ADD COLUMN IF NOT EXISTS access_notes text,
  ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;

-- Keep the legacy enum-backed status for compatibility. The operational status
-- is intentionally text so this migration can be safely applied in one pass.
ALTER TABLE public.units
  ADD COLUMN IF NOT EXISTS operational_status text NOT NULL DEFAULT 'vacant_ready'
    CHECK (operational_status IN (
      'occupied',
      'vacant_ready',
      'vacant_dirty',
      'cleaning_scheduled',
      'maintenance_needed',
      'offline',
      'under_renovation'
    )),
  ADD COLUMN IF NOT EXISTS label text,
  ADD COLUMN IF NOT EXISTS furnishing_status text,
  ADD COLUMN IF NOT EXISTS bedroom_count numeric(3,1),
  ADD COLUMN IF NOT EXISTS bathroom_count numeric(3,1),
  ADD COLUMN IF NOT EXISTS bed_configuration text,
  ADD COLUMN IF NOT EXISTS maximum_occupancy integer,
  ADD COLUMN IF NOT EXISTS parking_notes text,
  ADD COLUMN IF NOT EXISTS wifi_secret_reference text,
  ADD COLUMN IF NOT EXISTS entry_secret_reference text,
  ADD COLUMN IF NOT EXISTS listing_links jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS photo_album_url text,
  ADD COLUMN IF NOT EXISTS known_quirks text,
  ADD COLUMN IF NOT EXISTS maintenance_notes text,
  ADD COLUMN IF NOT EXISTS cleaning_notes text,
  ADD COLUMN IF NOT EXISTS general_notes text,
  ADD COLUMN IF NOT EXISTS status_override_reason text,
  ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

UPDATE public.units
   SET operational_status = CASE status::text
     WHEN 'occupied' THEN 'occupied'
     WHEN 'rented' THEN 'occupied'
     WHEN 'planning' THEN 'under_renovation'
     WHEN 'storage' THEN 'offline'
     ELSE 'vacant_ready'
   END
 WHERE operational_status = 'vacant_ready';

CREATE TABLE IF NOT EXISTS public.reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_reservation_id text,
  guest_id uuid NOT NULL REFERENCES public.guests(id) ON DELETE RESTRICT,
  unit_id uuid NOT NULL REFERENCES public.units(id) ON DELETE RESTRICT,
  booking_source text NOT NULL DEFAULT 'direct'
    CHECK (booking_source IN (
      'airbnb', 'furnished_finder', 'vrbo', 'booking_com',
      'direct', 'long_term', 'lease', 'other'
    )),
  status text NOT NULL DEFAULT 'confirmed'
    CHECK (status IN (
      'inquiry', 'tentative', 'confirmed', 'checked_in', 'checked_out',
      'cancelled', 'no_show', 'extended'
    )),
  check_in_date date NOT NULL,
  check_in_time time NOT NULL DEFAULT '15:00',
  check_out_date date,
  check_out_time time NOT NULL DEFAULT '11:00',
  rate numeric(12,2),
  total_amount numeric(12,2),
  payment_status text NOT NULL DEFAULT 'unknown'
    CHECK (payment_status IN ('unknown', 'pending', 'partial', 'paid', 'overdue', 'refunded')),
  deposit_status text NOT NULL DEFAULT 'not_required'
    CHECK (deposit_status IN ('not_required', 'pending', 'held', 'returned', 'withheld')),
  guest_count integer CHECK (guest_count IS NULL OR guest_count > 0),
  pet_information text,
  vehicle_information text,
  booking_source_url text,
  special_notes text,
  cleaning_notes text,
  arrival_instructions_status text NOT NULL DEFAULT 'not_started'
    CHECK (arrival_instructions_status IN ('not_started', 'prepared', 'sent', 'not_required')),
  access_instructions_status text NOT NULL DEFAULT 'not_started'
    CHECK (access_instructions_status IN ('not_started', 'prepared', 'sent', 'not_required')),
  guest_communication_status text NOT NULL DEFAULT 'not_started'
    CHECK (guest_communication_status IN ('not_started', 'ready', 'sent_outside_app', 'not_required')),
  readiness_verified boolean NOT NULL DEFAULT false,
  responsible_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  source_system text NOT NULL DEFAULT 'homestead_helper',
  data_confidence text NOT NULL DEFAULT 'verified'
    CHECK (data_confidence IN ('verified', 'high', 'medium', 'low', 'conflict')),
  last_synchronized_at timestamptz,
  overlap_override boolean NOT NULL DEFAULT false,
  overlap_override_reason text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (check_out_date IS NULL OR check_out_date >= check_in_date),
  CHECK (NOT overlap_override OR nullif(trim(overlap_override_reason), '') IS NOT NULL)
);

CREATE UNIQUE INDEX IF NOT EXISTS reservations_source_external_unique
  ON public.reservations (booking_source, external_reservation_id)
  WHERE external_reservation_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS reservations_unit_dates_idx
  ON public.reservations (unit_id, check_in_date, check_out_date);
CREATE INDEX IF NOT EXISTS reservations_status_dates_idx
  ON public.reservations (status, check_in_date, check_out_date);

CREATE OR REPLACE FUNCTION public.prevent_reservation_overlap()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status NOT IN ('confirmed', 'checked_in', 'extended')
     OR NEW.check_out_date IS NULL
     OR NEW.overlap_override THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1
      FROM public.reservations r
     WHERE r.unit_id = NEW.unit_id
       AND r.id <> NEW.id
       AND r.status IN ('confirmed', 'checked_in', 'extended')
       AND r.check_out_date IS NOT NULL
       AND daterange(r.check_in_date, r.check_out_date, '[)')
           && daterange(NEW.check_in_date, NEW.check_out_date, '[)')
  ) THEN
    RAISE EXCEPTION 'This unit already has an overlapping confirmed reservation.'
      USING ERRCODE = '23P01';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS reservations_prevent_overlap ON public.reservations;
CREATE TRIGGER reservations_prevent_overlap
BEFORE INSERT OR UPDATE OF unit_id, status, check_in_date, check_out_date
ON public.reservations
FOR EACH ROW EXECUTE FUNCTION public.prevent_reservation_overlap();

CREATE TABLE IF NOT EXISTS public.vendors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  company text,
  trade text NOT NULL,
  phone text,
  email text,
  preferred_contact_method text NOT NULL DEFAULT 'phone'
    CHECK (preferred_contact_method IN ('phone', 'email', 'text')),
  emergency_availability boolean NOT NULL DEFAULT false,
  service_area text,
  active boolean NOT NULL DEFAULT true,
  vendor_rank text NOT NULL DEFAULT 'primary'
    CHECK (vendor_rank IN ('primary', 'backup')),
  typical_response_time text,
  typical_pricing_notes text,
  known_units text,
  last_used_date date,
  insurance_licensing_notes text,
  quickbooks_vendor_reference text,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS vendors_active_trade_rank_unique
  ON public.vendors (lower(trade), vendor_rank)
  WHERE active = true;

ALTER TABLE public.maintenance_requests
  ADD COLUMN IF NOT EXISTS reservation_id uuid REFERENCES public.reservations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS vendor_id uuid REFERENCES public.vendors(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'routine'
    CHECK (priority IN ('emergency', 'urgent', 'routine', 'preventive')),
  ADD COLUMN IF NOT EXISTS emergency boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS troubleshooting_performed text,
  ADD COLUMN IF NOT EXISTS estimated_cost numeric(12,2),
  ADD COLUMN IF NOT EXISTS actual_cost numeric(12,2),
  ADD COLUMN IF NOT EXISTS approval_required boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'not_required'
    CHECK (approval_status IN ('not_required', 'pending', 'approved', 'denied', 'emergency_override')),
  ADD COLUMN IF NOT EXISTS scheduled_date timestamptz,
  ADD COLUMN IF NOT EXISTS vendor_contacted_at timestamptz,
  ADD COLUMN IF NOT EXISTS completion_notes text,
  ADD COLUMN IF NOT EXISTS completion_photo_urls text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS verified_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS verified_at timestamptz;

CREATE TABLE IF NOT EXISTS public.cleaning_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id uuid NOT NULL REFERENCES public.units(id) ON DELETE RESTRICT,
  departing_reservation_id uuid NOT NULL REFERENCES public.reservations(id) ON DELETE CASCADE,
  next_reservation_id uuid REFERENCES public.reservations(id) ON DELETE SET NULL,
  assigned_cleaner_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_cleaner_name text,
  assigned_cleaner_email text,
  checkout_at timestamptz NOT NULL,
  next_check_in_at timestamptz,
  cleaning_deadline timestamptz NOT NULL,
  scheduled_for timestamptz,
  status text NOT NULL DEFAULT 'needs_scheduling'
    CHECK (status IN (
      'needs_scheduling', 'awaiting_confirmation', 'confirmed', 'in_progress',
      'completed', 'readiness_verification_required', 'ready',
      'cleaner_declined', 'overdue', 'cancelled'
    )),
  confirmation_status text NOT NULL DEFAULT 'not_requested'
    CHECK (confirmation_status IN ('not_requested', 'pending', 'confirmed', 'declined')),
  confirmed_at timestamptz,
  declined_at timestamptz,
  special_notes text,
  pet_notes text,
  linen_notes text,
  supply_notes text,
  supplies_needed text,
  damage_found text,
  maintenance_issue_found text,
  completion_notes text,
  completion_photo_urls text[] NOT NULL DEFAULT '{}',
  completed_at timestamptz,
  readiness_verification_status text NOT NULL DEFAULT 'not_required'
    CHECK (readiness_verification_status IN ('not_required', 'required', 'passed', 'failed')),
  readiness_checklist jsonb NOT NULL DEFAULT '{}'::jsonb,
  verified_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  verified_at timestamptz,
  google_calendar_event_id text,
  calendar_sync_status text NOT NULL DEFAULT 'disabled'
    CHECK (calendar_sync_status IN ('disabled', 'pending', 'synced', 'failed')),
  notification_history jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (departing_reservation_id)
);

CREATE INDEX IF NOT EXISTS cleaning_tasks_action_idx
  ON public.cleaning_tasks (status, cleaning_deadline);
CREATE INDEX IF NOT EXISTS cleaning_tasks_cleaner_idx
  ON public.cleaning_tasks (assigned_cleaner_user_id, status);

CREATE TABLE IF NOT EXISTS public.operational_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  unit_id uuid REFERENCES public.units(id) ON DELETE SET NULL,
  reservation_id uuid REFERENCES public.reservations(id) ON DELETE SET NULL,
  guest_id uuid REFERENCES public.guests(id) ON DELETE SET NULL,
  cleaning_task_id uuid REFERENCES public.cleaning_tasks(id) ON DELETE SET NULL,
  maintenance_request_id uuid REFERENCES public.maintenance_requests(id) ON DELETE SET NULL,
  assigned_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  due_at timestamptz,
  priority text NOT NULL DEFAULT 'routine'
    CHECK (priority IN ('emergency', 'urgent', 'routine', 'low')),
  status text NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'assigned', 'in_progress', 'waiting', 'completed', 'cancelled', 'overdue')),
  approval_required boolean NOT NULL DEFAULT false,
  notes text,
  attachment_urls text[] NOT NULL DEFAULT '{}',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS operational_tasks_dashboard_idx
  ON public.operational_tasks (status, priority, due_at);
CREATE UNIQUE INDEX IF NOT EXISTS operational_tasks_cleaning_followup_unique
  ON public.operational_tasks (cleaning_task_id, title)
  WHERE cleaning_task_id IS NOT NULL AND status <> 'cancelled';

CREATE TABLE IF NOT EXISTS public.checklist_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_type text NOT NULL CHECK (checklist_type IN ('morning', 'end_of_day', 'weekly')),
  checklist_date date NOT NULL DEFAULT current_date,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT DEFAULT auth.uid(),
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  completed_at timestamptz,
  escalation_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (checklist_type, checklist_date, user_id)
);

CREATE TABLE IF NOT EXISTS public.approval_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL UNIQUE CHECK (category IN (
    'maintenance', 'emergency_maintenance', 'refund', 'guest_discount',
    'supply_purchase', 'vendor_change', 'capital_improvement',
    'reservation_exception', 'unit_pricing_exception'
  )),
  threshold_amount numeric(12,2),
  enabled boolean NOT NULL DEFAULT false,
  emergency_override_allowed boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.approval_rules (
  category,
  threshold_amount,
  enabled,
  emergency_override_allowed
)
VALUES
  ('maintenance', 250.00, true, false),
  ('emergency_maintenance', 500.00, true, true),
  ('refund', 0.00, true, false),
  ('guest_discount', 0.00, true, false),
  ('supply_purchase', 250.00, true, false),
  ('vendor_change', 0.00, true, false),
  ('capital_improvement', 0.00, true, false),
  ('reservation_exception', 0.00, true, false),
  ('unit_pricing_exception', 0.00, true, false)
ON CONFLICT (category) DO UPDATE
SET threshold_amount = EXCLUDED.threshold_amount,
    enabled = EXCLUDED.enabled,
    emergency_override_allowed = EXCLUDED.emergency_override_allowed,
    updated_at = now();

CREATE TABLE IF NOT EXISTS public.approval_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  record_type text NOT NULL,
  record_id uuid NOT NULL,
  amount numeric(12,2),
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'denied', 'emergency_override')),
  requested_by uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  decided_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  decision_reason text,
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS approval_requests_pending_idx
  ON public.approval_requests (status, created_at);
CREATE UNIQUE INDEX IF NOT EXISTS approval_requests_one_pending_per_record
  ON public.approval_requests (record_type, record_id, category)
  WHERE status = 'pending';

CREATE TABLE IF NOT EXISTS public.activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_label text,
  action text NOT NULL,
  record_type text NOT NULL,
  record_id text NOT NULL,
  prior_value jsonb,
  new_value jsonb,
  source text NOT NULL DEFAULT 'user',
  session_metadata jsonb,
  automation_name text,
  error_details text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS activity_log_record_idx
  ON public.activity_log (record_type, record_id, created_at DESC);
CREATE INDEX IF NOT EXISTS activity_log_created_idx
  ON public.activity_log (created_at DESC);

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  recipient_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  recipient_address text,
  channel text NOT NULL CHECK (channel IN ('in_app', 'email', 'sms', 'webhook')),
  template_key text NOT NULL,
  scheduled_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  delivery_status text NOT NULL DEFAULT 'pending'
    CHECK (delivery_status IN ('pending', 'sending', 'sent', 'temporary_failure', 'permanent_failure', 'cancelled', 'disabled')),
  failure_reason text,
  retry_count integer NOT NULL DEFAULT 0,
  related_record_type text,
  related_record_id uuid,
  idempotency_key text NOT NULL UNIQUE,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notifications_delivery_idx
  ON public.notifications (delivery_status, scheduled_at);

CREATE TABLE IF NOT EXISTS public.automation_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  record_id uuid,
  source text NOT NULL DEFAULT 'homestead_helper',
  idempotency_key text NOT NULL UNIQUE,
  version integer NOT NULL DEFAULT 1,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.cleaner_access_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cleaning_task_id uuid NOT NULL REFERENCES public.cleaning_tasks(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  allowed_actions text[] NOT NULL DEFAULT ARRAY['view', 'confirm', 'decline', 'start', 'complete', 'upload_url'],
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  revoked_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.import_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_name text NOT NULL,
  source_format text NOT NULL CHECK (source_format IN ('csv', 'json')),
  confidence text NOT NULL DEFAULT 'medium'
    CHECK (confidence IN ('verified', 'high', 'medium', 'low')),
  status text NOT NULL DEFAULT 'preview'
    CHECK (status IN ('preview', 'confirmed', 'completed', 'failed', 'cancelled')),
  preview jsonb NOT NULL DEFAULT '{}'::jsonb,
  error_report jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  confirmed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'cleaning-photos',
  'cleaning-photos',
  false,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE POLICY "Operations staff read cleaning photos"
ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'cleaning-photos'
  AND public.has_any_role(ARRAY['admin','property_manager','cleaner'])
);

CREATE POLICY "Operations staff upload cleaning photos"
ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'cleaning-photos'
  AND public.has_any_role(ARRAY['admin','property_manager','cleaner'])
);

CREATE OR REPLACE FUNCTION public.sync_cleaning_task_for_reservation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_next public.reservations;
  v_checkout timestamptz;
  v_next_checkin timestamptz;
  v_cleaning_task_id uuid;
BEGIN
  IF NEW.status = 'cancelled' THEN
    UPDATE public.cleaning_tasks
       SET status = 'cancelled', updated_at = now()
     WHERE departing_reservation_id = NEW.id
       AND status NOT IN ('completed', 'ready');
    RETURN NEW;
  END IF;

  IF NEW.check_out_date IS NULL
     OR NEW.status NOT IN ('confirmed', 'checked_in', 'checked_out', 'extended') THEN
    RETURN NEW;
  END IF;

  SELECT *
    INTO v_next
    FROM public.reservations r
   WHERE r.unit_id = NEW.unit_id
     AND r.id <> NEW.id
     AND r.status IN ('confirmed', 'checked_in', 'extended')
     AND r.check_in_date >= NEW.check_out_date
   ORDER BY r.check_in_date, r.check_in_time
   LIMIT 1;

  v_checkout := (NEW.check_out_date + NEW.check_out_time) AT TIME ZONE 'America/New_York';
  IF v_next.id IS NOT NULL THEN
    v_next_checkin := (v_next.check_in_date + v_next.check_in_time) AT TIME ZONE 'America/New_York';
  END IF;

  INSERT INTO public.cleaning_tasks (
    unit_id,
    departing_reservation_id,
    next_reservation_id,
    checkout_at,
    next_check_in_at,
    cleaning_deadline,
    special_notes,
    updated_by
  ) VALUES (
    NEW.unit_id,
    NEW.id,
    v_next.id,
    v_checkout,
    v_next_checkin,
    coalesce(v_next_checkin, v_checkout + interval '24 hours'),
    NEW.cleaning_notes,
    auth.uid()
  )
  ON CONFLICT (departing_reservation_id) DO UPDATE SET
    unit_id = EXCLUDED.unit_id,
    next_reservation_id = EXCLUDED.next_reservation_id,
    checkout_at = EXCLUDED.checkout_at,
    next_check_in_at = EXCLUDED.next_check_in_at,
    cleaning_deadline = EXCLUDED.cleaning_deadline,
    special_notes = EXCLUDED.special_notes,
    updated_by = auth.uid(),
    updated_at = now(),
    status = CASE
      WHEN public.cleaning_tasks.status IN ('ready', 'completed') THEN public.cleaning_tasks.status
      ELSE public.cleaning_tasks.status
    END
  RETURNING id INTO v_cleaning_task_id;

  INSERT INTO public.notifications (
    event_type,
    channel,
    template_key,
    delivery_status,
    sent_at,
    related_record_type,
    related_record_id,
    idempotency_key,
    payload
  ) VALUES (
    'cleaning_required',
    'in_app',
    'cleaning_required_v1',
    'sent',
    now(),
    'cleaning_task',
    v_cleaning_task_id,
    'cleaning.required:' || v_cleaning_task_id::text,
    jsonb_build_object('unit_id', NEW.unit_id, 'cleaning_task_id', v_cleaning_task_id)
  )
  ON CONFLICT (idempotency_key) DO UPDATE SET
    payload = EXCLUDED.payload,
    sent_at = coalesce(public.notifications.sent_at, now()),
    updated_at = now();

  INSERT INTO public.automation_events (
    event_type, record_id, idempotency_key, payload
  ) VALUES (
    'cleaning.created',
    v_cleaning_task_id,
    'cleaning.created:' || v_cleaning_task_id::text,
    jsonb_build_object(
      'cleaning_task_id', v_cleaning_task_id,
      'unit_id', NEW.unit_id,
      'departing_reservation_id', NEW.id,
      'version', 1
    )
  )
  ON CONFLICT (idempotency_key) DO NOTHING;

  IF NEW.status = 'checked_out' THEN
    UPDATE public.units
       SET operational_status = 'vacant_dirty',
           updated_by = auth.uid(),
           updated_at = now()
     WHERE id = NEW.unit_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS reservations_sync_cleaning ON public.reservations;
CREATE TRIGGER reservations_sync_cleaning
AFTER INSERT OR UPDATE OF status, unit_id, check_in_date, check_in_time, check_out_date, check_out_time, cleaning_notes
ON public.reservations
FOR EACH ROW EXECUTE FUNCTION public.sync_cleaning_task_for_reservation();

CREATE OR REPLACE FUNCTION public.apply_cleaning_status_transition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status IS DISTINCT FROM NEW.status THEN
    NEW.completed_at := coalesce(NEW.completed_at, now());
    NEW.status := 'readiness_verification_required';
    NEW.readiness_verification_status := 'required';
    UPDATE public.units
       SET operational_status = 'vacant_dirty',
           updated_by = auth.uid(),
           updated_at = now()
     WHERE id = NEW.unit_id;

    IF nullif(trim(coalesce(NEW.supplies_needed, '')), '') IS NOT NULL THEN
      INSERT INTO public.operational_tasks (
        title, description, unit_id, cleaning_task_id, priority, status
      ) VALUES (
        'Restock supplies after cleaning',
        NEW.supplies_needed,
        NEW.unit_id,
        NEW.id,
        'urgent',
        'new'
      )
      ON CONFLICT (cleaning_task_id, title)
        WHERE cleaning_task_id IS NOT NULL AND status <> 'cancelled'
      DO UPDATE SET description = EXCLUDED.description, updated_at = now();
    END IF;

    IF nullif(trim(coalesce(NEW.damage_found, '')), '') IS NOT NULL
       OR nullif(trim(coalesce(NEW.maintenance_issue_found, '')), '') IS NOT NULL THEN
      INSERT INTO public.operational_tasks (
        title, description, unit_id, cleaning_task_id, priority, status
      ) VALUES (
        'Review cleaner-reported damage or maintenance',
        concat_ws(E'\n', NEW.damage_found, NEW.maintenance_issue_found),
        NEW.unit_id,
        NEW.id,
        'urgent',
        'new'
      )
      ON CONFLICT (cleaning_task_id, title)
        WHERE cleaning_task_id IS NOT NULL AND status <> 'cancelled'
      DO UPDATE SET description = EXCLUDED.description, updated_at = now();
    END IF;
  ELSIF NEW.status = 'ready' AND OLD.status IS DISTINCT FROM NEW.status THEN
    IF NEW.readiness_verification_status <> 'passed' THEN
      RAISE EXCEPTION 'Readiness verification must pass before a unit is marked ready.';
    END IF;
    NEW.verified_at := coalesce(NEW.verified_at, now());
    NEW.verified_by := coalesce(NEW.verified_by, auth.uid());
    UPDATE public.units
       SET operational_status = CASE
         WHEN EXISTS (
           SELECT 1 FROM public.reservations r
            WHERE r.unit_id = NEW.unit_id
              AND r.status = 'checked_in'
         ) THEN 'occupied'
         ELSE 'vacant_ready'
       END,
       updated_by = auth.uid(),
       updated_at = now()
     WHERE id = NEW.unit_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.apply_maintenance_approval_threshold()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rule public.approval_rules;
  v_category text;
  v_approval_id uuid;
BEGIN
  v_category := CASE WHEN NEW.emergency THEN 'emergency_maintenance' ELSE 'maintenance' END;
  SELECT * INTO v_rule
    FROM public.approval_rules
   WHERE category = v_category
     AND enabled = true;

  IF v_rule.id IS NOT NULL
     AND v_rule.threshold_amount IS NOT NULL
     AND coalesce(NEW.estimated_cost, 0) > v_rule.threshold_amount THEN
    NEW.approval_required := true;
    IF NEW.approval_status = 'not_required' THEN NEW.approval_status := 'pending'; END IF;

    INSERT INTO public.approval_requests (
      category, record_type, record_id, amount, reason, status, requested_by
    ) VALUES (
      v_category,
      'maintenance_request',
      NEW.id,
      NEW.estimated_cost,
      'Estimated maintenance cost exceeds the configured owner-approval threshold.',
      'pending',
      auth.uid()
    )
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_approval_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS maintenance_approval_threshold ON public.maintenance_requests;
CREATE TRIGGER maintenance_approval_threshold
BEFORE INSERT OR UPDATE OF estimated_cost, emergency
ON public.maintenance_requests
FOR EACH ROW EXECUTE FUNCTION public.apply_maintenance_approval_threshold();

DROP TRIGGER IF EXISTS cleaning_status_transition ON public.cleaning_tasks;
CREATE TRIGGER cleaning_status_transition
BEFORE UPDATE OF status ON public.cleaning_tasks
FOR EACH ROW EXECUTE FUNCTION public.apply_cleaning_status_transition();

CREATE OR REPLACE FUNCTION public.log_operational_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_record_id text;
  v_action text;
  v_prior jsonb;
  v_new jsonb;
BEGIN
  v_record_id := coalesce(NEW.id, OLD.id)::text;
  v_action := lower(TG_TABLE_NAME) || '.' || lower(TG_OP);

  IF TG_OP = 'DELETE' THEN
    v_prior := jsonb_build_object('status', to_jsonb(OLD)->'status');
  ELSIF TG_OP = 'INSERT' THEN
    v_new := jsonb_build_object('status', to_jsonb(NEW)->'status');
  ELSE
    v_prior := jsonb_build_object('status', to_jsonb(OLD)->'status');
    v_new := jsonb_build_object('status', to_jsonb(NEW)->'status');
  END IF;

  INSERT INTO public.activity_log (
    actor_user_id, action, record_type, record_id, prior_value, new_value, source
  ) VALUES (
    auth.uid(), v_action, TG_TABLE_NAME, v_record_id, v_prior, v_new,
    CASE WHEN auth.uid() IS NULL THEN 'automation' ELSE 'user' END
  );
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DO $$
DECLARE
  v_table text;
BEGIN
  FOREACH v_table IN ARRAY ARRAY[
    'reservations', 'cleaning_tasks', 'operational_tasks',
    'approval_requests', 'notifications'
  ]
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I_activity_log ON public.%I', v_table, v_table);
    EXECUTE format(
      'CREATE TRIGGER %I_activity_log AFTER INSERT OR UPDATE OR DELETE ON public.%I
       FOR EACH ROW EXECUTE FUNCTION public.log_operational_change()',
      v_table, v_table
    );
  END LOOP;
END;
$$;

-- Standard updated_at triggers.
DO $$
DECLARE
  v_table text;
BEGIN
  FOREACH v_table IN ARRAY ARRAY[
    'reservations', 'vendors', 'cleaning_tasks', 'operational_tasks',
    'checklist_runs', 'approval_rules', 'approval_requests', 'notifications'
  ]
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I_updated_at ON public.%I', v_table, v_table);
    EXECUTE format(
      'CREATE TRIGGER %I_updated_at BEFORE UPDATE ON public.%I
       FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()',
      v_table, v_table
    );
  END LOOP;
END;
$$;

-- Bring active legacy stays into the operational calendar once. The original
-- guest rows remain authoritative for payments and are linked, not copied.
INSERT INTO public.reservations (
  external_reservation_id,
  guest_id,
  unit_id,
  booking_source,
  status,
  check_in_date,
  check_out_date,
  rate,
  payment_status,
  source_system,
  data_confidence
)
SELECT
  'legacy:' || g.id::text,
  g.id,
  g.unit_id,
  CASE g.source::text
    WHEN 'airbnb' THEN 'airbnb'
    WHEN 'furnished_finder' THEN 'furnished_finder'
    WHEN 'direct' THEN 'direct'
    WHEN 'long_term' THEN 'long_term'
    WHEN 'lease' THEN 'lease'
    ELSE 'other'
  END,
  CASE WHEN g.is_current THEN 'checked_in' ELSE 'confirmed' END,
  g.check_in,
  g.check_out,
  g.monthly_rate,
  'unknown',
  'legacy_host_hub',
  'verified'
FROM public.guests g
WHERE (g.check_out IS NULL OR g.check_out >= current_date)
ON CONFLICT (booking_source, external_reservation_id)
  WHERE external_reservation_id IS NOT NULL
DO NOTHING;

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
  IF _check_out_date IS NULL OR _check_out_date < _check_in_date THEN
    RAISE EXCEPTION 'A valid checkout date is required.';
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
    is_current, record_type, user_id
  ) VALUES (
    _unit_id, trim(_guest_name), nullif(trim(_guest_phone), ''),
    nullif(lower(trim(_guest_email)), ''), v_legacy_source,
    _check_in_date, _check_out_date, false, 'guest', auth.uid()
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

CREATE OR REPLACE FUNCTION public.decide_approval_request(
  _approval_request_id uuid,
  _decision text,
  _decision_reason text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request public.approval_requests;
BEGIN
  IF NOT public.has_any_role(ARRAY['admin']) THEN
    RAISE EXCEPTION 'Owner access is required.';
  END IF;
  IF _decision NOT IN ('approved', 'denied', 'emergency_override') THEN
    RAISE EXCEPTION 'Invalid approval decision.';
  END IF;
  IF _decision IN ('denied', 'emergency_override')
     AND nullif(trim(coalesce(_decision_reason, '')), '') IS NULL THEN
    RAISE EXCEPTION 'A reason is required for denial or emergency override.';
  END IF;

  UPDATE public.approval_requests
     SET status = _decision,
         decision_reason = nullif(trim(coalesce(_decision_reason, '')), ''),
         decided_by = auth.uid(),
         decided_at = now(),
         updated_at = now()
   WHERE id = _approval_request_id
     AND status = 'pending'
  RETURNING * INTO v_request;

  IF v_request.id IS NULL THEN RETURN false; END IF;

  IF v_request.record_type = 'maintenance_request' THEN
    UPDATE public.maintenance_requests
       SET approval_status = _decision
     WHERE id = v_request.record_id;
  END IF;
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.decide_approval_request(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.decide_approval_request(uuid, text, text) TO authenticated;

-- RLS: owner/admin and property manager operate the system. Cleaner accounts
-- can only read and update their assigned cleaning tasks. Anonymous cleaner
-- links are handled by a narrowly scoped Edge Function, never by table access.
DO $$
DECLARE
  v_table text;
BEGIN
  FOREACH v_table IN ARRAY ARRAY[
    'reservations', 'vendors', 'cleaning_tasks', 'operational_tasks',
    'checklist_runs', 'approval_rules', 'approval_requests', 'activity_log',
    'notifications', 'automation_events', 'cleaner_access_tokens', 'import_runs'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', v_table);
  END LOOP;
END;
$$;

DO $$
DECLARE
  v_table text;
BEGIN
  FOREACH v_table IN ARRAY ARRAY[
    'reservations', 'vendors', 'cleaning_tasks', 'operational_tasks',
    'checklist_runs', 'activity_log',
    'notifications', 'automation_events', 'import_runs'
  ]
  LOOP
    EXECUTE format(
      'CREATE POLICY "Operations staff manage %1$s" ON public.%1$I
       FOR ALL TO authenticated
       USING (public.has_any_role(ARRAY[''admin'',''property_manager'']))
       WITH CHECK (public.has_any_role(ARRAY[''admin'',''property_manager'']))',
      v_table
    );
  END LOOP;
END;
$$;

CREATE POLICY "Owners manage approval requests"
ON public.approval_requests
FOR ALL TO authenticated
USING (public.has_any_role(ARRAY['admin']))
WITH CHECK (public.has_any_role(ARRAY['admin']));

CREATE POLICY "Property managers create pending approvals"
ON public.approval_requests
FOR INSERT TO authenticated
WITH CHECK (
  public.has_any_role(ARRAY['property_manager'])
  AND status = 'pending'
  AND decided_by IS NULL
  AND decided_at IS NULL
);

CREATE POLICY "Property managers read approval requests"
ON public.approval_requests
FOR SELECT TO authenticated
USING (public.has_any_role(ARRAY['property_manager']));

CREATE POLICY "Owners manage approval rules"
ON public.approval_rules
FOR ALL TO authenticated
USING (public.has_any_role(ARRAY['admin']))
WITH CHECK (public.has_any_role(ARRAY['admin']));

CREATE POLICY "Operations staff read approval rules"
ON public.approval_rules
FOR SELECT TO authenticated
USING (public.has_any_role(ARRAY['admin','property_manager']));

CREATE POLICY "Owners manage cleaner access tokens"
ON public.cleaner_access_tokens
FOR ALL TO authenticated
USING (public.has_any_role(ARRAY['admin','property_manager']))
WITH CHECK (public.has_any_role(ARRAY['admin','property_manager']));

CREATE POLICY "Cleaners read assigned cleaning tasks"
ON public.cleaning_tasks
FOR SELECT TO authenticated
USING (
  public.has_any_role(ARRAY['cleaner'])
  AND assigned_cleaner_user_id = auth.uid()
);

CREATE POLICY "Cleaners update assigned cleaning tasks"
ON public.cleaning_tasks
FOR UPDATE TO authenticated
USING (
  public.has_any_role(ARRAY['cleaner'])
  AND assigned_cleaner_user_id = auth.uid()
)
WITH CHECK (
  public.has_any_role(ARRAY['cleaner'])
  AND assigned_cleaner_user_id = auth.uid()
);

CREATE POLICY "Operations staff enrich guests"
ON public.guests
FOR ALL TO authenticated
USING (public.has_any_role(ARRAY['admin','property_manager']))
WITH CHECK (public.has_any_role(ARRAY['admin','property_manager']));

CREATE POLICY "Operations staff manage units"
ON public.units
FOR ALL TO authenticated
USING (public.has_any_role(ARRAY['admin','property_manager']))
WITH CHECK (public.has_any_role(ARRAY['admin','property_manager']));

-- Public maintenance photos are a legacy security risk. New reads require a
-- signed-in staff role; existing object URLs should be rotated after rollout.
DROP POLICY IF EXISTS "Maintenance photos public read" ON storage.objects;
CREATE POLICY "Maintenance photos staff read"
ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'maintenance-photos'
  AND public.has_any_role(ARRAY['admin','property_manager','maintenance'])
);

-- Property managers can use the existing maintenance module without receiving
-- owner-only access to finance screens.
CREATE POLICY "Property managers manage maintenance requests"
ON public.maintenance_requests
FOR ALL TO authenticated
USING (public.has_any_role(ARRAY['property_manager']))
WITH CHECK (public.has_any_role(ARRAY['property_manager']));

CREATE POLICY "Property managers manage maintenance updates"
ON public.maintenance_updates
FOR ALL TO authenticated
USING (public.has_any_role(ARRAY['property_manager']))
WITH CHECK (public.has_any_role(ARRAY['property_manager']));
