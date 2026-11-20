import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Database,
  MapPin,
  ShieldCheck,
  X,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type {
  OperationalUnit,
  ReservationObservation,
  useOperationsData,
} from '@/hooks/useOperationsData';
import { cn } from '@/lib/utils';

const SOURCE_NAMES: Record<ReservationObservation['source'], string> = {
  airbnb: 'Airbnb',
  furnished_finder: 'Furnished Finder',
  grasshopper: 'Grasshopper',
  manual: 'Manual',
  legacy_host_hub: 'Legacy app',
  ical: 'Calendar feed',
};

const TRACKED_SOURCES: ReservationObservation['source'][] = [
  'airbnb',
  'furnished_finder',
  'grasshopper',
];

function SourceEvidence({
  source,
  observations,
}: {
  source: ReservationObservation['source'];
  observations: ReservationObservation[];
}) {
  const sourceObservations = observations.filter((observation) => observation.source === source);
  const latest = sourceObservations.reduce<ReservationObservation | null>((current, observation) => (
    !current || new Date(observation.observed_at) > new Date(current.observed_at)
      ? observation
      : current
  ), null);
  const pending = sourceObservations.filter((observation) => (
    ['pending', 'needs_mapping'].includes(observation.review_status)
  )).length;

  return (
    <div className="rounded-xl border border-border/60 bg-background/35 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold">{SOURCE_NAMES[source]}</p>
        {pending > 0 && <Badge variant="outline">{pending} to review</Badge>}
      </div>
      {latest ? (
        <>
          <p className="mt-1 text-xs text-muted-foreground">
            Latest evidence {formatDistanceToNow(new Date(latest.observed_at), { addSuffix: true })}
          </p>
          <p className="mt-1 truncate text-xs text-muted-foreground">
            {latest.observation_status.replace('_', ' ')}
            {latest.listing_label || latest.unit?.name ? ` · ${latest.listing_label || latest.unit?.name}` : ''}
          </p>
        </>
      ) : (
        <p className="mt-1 text-xs text-amber-200">No source evidence has been staged.</p>
      )}
    </div>
  );
}

function canonicalConflict(observation: ReservationObservation) {
  const current = observation.matched_reservation;
  if (!current) return null;
  const differences = [
    observation.unit_id && current.unit_id !== observation.unit_id ? 'unit' : null,
    observation.guest_name && current.guest?.name?.toLowerCase() !== observation.guest_name.toLowerCase() ? 'guest' : null,
    observation.check_in_date && current.check_in_date !== observation.check_in_date ? 'check-in' : null,
    observation.check_out_date && current.check_out_date !== observation.check_out_date ? 'checkout' : null,
  ].filter(Boolean);
  return differences.length ? differences.join(', ') : null;
}

