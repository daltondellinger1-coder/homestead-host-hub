create or replace function public.get_internal_function_key() returns text language sql security definer set search_path = '' stable as $$ select decrypted_secret from vault.decrypted_secrets where name = 'internal_function_key' order by created_at desc limit 1 $$;
revoke all on function public.get_internal_function_key() from public, anon, authenticated;
grant execute on function public.get_internal_function_key() to service_role;
