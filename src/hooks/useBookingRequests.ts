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

  const markApproved = useCallback(async (id: string, assignedUnitId: string, unitName: string) => {
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

    // Fire-and-forget approval email via the website's edge function.
    // The website project owns the Resend sender domain, so emails go out
    // branded as booking@homestead-hill.com. Failures here are logged
    // but never fail the approval itself.
    const request = requests.find(r => r.id === id);
    if (request) {
      fetch(
        'https://qihhgwslsjicjtrqvzsv.supabase.co/functions/v1/send-booking-approval-email',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: request.name,
            email: request.email,
            unit_name: unitName,
            check_in: request.check_in,
            check_out: request.check_out,
            num_guests: request.num_guests,
          }),
        }
      ).catch(err => console.error('Approval email send failed (non-fatal):', err));
    }

    return true;
  }, [requests]);

  const markDeclined = useCallback(async (id: string, reason?: string) => {
    const request = requests.find(r => r.id === id);
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

    // For stay-extension requests, fire a decline email via the website.
    if (request?.source === 'extension') {
      fetch(
        'https://qihhgwslsjicjtrqvzsv.supabase.co/functions/v1/send-extension-decline-email',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: request.name,
            email: request.email,
            check_in: request.check_in,
            check_out: request.check_out,
            reason: reason ?? null,
          }),
        }
      ).catch(err => console.error('Extension decline email failed (non-fatal):', err));
    }

    toast.success('Request declined');
    return true;
  }, [requests]);

  /**
   * Approves a stay-extension request.
   * Mirrors the extension block to the website's calendar_events table,
   * marks the booking_request as approved, and sends the confirmation email.
   * The CALLER is responsible for updating the local guests table
   * (extending check_out, or ending current + adding to sibling unit).
   */
  const approveExtension = useCallback(
    async (
      id: string,
      params: {
        unitId: string;
        unitName: string;
        unitSlug: string;
        startDate: string;
        endDate: string;
        amount: number;
      }
    ) => {
      const request = requests.find(r => r.id === id);
      if (!request) {
        toast.error('Request not found');
        return false;
      }

      // 1. Mirror to website calendar_events.
      try {
        const res = await fetch(
          'https://qihhgwslsjicjtrqvzsv.supabase.co/functions/v1/mirror-extension-block',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              booking_request_id: id,
              unit_slug: params.unitSlug,
              check_in: params.startDate,
              check_out: params.endDate,
              source: 'extension_approved',
              summary: `Extension — ${request.name}`,
            }),
          }
        );
        if (!res.ok) {
          const body = await res.text();
          throw new Error(`Mirror failed [${res.status}]: ${body}`);
        }
      } catch (err) {
        console.error('Failed to mirror extension block:', err);
        toast.error('Failed to mirror to website calendar — request not approved');
        return false;
      }

      // 2. Mark request approved.
      const { error: updateErr } = await supabase
        .from('booking_requests')
        .update({
          status: 'approved',
          assigned_unit_id: params.unitId,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (updateErr) {
        toast.error('Mirror succeeded but request status update failed');
        return false;
      }

      // 3. Fire-and-forget approval email.
      fetch(
        'https://qihhgwslsjicjtrqvzsv.supabase.co/functions/v1/send-extension-approval-email',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: request.name,
            email: request.email,
            unit_name: params.unitName,
            new_check_out: params.endDate,
            amount: params.amount,
          }),
        }
      ).catch(err => console.error('Extension approval email failed (non-fatal):', err));

      return true;
    },
    [requests]
  );

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

  return { requests, loading, pendingCount, markApproved, markDeclined, approveExtension, deleteRequest, refresh: fetchRequests };
}
