import { useMemo, useState } from 'react';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Mail,
  Phone,
  CalendarDays,
  StickyNote,
  Check,
  X,
  Trash2,
  Home,
  AlertCircle,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { BookingRequest } from '@/hooks/useBookingRequests';
import { AirbnbBlock } from '@/hooks/useAirbnbBlocks';
import { Unit, UNIT_TYPE_LABELS } from '@/types/property';

interface ExtensionRequestCardProps {
  request: BookingRequest;
  units: Unit[];
  onApproveSameUnit: (request: BookingRequest, unit: Unit, params: { startDate: string; endDate: string; amount: number }) => void;
  onApproveSwitchUnit: (request: BookingRequest, fromUnit: Unit, toUnit: Unit, params: { startDate: string; endDate: string; amount: number }) => void;
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

function fmtMoney(n: number) {
  return `$${Math.round(n).toLocaleString()}`;
}

/**
 * Extension requests carry the CURRENT unit in `assigned_unit_id` (set by
 * the website's submit-extension-request function from the QR code). The
 * `check_in` field is the requested extension start (= current check_out)
 * and `check_out` is the new desired check-out date.
 */
export default function ExtensionRequestCard({
  request,
  units,
  onApproveSameUnit,
  onApproveSwitchUnit,
  onDecline,
  onDelete,
  airbnbBlocksByUnit,
}: ExtensionRequestCardProps) {
  const [confirmOpen, setConfirmOpen] = useState<null | { mode: 'same' | 'switch'; toUnit: Unit }>(null);
  const [switchPickerOpen, setSwitchPickerOpen] = useState(false);
  const [switchTargetId, setSwitchTargetId] = useState<string | null>(null);
  const [declineOpen, setDeclineOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);

  const currentUnit = units.find(u => u.id === request.assigned_unit_id) ?? null;
  const guest = currentUnit?.currentGuest ?? null;

  const nightsAdded = getNights(request.check_in, request.check_out);

  // Nightly rate derived from the existing guest's monthly_rate (÷ 30).
  // Extension stays use the same money model the rest of the app uses
  // (no per-unit nightly column exists today).
  const nightlyRate = useMemo(() => {
    if (guest && guest.monthlyRate > 0) return guest.monthlyRate / 30;
    return 0;
  }, [guest]);

  const amount = Math.round(nightlyRate * nightsAdded);

  // Sibling units that are available for the requested range AND have the
  // same or larger sleeps capacity. We approximate "sleeps" using unitType:
  // cottage > 2br > 1br.
  const typeRank: Record<string, number> = { '1br': 1, '2br': 2, cottage: 3 };
  const currentRank = currentUnit ? typeRank[currentUnit.unitType] ?? 0 : 0;

  const reqStart = request.check_in;
  const reqEnd = request.check_out;

  const overlaps = (gIn: string, gOut: string | null | undefined) => {
    const s = gIn;
    const e = gOut && gOut.length > 0 ? gOut : '9999-12-31';
    return reqStart < e && reqEnd > s;
  };

  const switchCandidates = useMemo(() => {
    return units.filter(u => {
      if (currentUnit && u.id === currentUnit.id) return false;
      if (u.status === 'planning' || u.status === 'storage') return false;
      if ((typeRank[u.unitType] ?? 0) < currentRank) return false;
      if (u.currentGuest && overlaps(u.currentGuest.checkIn, u.currentGuest.checkOut)) return false;
      for (const fg of u.futureGuests) if (overlaps(fg.checkIn, fg.checkOut)) return false;
      const blocks = airbnbBlocksByUnit?.get(u.id) ?? [];
      for (const b of blocks) if (overlaps(b.checkIn, b.checkOut)) return false;
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [units, currentUnit, currentRank, request.check_in, request.check_out, airbnbBlocksByUnit]);

  // Can we approve in current unit? Only if the current guest's existing
  // check_out is exactly request.check_in (i.e. this really is an extension)
  // AND no future guest blocks the new range.
  const canKeepCurrentUnit = useMemo(() => {
    if (!currentUnit || !guest) return false;
    if (!guest.checkOut || guest.checkOut !== request.check_in) return false;
    for (const fg of currentUnit.futureGuests) {
      if (overlaps(fg.checkIn, fg.checkOut)) return false;
    }
    const blocks = airbnbBlocksByUnit?.get(currentUnit.id) ?? [];
    for (const b of blocks) if (overlaps(b.checkIn, b.checkOut)) return false;
    return true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUnit, guest, request.check_in, request.check_out, airbnbBlocksByUnit]);

  const isPending = request.status === 'pending';

  return (
    <>
      <Card className="glass-card border-secondary/40 p-4 sm:p-5 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-heading font-semibold text-base truncate">{request.name}</h3>
              <Badge className="bg-secondary/15 text-secondary border-secondary/30 font-body text-[10px]">
                <RefreshCw className="h-3 w-3 mr-1" />
                Stay Extension
              </Badge>
            </div>
            <p className="text-[10px] text-muted-foreground font-body uppercase tracking-wider mt-0.5">
              {new Date(request.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
              {currentUnit && <> · {currentUnit.name}</>}
            </p>
          </div>
          <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
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

        {/* Extension details */}
        <div className="rounded-lg bg-muted/30 p-3 space-y-2 text-xs font-body">
          {!currentUnit ? (
            <div className="flex items-center gap-2 text-amber-400">
              <AlertCircle className="h-3.5 w-3.5" />
              Cannot find the unit this request is for (assigned_unit_id missing or stale).
            </div>
          ) : !guest ? (
            <div className="flex items-center gap-2 text-amber-400">
              <AlertCircle className="h-3.5 w-3.5" />
              {currentUnit.name} has no current guest — extension cannot be auto-approved.
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <Home className="h-3.5 w-3.5 text-secondary shrink-0" />
                <span className="text-foreground">
                  {currentUnit.name} · {UNIT_TYPE_LABELS[currentUnit.unitType]}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <CalendarDays className="h-3.5 w-3.5 text-secondary shrink-0" />
                <span className="text-muted-foreground">Currently checks out</span>
                <span className="text-foreground font-medium">{guest.checkOut ? formatDate(guest.checkOut) : '—'}</span>
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
                <span className="text-foreground font-medium">{formatDate(request.check_out)}</span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-border/40">
                <span className="text-muted-foreground">
                  +{nightsAdded} {nightsAdded === 1 ? 'night' : 'nights'} @ {fmtMoney(nightlyRate)}/night
                </span>
                <span className="text-secondary font-semibold text-sm">{fmtMoney(amount)}</span>
              </div>
            </>
          )}
          {request.notes && (
            <div className="flex items-start gap-2 pt-1 border-t border-border/40">
              <StickyNote className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
              <p className="text-foreground whitespace-pre-wrap">{request.notes}</p>
            </div>
          )}
        </div>

        {/* Actions */}
        {isPending && currentUnit && guest && (
          <div className="space-y-2">
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                size="sm"
                className="flex-1 font-body gold-gradient border-0 text-background font-semibold hover:opacity-90 disabled:opacity-50"
                disabled={!canKeepCurrentUnit}
                onClick={() => setConfirmOpen({ mode: 'same', toUnit: currentUnit })}
              >
                <Check className="h-4 w-4 mr-1.5" />
                Approve in {currentUnit.name}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1 font-body"
                disabled={switchCandidates.length === 0}
                onClick={() => {
                  setSwitchTargetId(switchCandidates[0]?.id ?? null);
                  setSwitchPickerOpen(true);
                }}
              >
                <RefreshCw className="h-4 w-4 mr-1.5" />
                Switch unit ({switchCandidates.length})
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
            {!canKeepCurrentUnit && (
              <p className="text-[11px] text-muted-foreground font-body">
                Cannot extend in current unit (date mismatch or conflicting booking). Try switching units.
              </p>
            )}
          </div>
        )}

        {request.status === 'approved' && (
          <div className="text-xs font-body text-emerald-400 flex items-center gap-1.5">
            <Check className="h-3.5 w-3.5" />
            Extension approved
          </div>
        )}
        {request.status === 'declined' && request.decline_reason && (
          <div className="text-xs font-body text-muted-foreground italic">
            Reason: {request.decline_reason}
          </div>
        )}
      </Card>

      {/* Switch-unit picker */}
      <AlertDialog open={switchPickerOpen} onOpenChange={setSwitchPickerOpen}>
        <AlertDialogContent className="glass-card border-border/60">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-heading">Switch to which unit?</AlertDialogTitle>
            <AlertDialogDescription className="font-body">
              Showing units available {formatDate(request.check_in)} → {formatDate(request.check_out)} with the same or larger size.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Select value={switchTargetId ?? undefined} onValueChange={setSwitchTargetId}>
            <SelectTrigger className="font-body">
              <SelectValue placeholder="Pick a unit" />
            </SelectTrigger>
            <SelectContent>
              {switchCandidates.map(u => (
                <SelectItem key={u.id} value={u.id} className="font-body">
                  {u.name} · {UNIT_TYPE_LABELS[u.unitType]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <AlertDialogFooter>
            <AlertDialogCancel className="font-body">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="font-body gold-gradient border-0 text-background"
              disabled={!switchTargetId}
              onClick={() => {
                const target = units.find(u => u.id === switchTargetId);
                if (target) {
                  setSwitchPickerOpen(false);
                  setConfirmOpen({ mode: 'switch', toUnit: target });
                }
              }}
            >
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Approval confirmation */}
      <AlertDialog open={!!confirmOpen} onOpenChange={open => !open && setConfirmOpen(null)}>
        <AlertDialogContent className="glass-card border-border/60">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-heading">Confirm Extension</AlertDialogTitle>
            <AlertDialogDescription className="font-body text-sm space-y-2">
              <span className="block">
                {request.name} will stay in <span className="text-foreground font-semibold">{confirmOpen?.toUnit.name}</span> until <span className="text-foreground font-semibold">{formatDate(request.check_out)}</span>.
              </span>
              <span className="block">
                Amount to collect: <span className="text-secondary font-semibold">{fmtMoney(amount)}</span> ({nightsAdded} {nightsAdded === 1 ? 'night' : 'nights'}).
              </span>
              <span className="block text-[11px] text-muted-foreground">
                Payment is collected manually. The extension will be mirrored to the website calendar and the guest will receive a confirmation email.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="font-body">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="font-body gold-gradient border-0 text-background font-semibold"
              onClick={() => {
                if (!confirmOpen || !currentUnit) return;
                const params = { startDate: request.check_in, endDate: request.check_out, amount };
                if (confirmOpen.mode === 'same') {
                  onApproveSameUnit(request, confirmOpen.toUnit, params);
                } else {
                  onApproveSwitchUnit(request, currentUnit, confirmOpen.toUnit, params);
                }
                setConfirmOpen(null);
              }}
            >
              Confirm Extension
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Decline */}
      <AlertDialog open={declineOpen} onOpenChange={setDeclineOpen}>
        <AlertDialogContent className="glass-card border-border/60">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-heading">Decline this extension?</AlertDialogTitle>
            <AlertDialogDescription className="font-body">
              The guest will receive a polite decline email. Optionally include a reason.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            placeholder="e.g. Unit is already booked for those dates..."
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
              Decline
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="glass-card border-border/60">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-heading">Delete this request?</AlertDialogTitle>
            <AlertDialogDescription className="font-body">
              This permanently removes the extension request. The guest's existing stay is not affected.
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
