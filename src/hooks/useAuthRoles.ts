import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getStoredLoginLane, type AppRole } from '@/lib/roleRouting';

// These role RPCs were added after the generated Supabase client types.
/* eslint-disable @typescript-eslint/no-explicit-any */
export function useAuthRoles(userId?: string) {
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(!!userId);

  useEffect(() => {
    let cancelled = false;

    const loadRoles = async () => {
      if (!userId) {
        setRoles([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        // Link any pre-seeded email roles after sign-in. Safe no-op if function is unavailable.
        await (supabase as any).rpc('link_pending_roles_for_current_user');

        const { data, error } = await (supabase as any)
          .from('user_roles')
          .select('role')
          .eq('user_id', userId)
          .eq('active', true);

        if (error) throw error;

        let nextRoles = ((data ?? []) as { role: AppRole }[])
          .map(row => row.role)
          .filter((role): role is AppRole => (
            role === 'admin'
            || role === 'property_manager'
            || role === 'maintenance'
            || role === 'cleaner'
          ));

        if (nextRoles.length === 0 && getStoredLoginLane() === 'property-manager') {
          const { error: claimError } = await (supabase as any).rpc('claim_admin_if_first');
          if (claimError) throw claimError;

          const { data: claimedData, error: claimedRolesError } = await (supabase as any)
            .from('user_roles')
            .select('role')
            .eq('user_id', userId)
            .eq('active', true);

          if (claimedRolesError) throw claimedRolesError;

          nextRoles = ((claimedData ?? []) as { role: AppRole }[])
            .map(row => row.role)
            .filter((role): role is AppRole => (
              role === 'admin'
              || role === 'property_manager'
              || role === 'maintenance'
              || role === 'cleaner'
            ));
        }

        if (!cancelled) setRoles(Array.from(new Set(nextRoles)));
      } catch (error) {
        console.error('Failed to load user roles', error);
        if (!cancelled) setRoles([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadRoles();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  return {
    roles,
    loading,
    isAdmin: roles.includes('admin'),
    isPropertyManager: roles.includes('property_manager'),
    isMaintenance: roles.includes('maintenance'),
    isCleaner: roles.includes('cleaner'),
  };
}
