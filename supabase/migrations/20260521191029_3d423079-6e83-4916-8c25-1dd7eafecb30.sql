
ALTER TYPE public.maintenance_status ADD VALUE IF NOT EXISTS 'assigned';
ALTER TYPE public.maintenance_status ADD VALUE IF NOT EXISTS 'waiting_on_tenant';
ALTER TYPE public.maintenance_status ADD VALUE IF NOT EXISTS 'waiting_on_parts';
ALTER TYPE public.maintenance_status ADD VALUE IF NOT EXISTS 'completed';
ALTER TYPE public.maintenance_status ADD VALUE IF NOT EXISTS 'closed_verified';
