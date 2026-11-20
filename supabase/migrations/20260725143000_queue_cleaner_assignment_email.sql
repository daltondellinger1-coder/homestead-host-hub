-- Queue one idempotent email plus calendar invitation whenever a cleaning is
-- assigned or its schedule changes. Delivery remains gated by the
-- OPERATIONS_DELIVERY_ENABLED Edge Function secret.

CREATE OR REPLACE FUNCTION public.queue_cleaner_assignment_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_unit_name text;
  v_signature text;
  v_subject text;
  v_text text;
BEGIN
  IF NEW.assigned_cleaner_email IS NULL
     OR btrim(NEW.assigned_cleaner_email) = ''
     OR NEW.status = 'cancelled' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE'
     AND OLD.assigned_cleaner_email IS NOT DISTINCT FROM NEW.assigned_cleaner_email
     AND OLD.assigned_cleaner_name IS NOT DISTINCT FROM NEW.assigned_cleaner_name
     AND OLD.checkout_at IS NOT DISTINCT FROM NEW.checkout_at
     AND OLD.cleaning_deadline IS NOT DISTINCT FROM NEW.cleaning_deadline
     AND OLD.next_check_in_at IS NOT DISTINCT FROM NEW.next_check_in_at
     AND OLD.special_notes IS NOT DISTINCT FROM NEW.special_notes THEN
    RETURN NEW;
  END IF;

  SELECT coalesce(u.name, u.label, 'Unit')
    INTO v_unit_name
    FROM public.units u
   WHERE u.id = NEW.unit_id;

  v_unit_name := coalesce(v_unit_name, 'Unit');
  v_signature := md5(concat_ws('|',
    lower(NEW.assigned_cleaner_email),
    coalesce(NEW.assigned_cleaner_name, ''),
    NEW.checkout_at::text,
    NEW.cleaning_deadline::text,
    coalesce(NEW.next_check_in_at::text, ''),
    coalesce(NEW.special_notes, '')
  ));
  v_subject := 'Cleaning assignment — ' || v_unit_name;
  v_text := concat_ws(E'\n',
    'Hi ' || coalesce(nullif(NEW.assigned_cleaner_name, ''), 'there') || ',',
    '',
    'You have a cleaning assignment for ' || v_unit_name || '.',
    'Checkout: ' || to_char(NEW.checkout_at AT TIME ZONE 'America/New_York', 'Mon FMDD, YYYY at FMHH12:MI AM'),
    'Cleaning deadline: ' || to_char(NEW.cleaning_deadline AT TIME ZONE 'America/New_York', 'Mon FMDD, YYYY at FMHH12:MI AM'),
    CASE WHEN NEW.next_check_in_at IS NOT NULL
      THEN 'Next check-in: ' || to_char(NEW.next_check_in_at AT TIME ZONE 'America/New_York', 'Mon FMDD, YYYY at FMHH12:MI AM')
      ELSE NULL END,
    CASE WHEN nullif(NEW.special_notes, '') IS NOT NULL
      THEN 'Notes: ' || NEW.special_notes
      ELSE NULL END,
    '',
    'A calendar invitation is attached. Accept it to add the cleaning to your Google Calendar.',
    'Open Homestead Helper: https://homestead-helper.daltondellinger1.chatgpt.site/cleaner',
    '',
    'Homestead Hill'
  );

  INSERT INTO public.notifications (
    event_type,
    recipient_user_id,
    recipient_address,
    channel,
    template_key,
    delivery_status,
    related_record_type,
    related_record_id,
    idempotency_key,
    payload
  ) VALUES (
    'cleaning_assigned',
    NEW.assigned_cleaner_user_id,
    lower(NEW.assigned_cleaner_email),
    'email',
    'cleaning_assignment_with_calendar_v1',
    'pending',
    'cleaning_task',
    NEW.id,
    'cleaning.assignment:' || NEW.id::text || ':' || v_signature,
    jsonb_build_object(
      'subject', v_subject,
      'text', v_text,
      'calendar', jsonb_build_object(
        'uid', 'cleaning-' || NEW.id::text || '@homestead-hill.com',
        'summary', 'Cleaning — ' || v_unit_name,
        'description', v_text,
        'startsAt', NEW.checkout_at,
        'endsAt', NEW.cleaning_deadline,
        'attendeeName', coalesce(NEW.assigned_cleaner_name, NEW.assigned_cleaner_email),
        'organizerEmail', 'booking@homestead-hill.com',
        'organizerName', 'Homestead Helper'
      )
    )
  )
  ON CONFLICT (idempotency_key) DO NOTHING;

  UPDATE public.cleaning_tasks
     SET calendar_sync_status = 'pending'
   WHERE id = NEW.id
     AND calendar_sync_status IS DISTINCT FROM 'pending';

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS cleaning_assignment_email_queue ON public.cleaning_tasks;
CREATE TRIGGER cleaning_assignment_email_queue
AFTER INSERT OR UPDATE OF
  assigned_cleaner_email,
  assigned_cleaner_name,
  checkout_at,
  cleaning_deadline,
  next_check_in_at,
  special_notes
