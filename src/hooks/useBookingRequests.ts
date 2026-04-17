import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { toast } from 'sonner';

export type BookingRequest = Tables<'booking_requests'>;
export type BookingRequestStatus = BookingRequest['status'];

export function useBookingRequests() {
  const [requests, setRequests] = useState<BookingRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRequests = useCallback(async () => {
    const { data, error } = await supabase
      .from('booking_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to load booking requests', error);
      toast.error('Failed to load booking requests');
    } else {
      setRequests(data ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchRequests();

    const channel = supabase
      .channel('booking_requests_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'booking_requests' },
        () => {
          fetchRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchRequests]);

  const markApproved = useCallback(async (id: string, assignedUnitId: string) => {
    const { error } = await supabase
      .from('booking_requests')
      .update({
        status: 'approved',
        assigned_unit_id: assignedUnitId,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', id);
    if (error) {
      toast.error('Failed to update request');
      return false;
    }
    return true;
  }, []);

  const markDeclined = useCallback(async (id: string, reason?: string) => {
    const { error } = await supabase
      .from('booking_requests')
      .update({
        status: 'declined',
        decline_reason: reason ?? null,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', id);
    if (error) {
      toast.error('Failed to decline request');
      return false;
    }
    toast.success('Request declined');
    return true;
  }, []);

  const deleteRequest = useCallback(async (id: string) => {
    const { error } = await supabase.from('booking_requests').delete().eq('id', id);
    if (error) {
      toast.error('Failed to delete request');
      return false;
    }
    toast.success('Request deleted');
    return true;
  }, []);

  const pendingCount = requests.filter(r => r.status === 'pending').length;

  return { requests, loading, pendingCount, markApproved, markDeclined, deleteRequest, refresh: fetchRequests };
}
