import { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { toast } from 'sonner';

export type MaintenanceRequest = Tables<'maintenance_requests'>;
export type MaintenanceStatus = MaintenanceRequest['status'];

export function useMaintenanceRequests() {
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRequests = useCallback(async () => {
    const { data, error } = await supabase
      .from('maintenance_requests')
      .select('*')
      .order('reported_at', { ascending: false });
    if (error) {
      console.error('Failed to load maintenance requests', error);
      toast.error('Failed to load maintenance requests');
    } else {
      setRequests(data ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchRequests();
    const channel = supabase
      .channel('maintenance_requests_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'maintenance_requests' },
        () => fetchRequests()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchRequests]);

  const createRequest = useCallback(
    async (input: {
      unit_id: string;
      title: string;
      description?: string;
      photo_url?: string;
      reporter_name?: string;
    }) => {
      const id = crypto.randomUUID();
      const { error } = await supabase.from('maintenance_requests').insert({
        id,
        unit_id: input.unit_id,
        title: input.title,
        description: input.description || null,
        photo_url: input.photo_url || null,
        reporter_name: input.reporter_name || null,
        status: 'new',
      });
      if (error) {
        console.error('Failed to create maintenance request', error);
        toast.error('Failed to log request');
        return false;
      }
      toast.success('Maintenance request logged');
      return true;
    },
    []
  );

  const updateRequest = useCallback(
    async (id: string, patch: Partial<MaintenanceRequest>) => {
      // If marking done, stamp completed_at
      const updates: Partial<MaintenanceRequest> = { ...patch };
      if (patch.status === 'done' && !patch.completed_at) {
        updates.completed_at = new Date().toISOString();
      }
      if (patch.status && patch.status !== 'done') {
        updates.completed_at = null;
      }
      const { error } = await supabase
        .from('maintenance_requests')
        .update(updates)
        .eq('id', id);
      if (error) {
        toast.error('Failed to update request');
        return false;
      }
      return true;
    },
    []
  );

  const deleteRequest = useCallback(async (id: string) => {
    const { error } = await supabase.from('maintenance_requests').delete().eq('id', id);
    if (error) {
      toast.error('Failed to delete request');
      return false;
    }
    toast.success('Request deleted');
    return true;
  }, []);

  const newCount = useMemo(() => requests.filter(r => r.status === 'new').length, [requests]);
  const openCount = useMemo(
    () => requests.filter(r => r.status === 'new' || r.status === 'in_progress').length,
    [requests]
  );

  const openByUnit = useMemo(() => {
    const map: Record<string, number> = {};
    for (const r of requests) {
      if (r.status === 'new' || r.status === 'in_progress') {
        map[r.unit_id] = (map[r.unit_id] ?? 0) + 1;
      }
    }
    return map;
  }, [requests]);

  return {
    requests,
    loading,
    newCount,
    openCount,
    openByUnit,
    createRequest,
    updateRequest,
    deleteRequest,
    refresh: fetchRequests,
  };
}