function ObservationCard({
  observation,
  units,
  onSave,
  onReview,
}: {
  observation: ReservationObservation;
  units: OperationalUnit[];
  onSave: ReturnType<typeof useOperationsData>['updateReservationObservation'];
  onReview: ReturnType<typeof useOperationsData>['reviewReservationObservation'];
}) {
  const [unitId, setUnitId] = useState(observation.unit_id ?? '');
  const [guestName, setGuestName] = useState(observation.guest_name ?? '');
  const [checkInDate, setCheckInDate] = useState(observation.check_in_date ?? '');
  const [checkOutDate, setCheckOutDate] = useState(observation.check_out_date ?? '');
  const [status, setStatus] = useState(observation.observation_status);
  const [busy, setBusy] = useState(false);
  const conflict = canonicalConflict(observation);
  const canApprove = status === 'confirmed' || status === 'cancelled';
  const isComplete = Boolean(unitId && guestName && checkInDate && checkOutDate);

  useEffect(() => {
    setUnitId(observation.unit_id ?? '');
    setGuestName(observation.guest_name ?? '');
    setCheckInDate(observation.check_in_date ?? '');
    setCheckOutDate(observation.check_out_date ?? '');
    setStatus(observation.observation_status);
  }, [observation]);

  const values = {
    unit_id: unitId || null,
    guest_name: guestName || null,
    check_in_date: checkInDate || null,
    check_out_date: checkOutDate || null,
    observation_status: status,
  };

  const save = async () => {
    setBusy(true);
    await onSave(observation.id, values);
    setBusy(false);
  };

  const review = async (decision: 'approved' | 'rejected') => {
    setBusy(true);
    await onReview(observation.id, decision, {
      unitId,
      guestName,
      checkInDate,
      checkOutDate,
      notes: decision === 'rejected' ? 'Dismissed during reservation review.' : 'Approved in Reservation Review.',
    });
    setBusy(false);
  };

  return (
    <Card className={cn(
      'border-border/70',
      (conflict || observation.confidence === 'conflict') && 'border-amber-500/45 bg-amber-500/5',
      observation.review_status === 'needs_mapping' && 'border-violet-500/45 bg-violet-500/5',
    )}>
      <CardContent className="space-y-4 p-4">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{SOURCE_NAMES[observation.source]}</Badge>
              <Badge variant="outline">{observation.confidence}</Badge>
              {observation.review_status === 'needs_mapping' && (
                <Badge className="bg-violet-500 text-white">Choose a unit</Badge>
              )}
              {(conflict || observation.confidence === 'conflict') && (
                <Badge className="bg-amber-500 text-background">Conflict</Badge>
              )}
            </div>
            <p className="mt-2 font-semibold">
              {observation.guest_name || 'Guest not identified'} · {observation.listing_label || observation.unit?.name || 'Unmapped listing'}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Seen {formatDistanceToNow(new Date(observation.observed_at), { addSuffix: true })}
              {observation.evidence_reference ? ` · ${observation.evidence_reference}` : ''}
            </p>
          </div>
          <Select value={status} onValueChange={(value) => setStatus(value as ReservationObservation['observation_status'])}>
            <SelectTrigger aria-label="Observation status" className="min-h-11 w-full sm:w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="confirmed">Confirmed booking</SelectItem>
              <SelectItem value="inquiry">Inquiry only</SelectItem>
              <SelectItem value="text_signal">Text signal</SelectItem>
              <SelectItem value="cancelled">Cancellation</SelectItem>
              <SelectItem value="unknown">Unknown</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {observation.evidence_summary && (
          <div className="rounded-lg border border-border/70 bg-background/35 p-3 text-sm text-muted-foreground">
            {observation.evidence_summary}
          </div>
        )}

        {observation.matched_reservation && (
          <div className={cn(
            'rounded-lg border p-3 text-sm',
            conflict ? 'border-amber-500/35 bg-amber-500/5' : 'border-emerald-500/25 bg-emerald-500/5',
          )}>
            <p className="font-medium">{conflict ? `Different from the app: ${conflict}` : 'Matches an existing reservation'}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Current: {observation.matched_reservation.guest?.name || 'Guest'} · {observation.matched_reservation.check_in_date} to {observation.matched_reservation.check_out_date || 'open-ended'}
            </p>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <Label htmlFor={`unit-${observation.id}`}>Unit</Label>
            <Select value={unitId || 'unmapped'} onValueChange={(value) => setUnitId(value === 'unmapped' ? '' : value)}>
              <SelectTrigger id={`unit-${observation.id}`} className="min-h-11">
                <SelectValue placeholder="Choose unit" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unmapped">Not mapped</SelectItem>
                {units.map((unit) => <SelectItem key={unit.id} value={unit.id}>{unit.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`guest-${observation.id}`}>Guest</Label>
            <Input id={`guest-${observation.id}`} className="min-h-11" value={guestName} onChange={(event) => setGuestName(event.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`check-in-${observation.id}`}>Check-in</Label>
            <Input id={`check-in-${observation.id}`} className="min-h-11" type="date" value={checkInDate} onChange={(event) => setCheckInDate(event.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`check-out-${observation.id}`}>Checkout</Label>
            <Input id={`check-out-${observation.id}`} className="min-h-11" type="date" value={checkOutDate} onChange={(event) => setCheckOutDate(event.target.value)} />
          </div>
        </div>

        {!canApprove && (
          <div className="flex gap-2 rounded-lg bg-sky-500/10 p-3 text-sm text-sky-100">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
            Verify this signal and change it to “Confirmed booking” before adding it to the schedule.
          </div>
        )}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" disabled={busy} onClick={() => review('rejected')}>
            <X className="mr-2 h-4 w-4" /> Dismiss
          </Button>
          <Button variant="outline" disabled={busy} onClick={save}>
            Save review details
          </Button>
          <Button disabled={busy || !canApprove || (status === 'confirmed' && !isComplete)} onClick={() => review('approved')}>
            <CheckCircle2 className="mr-2 h-4 w-4" /> Approve schedule
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ReservationReviewQueue({
  observations,
  units,
  onSave,
  onReview,
}: {
  observations: ReservationObservation[];
  units: OperationalUnit[];
  onSave: ReturnType<typeof useOperationsData>['updateReservationObservation'];
  onReview: ReturnType<typeof useOperationsData>['reviewReservationObservation'];
}) {
  const queue = useMemo(
    () => observations
      .filter((observation) => ['pending', 'needs_mapping'].includes(observation.review_status))
      .sort((a, b) => {
        const aPriority = a.confidence === 'conflict' || a.review_status === 'needs_mapping' ? 0 : 1;
        const bPriority = b.confidence === 'conflict' || b.review_status === 'needs_mapping' ? 0 : 1;
        return aPriority - bPriority || (a.check_out_date || '9999-12-31').localeCompare(b.check_out_date || '9999-12-31');
      }),
    [observations],
  );
  const conflicts = queue.filter((observation) => observation.confidence === 'conflict' || canonicalConflict(observation));
  const unmapped = queue.filter((observation) => !observation.unit_id);
  const approved = observations.filter((observation) => observation.review_status === 'approved').slice(0, 4);

  return (
    <section className="space-y-3" aria-labelledby="reservation-review-title">
      <Card className="border-secondary/30 bg-secondary/5">
        <CardHeader className="p-4 pb-2">
          <CardTitle id="reservation-review-title" className="flex items-center gap-2 text-base">
            <Database className="h-4 w-4 text-secondary" /> Reservation Review
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-4 pt-2">
          <div>
            <p className="text-sm text-muted-foreground">
              Hermes and booking sources place possible changes here first. Nothing changes the live schedule until you approve it.
            </p>
            <p className="mt-1 text-xs font-medium text-emerald-200">Reviewing and approving here does not send email, text messages, or calendar invitations.</p>
          </div>
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <Clock3 className="h-3.5 w-3.5" />
              Latest evidence by source
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              {TRACKED_SOURCES.map((source) => (
                <SourceEvidence key={source} source={source} observations={observations} />
              ))}
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Evidence age shows the newest staged record, not whether the source login is healthy.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-background/40 p-3">
              <p className="text-2xl font-bold">{queue.length}</p>
              <p className="text-xs text-muted-foreground">Needs review</p>
            </div>
            <div className="rounded-xl bg-amber-500/10 p-3">
              <p className="text-2xl font-bold text-amber-200">{conflicts.length}</p>
              <p className="text-xs text-muted-foreground">Conflicts</p>
            </div>
            <div className="rounded-xl bg-violet-500/10 p-3">
              <p className="text-2xl font-bold text-violet-200">{unmapped.length}</p>
              <p className="text-xs text-muted-foreground">Need unit</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {queue.map((observation) => (
        <ObservationCard
          key={observation.id}
          observation={observation}
          units={units}
          onSave={onSave}
          onReview={onReview}
        />
      ))}

      {!queue.length && (
        <Card className="border-emerald-500/30 bg-emerald-500/5">
          <CardContent className="flex items-center gap-3 p-4">
            <CheckCircle2 className="h-5 w-5 text-emerald-300" />
            <div><p className="font-medium">Reservation review is clear</p><p className="text-sm text-muted-foreground">No source changes are waiting.</p></div>
          </CardContent>
        </Card>
      )}

      {approved.length > 0 && (
        <details className="rounded-xl border border-border/70 bg-card">
          <summary className="flex min-h-11 cursor-pointer items-center gap-2 px-4 py-3 text-sm font-medium">
            <ShieldCheck className="h-4 w-4 text-emerald-300" /> Recently approved ({approved.length})
          </summary>
          <div className="space-y-2 border-t border-border/70 p-4">
            {approved.map((observation) => (
              <div key={observation.id} className="flex items-center gap-3 rounded-lg bg-background/35 p-3 text-sm">
                {observation.unit_id ? <MapPin className="h-4 w-4 text-muted-foreground" /> : <AlertTriangle className="h-4 w-4 text-amber-300" />}
                <span className="flex-1">{observation.guest_name || 'Guest'} · {observation.unit?.name || observation.listing_label || 'Unmapped'}</span>
                <Badge variant="outline">{SOURCE_NAMES[observation.source]}</Badge>
              </div>
            ))}
          </div>
        </details>
      )}
    </section>
  );
}
