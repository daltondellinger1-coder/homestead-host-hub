import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Mail,
  Phone,
  CalendarDays,
  Users,
  StickyNote,
  Check,
  X,
  Trash2,
  Home,
  AlertCircle,
} from 'lucide-react';
import { BookingRequest } from '@/hooks/useBookingRequests';
import { AirbnbBlock } from '@/hooks/useAirbnbBlocks';
import { Unit, UNIT_TYPE_LABELS, SOURCE_LABELS } from '@/types/property';
import { cn } from '@/lib/utils';

interface RequestCardProps {
  request: BookingRequest;
  units: Unit[];
  onApprove: (request: BookingRequest) => void;
  onDecline: (id: string, reason?: string) => void;
  onDelete: (id: string) => void;
  airbnbBlocksByUnit?: Map<string, AirbnbBlock[]>;
}

function formatDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getNights(ci: string, co: string) {
  const a = new Date(ci + 'T00:00:00').getTime();
  const b = new Date(co + 'T00:00:00').getTime();
  return Math.max(0, Math.round((b - a) / (1000 * 60 * 60 * 24)));
}

/**
 * Determines which units are available for the requested date range.
 * A unit is available if neither its current guest nor any future guest's
 * stay overlaps the requested range.
 */
function getAvailableUnits(
  units: Unit[],
  checkIn: string,
  checkOut: string,
  preferredType: string | null,
  airbnbBlocksByUnit?: Map<string, AirbnbBlock[]>,
): Unit[] {
  const reqStart = checkIn;
  const reqEnd = checkOut;

  const eligible = units.filter(u => {
    if (u.status === 'planning' || u.status === 'storage') return false;
    if (preferredType && u.unitType !== preferredType) return false;
    return true;
  });

  return eligible.filter(unit => {
    const overlaps = (gCheckIn: string, gCheckOut: string | null | undefined) => {
      const gStart = gCheckIn;
      const gEnd = gCheckOut && gCheckOut.length > 0 ? gCheckOut : '9999-12-31';
      // Overlap if reqStart < gEnd AND reqEnd > gStart
      return reqStart < gEnd && reqEnd > gStart;
    };

    if (unit.currentGuest && overlaps(unit.currentGuest.checkIn, unit.currentGuest.checkOut)) {
      return false;
    }
    for (const fg of unit.futureGuests) {
      if (overlaps(fg.checkIn, fg.checkOut)) return false;
    }
    // Airbnb blocks from the website's calendar_events feed (cross-project).
    const airbnbBlocks = airbnbBlocksByUnit?.get(unit.id) ?? [];
    for (const b of airbnbBlocks) {
      if (overlaps(b.checkIn, b.checkOut)) return false;
    }
    return true;
  });
}

