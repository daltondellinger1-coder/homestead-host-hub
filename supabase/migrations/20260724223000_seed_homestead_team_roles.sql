-- Pre-authorize the named Homestead Helper team accounts. The existing
-- auth-user trigger attaches user_id when each account is created or signs up.
INSERT INTO public.user_roles (email, display_name, role, active)
SELECT 'booking@homestead-hill.com', 'Briana', 'admin'::public.app_role, true
WHERE NOT EXISTS (
  SELECT 1
  FROM public.user_roles
  WHERE lower(email) = 'booking@homestead-hill.com'
    AND role = 'admin'::public.app_role
    AND active = true
);

INSERT INTO public.user_roles (email, display_name, role, active)
SELECT 'Groves.wendy@gmail.com', 'Wendy', 'cleaner'::public.app_role, true
WHERE NOT EXISTS (
  SELECT 1
  FROM public.user_roles
  WHERE lower(email) = 'groves.wendy@gmail.com'
    AND role = 'cleaner'::public.app_role
    AND active = true
);
