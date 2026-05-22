
INSERT INTO public.user_roles (user_id, email, role, display_name, active)
SELECT u.id, u.email, 'admin'::app_role, split_part(u.email, '@', 1), true
FROM auth.users u
WHERE u.email IN ('booking@homestead-hill.com', 'test@homesteadhill.com', 'dalton@wefliphouses.com')
ON CONFLICT (user_id, role) DO UPDATE SET active = true, email = EXCLUDED.email;

-- Pre-seed dalton's admin role (will link when he first signs in via handle_new_user_link_roles)
INSERT INTO public.user_roles (user_id, email, role, display_name, active)
VALUES (NULL, 'dalton@wefliphouses.com', 'admin', 'dalton', true)
ON CONFLICT DO NOTHING;