export default function RequestCard({ request, units, onApprove, onDecline, onDelete, airbnbBlocksByUnit }: RequestCardProps) {
  const [declineOpen, setDeclineOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);

  const nights = getNights(request.check_in, request.check_out);
  const isPending = request.status === 'pending';

  const availableUnits = isPending
    ? getAvailableUnits(units, request.check_in, request.check_out, request.preferred_unit_type, airbnbBlocksByUnit)
    : [];

  const assignedUnit = request.assigned_unit_id
    ? units.find(u => u.id === request.assigned_unit_id)
    : null;

  const statusBadge = {
    pending: <Badge variant="secondary" className="font-body">Pending</Badge>,
    approved: <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 font-body">Approved</Badge>,
    declined: <Badge variant="outline" className="font-body text-muted-foreground">Declined</Badge>,
  }[request.status];

  return (
    <>
      <Card className="glass-card border-border/60 p-4 sm:p-5 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="font-heading font-semibold text-base truncate">{request.name}</h3>
            <p className="text-[10px] text-muted-foreground font-body uppercase tracking-wider mt-0.5">
              {new Date(request.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
              {' · '}
              {SOURCE_LABELS[request.source]}
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {statusBadge}
            <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Contact */}
        <div className="grid grid-cols-1 gap-1.5 text-xs font-body">
          <a href={`mailto:${request.email}`} className="flex items-center gap-2 text-foreground hover:text-secondary transition-colors min-w-0">
            <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="truncate">{request.email}</span>
          </a>
          {request.phone && (
            <a href={`tel:${request.phone}`} className="flex items-center gap-2 text-foreground hover:text-secondary transition-colors">
              <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span>{request.phone}</span>
            </a>
          )}
        </div>

        {/* Trip details */}
        <div className="rounded-lg bg-muted/30 p-3 space-y-2 text-xs font-body">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-3.5 w-3.5 text-secondary shrink-0" />
            <span className="text-foreground">
              {formatDate(request.check_in)} → {formatDate(request.check_out)}
            </span>
            <span className="text-muted-foreground">({nights} {nights === 1 ? 'night' : 'nights'})</span>
          </div>
          <div className="flex items-center gap-4 text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" />
              {request.num_guests} {request.num_guests === 1 ? 'guest' : 'guests'}
            </span>
            {request.preferred_unit_type && (
              <span className="flex items-center gap-1.5">
                <Home className="h-3.5 w-3.5" />
                Wants: {UNIT_TYPE_LABELS[request.preferred_unit_type]}
              </span>
            )}
          </div>
          {request.notes && (
            <div className="flex items-start gap-2 pt-1 border-t border-border/40">
              <StickyNote className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
              <p className="text-foreground whitespace-pre-wrap">{request.notes}</p>
            </div>
          )}
        </div>

        {/* Pending: availability + actions */}
        {isPending && (
          <>
            <div className="space-y-1.5">
              <div className="text-[10px] font-body uppercase tracking-wider text-muted-foreground">
                Available for these dates
              </div>
              {availableUnits.length === 0 ? (
                <div className="flex items-center gap-2 text-xs text-amber-400 font-body">
                  <AlertCircle className="h-3.5 w-3.5" />
                  No units available — you may need to decline
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {availableUnits.map(u => (
                    <Badge key={u.id} variant="outline" className={cn(
                      'font-body text-[11px]',
                      request.preferred_unit_type === u.unitType && 'border-secondary/50 text-secondary'
                    )}>
                      {u.name} · {UNIT_TYPE_LABELS[u.unitType]}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <Button
                size="sm"
                className="flex-1 font-body gold-gradient border-0 text-background font-semibold hover:opacity-90"
                onClick={() => onApprove(request)}
              >
                <Check className="h-4 w-4 mr-1.5" />
                Approve & Book
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="font-body"
                onClick={() => setDeclineOpen(true)}
              >
                <X className="h-4 w-4 mr-1.5" />
                Decline
              </Button>
            </div>
          </>
        )}

        {/* Approved: show assigned unit */}
        {request.status === 'approved' && assignedUnit && (
          <div className="text-xs font-body text-emerald-400 flex items-center gap-1.5">
            <Check className="h-3.5 w-3.5" />
            Booked into <span className="font-semibold">{assignedUnit.name}</span>
          </div>
        )}

        {/* Declined: show reason */}
        {request.status === 'declined' && request.decline_reason && (
          <div className="text-xs font-body text-muted-foreground italic">
            Reason: {request.decline_reason}
          </div>
        )}
      </Card>

      {/* Decline dialog */}
      <AlertDialog open={declineOpen} onOpenChange={setDeclineOpen}>
        <AlertDialogContent className="glass-card border-border/60">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-heading">Decline this request?</AlertDialogTitle>
            <AlertDialogDescription className="font-body">
              Optionally add a reason (just for your own records).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            placeholder="e.g. Dates not available, didn't pass screening..."
            value={declineReason}
            onChange={e => setDeclineReason(e.target.value)}
            className="resize-none h-20 font-body"
          />
          <AlertDialogFooter>
            <AlertDialogCancel className="font-body" onClick={() => setDeclineReason('')}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="font-body bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                onDecline(request.id, declineReason.trim() || undefined);
                setDeclineReason('');
                setDeclineOpen(false);
              }}
            >
              Decline Request
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete dialog */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="glass-card border-border/60">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-heading">Delete this request?</AlertDialogTitle>
            <AlertDialogDescription className="font-body">
              This permanently removes the request from your inbox. The booking (if any) will not be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="font-body">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="font-body bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                onDelete(request.id);
                setDeleteOpen(false);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