ON public.cleaning_tasks
FOR EACH ROW
EXECUTE FUNCTION public.queue_cleaner_assignment_email();

-- Queue the current assignments without delivering them. The dispatcher gate
-- remains off until the sender domain and one canary are verified.
INSERT INTO public.notifications (
  event_type,
  recipient_user_id,
  recipient_address,
  channel,
  template_key,
  delivery_status,
  related_record_type,
  related_record_id,
  idempotency_key,
  payload
)
SELECT
  'cleaning_assigned',
  c.assigned_cleaner_user_id,
  lower(c.assigned_cleaner_email),
  'email',
  'cleaning_assignment_with_calendar_v1',
  'pending',
  'cleaning_task',
  c.id,
  'cleaning.assignment:' || c.id::text || ':' || md5(concat_ws('|',
    lower(c.assigned_cleaner_email),
    coalesce(c.assigned_cleaner_name, ''),
    c.checkout_at::text,
    c.cleaning_deadline::text,
    coalesce(c.next_check_in_at::text, ''),
    coalesce(c.special_notes, '')
  )),
  jsonb_build_object(
    'subject', 'Cleaning assignment — ' || coalesce(u.name, u.label, 'Unit'),
    'text', concat_ws(E'\n',
      'Hi ' || coalesce(nullif(c.assigned_cleaner_name, ''), 'there') || ',',
      '',
      'You have a cleaning assignment for ' || coalesce(u.name, u.label, 'Unit') || '.',
      'Checkout: ' || to_char(c.checkout_at AT TIME ZONE 'America/New_York', 'Mon FMDD, YYYY at FMHH12:MI AM'),
      'Cleaning deadline: ' || to_char(c.cleaning_deadline AT TIME ZONE 'America/New_York', 'Mon FMDD, YYYY at FMHH12:MI AM'),
      CASE WHEN c.next_check_in_at IS NOT NULL
        THEN 'Next check-in: ' || to_char(c.next_check_in_at AT TIME ZONE 'America/New_York', 'Mon FMDD, YYYY at FMHH12:MI AM')
        ELSE NULL END,
      CASE WHEN nullif(c.special_notes, '') IS NOT NULL
        THEN 'Notes: ' || c.special_notes
        ELSE NULL END,
      '',
      'A calendar invitation is attached. Accept it to add the cleaning to your Google Calendar.',
      'Open Homestead Helper: https://homestead-helper.daltondellinger1.chatgpt.site/cleaner',
      '',
      'Homestead Hill'
    ),
    'calendar', jsonb_build_object(
      'uid', 'cleaning-' || c.id::text || '@homestead-hill.com',
      'summary', 'Cleaning — ' || coalesce(u.name, u.label, 'Unit'),
      'description', 'Cleaning assignment for ' || coalesce(u.name, u.label, 'Unit'),
      'startsAt', c.checkout_at,
      'endsAt', c.cleaning_deadline,
      'attendeeName', coalesce(c.assigned_cleaner_name, c.assigned_cleaner_email),
      'organizerEmail', 'booking@homestead-hill.com',
      'organizerName', 'Homestead Helper'
    )
  )
FROM public.cleaning_tasks c
JOIN public.units u ON u.id = c.unit_id
WHERE c.assigned_cleaner_email IS NOT NULL
  AND btrim(c.assigned_cleaner_email) <> ''
  AND c.status <> 'cancelled'
ON CONFLICT (idempotency_key) DO NOTHING;

UPDATE public.cleaning_tasks
   SET calendar_sync_status = 'pending'
 WHERE assigned_cleaner_email IS NOT NULL
   AND btrim(assigned_cleaner_email) <> ''
   AND status <> 'cancelled';
