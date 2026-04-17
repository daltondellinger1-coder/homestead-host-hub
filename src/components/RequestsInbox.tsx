import { useState } from 'react';
import { useBookingRequests, BookingRequest, BookingRequestStatus } from '@/hooks/useBookingRequests';
import RequestCard from '@/components/RequestCard';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Inbox } from 'lucide-react';
import { Unit } from '@/types/property';

interface RequestsInboxProps {
  units: Unit[];
  onApprove: (request: BookingRequest) => void;
}

export default function RequestsInbox({ units, onApprove }: RequestsInboxProps) {
  const { requests, loading, markDeclined, deleteRequest, pendingCount } = useBookingRequests();
  const [tab, setTab] = useState<BookingRequestStatus>('pending');

  const filtered = requests.filter(r => r.status === tab);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-muted-foreground font-body text-sm animate-pulse">Loading requests...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-base font-semibold">Booking Requests</h2>
        <span className="text-xs font-body text-muted-foreground">
          {pendingCount} pending
        </span>
      </div>

      <Tabs value={tab} onValueChange={v => setTab(v as BookingRequestStatus)}>
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="pending" className="font-body text-xs">
            Pending {pendingCount > 0 && <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-secondary text-background text-[10px] font-semibold">{pendingCount}</span>}
          </TabsTrigger>
          <TabsTrigger value="approved" className="font-body text-xs">Approved</TabsTrigger>
          <TabsTrigger value="declined" className="font-body text-xs">Declined</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-4 space-y-3">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center space-y-2">
              <div className="p-3 rounded-2xl bg-muted/30">
                <Inbox className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground font-body">
                {tab === 'pending' && 'No new booking requests'}
                {tab === 'approved' && 'No approved requests yet'}
                {tab === 'declined' && 'No declined requests'}
              </p>
              {tab === 'pending' && (
                <p className="text-xs text-muted-foreground/70 font-body max-w-xs">
                  Requests from homestead-hill.com will land here.
                </p>
              )}
            </div>
          ) : (
            filtered.map(req => (
              <RequestCard
                key={req.id}
                request={req}
                units={units}
                onApprove={onApprove}
                onDecline={markDeclined}
                onDelete={deleteRequest}
              />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
