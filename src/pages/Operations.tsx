import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { format, formatDistanceToNow } from 'date-fns';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Building2,
  CalendarCheck2,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  DoorOpen,
  LogOut,
  Plus,
  RefreshCcw,
  ShieldCheck,
  Sparkles,
  UserRound,
  Wrench,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/useAuth';
import { useAuthRoles } from '@/hooks/useAuthRoles';
import {
  CHECKLIST_TEMPLATES,
  ChecklistRun,
  OperationalUnit,
  useOperationsData,
} from '@/hooks/useOperationsData';
import {
  CLEANING_STATUS_LABELS,
  localDateKey,
  OperationalCleaning,
  OperationalReservation,
  UNIT_OPERATIONAL_STATUS,
} from '@/lib/operations';
import { cn } from '@/lib/utils';

const STATUS_TONES: Record<string, string> = {
  occupied: 'border-sky-500/40 bg-sky-500/10 text-sky-200',
  vacant_ready: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200',
  vacant_dirty: 'border-rose-500/40 bg-rose-500/10 text-rose-200',
  cleaning_scheduled: 'border-amber-500/40 bg-amber-500/10 text-amber-200',
  maintenance_needed: 'border-orange-500/40 bg-orange-500/10 text-orange-200',
  offline: 'border-slate-500/40 bg-slate-500/10 text-slate-300',
  under_renovation: 'border-violet-500/40 bg-violet-500/10 text-violet-200',
};

const SOURCE_LABELS: Record<string, string> = {
  airbnb: 'Airbnb',
  furnished_finder: 'Furnished Finder',
  vrbo: 'Vrbo',
  booking_com: 'Booking.com',
  direct: 'Direct',
  long_term: 'Long term',
  lease: 'Lease',
  other: 'Other',
};

const READINESS_ITEMS = [
  ['cleanliness', 'Cleanliness confirmed'],
  ['linens', 'Linens ready'],
  ['supplies', 'Supplies stocked'],
  ['damage', 'No visible damage'],
  ['maintenance', 'No blocking maintenance'],
  ['entry', 'Entry access working'],
  ['wifi', 'Wi-Fi working'],
  ['presentation', 'Unit presentation acceptable'],
] as const;

function displayDate(date?: string | null, time?: string | null) {
  if (!date) return 'Not set';
  const value = new Date(`${date}T${time || '12:00:00'}`);
  return format(value, time ? 'EEE, MMM d · h:mm a' : 'EEE, MMM d');
}

function displayTimestamp(value?: string | null) {
  if (!value) return 'Not set';
  return format(new Date(value), 'EEE, MMM d · h:mm a');
}

function ReservationRow({ reservation, direction }: {
  reservation: OperationalReservation;
  direction: 'arrival' | 'departure';
}) {
  const date = direction === 'arrival' ? reservation.check_in_date : reservation.check_out_date;
  const time = direction === 'arrival' ? reservation.check_in_time : reservation.check_out_time;
  const ready = reservation.unit?.operational_status === 'vacant_ready' || reservation.status === 'checked_in';
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border/70 bg-background/35 p-3">
      <div className={cn(
        'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
        direction === 'arrival' ? 'bg-emerald-500/10 text-emerald-300' : 'bg-sky-500/10 text-sky-300',
      )}>
        {direction === 'arrival' ? <DoorOpen className="h-5 w-5" /> : <LogOut className="h-5 w-5" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold text-foreground">{reservation.unit?.name ?? 'Unassigned unit'}</p>
          <Badge variant="outline" className="text-[10px]">{SOURCE_LABELS[reservation.booking_source ?? 'other'] ?? reservation.booking_source}</Badge>
        </div>
        <p className="truncate text-sm text-muted-foreground">{reservation.guest?.name ?? 'Guest not linked'}</p>
        <p className="mt-1 text-xs text-muted-foreground">{displayDate(date, time)}</p>
      </div>
      {direction === 'arrival' && (
        <Badge className={cn('shrink-0 border', ready ? STATUS_TONES.vacant_ready : STATUS_TONES.vacant_dirty)}>
          {ready ? 'Ready' : 'Check readiness'}
        </Badge>
      )}
    </div>
  );
}

function UnitBoard({ units, reservations, onStatus }: {
  units: OperationalUnit[];
  reservations: OperationalReservation[];
  onStatus: (id: string, status: string) => Promise<boolean>;
}) {
  const currentByUnit = useMemo(() => {
    const map = new Map<string, OperationalReservation>();
    reservations
      .filter((reservation) => reservation.status === 'checked_in')
      .forEach((reservation) => map.set(reservation.unit_id, reservation));
    return map;
  }, [reservations]);

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {units.map((unit) => {
        const current = currentByUnit.get(unit.id);
        const status = unit.operational_status as keyof typeof UNIT_OPERATIONAL_STATUS;
        return (
          <Card key={unit.id} className={cn('overflow-hidden border', STATUS_TONES[status])}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-heading text-lg font-semibold text-foreground">{unit.name}</p>
                  <p className="truncate text-sm text-muted-foreground">
                    {current?.guest?.name ?? unit.label ?? 'No current occupant'}
                  </p>
                </div>
                <Building2 className="h-5 w-5 shrink-0 opacity-70" />
              </div>
              <Select value={status} onValueChange={(value) => onStatus(unit.id, value)}>
                <SelectTrigger aria-label={`Status for ${unit.name}`} className="mt-4 h-10 border-current/20 bg-background/40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(UNIT_OPERATIONAL_STATUS).map(([value, meta]) => (
                    <SelectItem key={value} value={value}>{meta.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function AddReservationDialog({ open, onOpenChange, units, onSave }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  units: OperationalUnit[];
  onSave: ReturnType<typeof useOperationsData>['createReservation'];
}) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    unitId: '',
    guestName: '',
    guestPhone: '',
    guestEmail: '',
    bookingSource: 'direct',
    checkInDate: '',
    checkOutDate: '',
    checkInTime: '15:00',
    checkOutTime: '11:00',
    notes: '',
  });

  const save = async () => {
    if (!form.unitId || !form.guestName || !form.checkInDate || !form.checkOutDate) return;
    setSaving(true);
    const saved = await onSave(form);
    setSaving(false);
    if (saved) {
      onOpenChange(false);
      setForm((current) => ({ ...current, guestName: '', guestPhone: '', guestEmail: '', notes: '' }));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Add a reservation</DialogTitle>
          <DialogDescription>
            This creates the guest, reservation, and one linked cleaning task. Overlapping confirmed stays are blocked.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="reservation-unit">Unit</Label>
            <Select value={form.unitId} onValueChange={(unitId) => setForm({ ...form, unitId })}>
              <SelectTrigger id="reservation-unit"><SelectValue placeholder="Choose a unit" /></SelectTrigger>
              <SelectContent>{units.map((unit) => <SelectItem key={unit.id} value={unit.id}>{unit.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="reservation-source">Booking source</Label>
            <Select value={form.bookingSource} onValueChange={(bookingSource) => setForm({ ...form, bookingSource })}>
              <SelectTrigger id="reservation-source"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(SOURCE_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="guest-name">Guest or tenant name</Label>
            <Input id="guest-name" value={form.guestName} onChange={(event) => setForm({ ...form, guestName: event.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="guest-phone">Phone</Label>
            <Input id="guest-phone" inputMode="tel" value={form.guestPhone} onChange={(event) => setForm({ ...form, guestPhone: event.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="guest-email">Email</Label>
            <Input id="guest-email" type="email" value={form.guestEmail} onChange={(event) => setForm({ ...form, guestEmail: event.target.value })} />
          </div>
          <div className="grid grid-cols-[1fr_110px] gap-2 sm:col-span-2">
            <div className="space-y-2">
              <Label htmlFor="check-in-date">Check-in</Label>
              <Input id="check-in-date" type="date" value={form.checkInDate} onChange={(event) => setForm({ ...form, checkInDate: event.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="check-in-time">Time</Label>
              <Input id="check-in-time" type="time" value={form.checkInTime} onChange={(event) => setForm({ ...form, checkInTime: event.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-[1fr_110px] gap-2 sm:col-span-2">
            <div className="space-y-2">
              <Label htmlFor="check-out-date">Check-out</Label>
              <Input id="check-out-date" type="date" value={form.checkOutDate} onChange={(event) => setForm({ ...form, checkOutDate: event.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="check-out-time">Time</Label>
              <Input id="check-out-time" type="time" value={form.checkOutTime} onChange={(event) => setForm({ ...form, checkOutTime: event.target.value })} />
            </div>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="reservation-notes">Special notes</Label>
            <Textarea id="reservation-notes" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving || !form.unitId || !form.guestName || !form.checkInDate || !form.checkOutDate}>
            {saving ? 'Saving…' : 'Create reservation'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ReadinessDialog({ cleaning, onClose, onVerify }: {
  cleaning: OperationalCleaning | null;
  onClose: () => void;
  onVerify: (id: string, checklist: Record<string, boolean>) => Promise<boolean>;
}) {
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const allComplete = READINESS_ITEMS.every(([key]) => checks[key]);

  return (
    <Dialog open={Boolean(cleaning)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Verify {cleaning?.unit?.name ?? 'unit'} readiness</DialogTitle>
          <DialogDescription>Cleaning completion alone does not make a unit ready. Confirm each item in person.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          {READINESS_ITEMS.map(([key, label]) => (
            <label key={key} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-border/70 p-3">
              <Checkbox checked={Boolean(checks[key])} onCheckedChange={(value) => setChecks({ ...checks, [key]: value === true })} />
              <span className="text-sm">{label}</span>
            </label>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Not ready</Button>
          <Button
            disabled={!allComplete || !cleaning}
            onClick={async () => {
              if (cleaning && await onVerify(cleaning.id, checks)) {
                setChecks({});
                onClose();
              }
            }}
          >
            <ShieldCheck className="mr-2 h-4 w-4" /> Mark ready
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ChecklistCard({ type, existing, save }: {
  type: ChecklistRun['checklist_type'];
  existing?: ChecklistRun;
  save: ReturnType<typeof useOperationsData>['saveChecklist'];
}) {
  const template = CHECKLIST_TEMPLATES[type];
  const initial = existing?.items?.length
    ? existing.items
    : template.map((label, index) => ({ id: `${type}-${index}`, label, complete: false }));
  const [items, setItems] = useState(initial);
  const [notes, setNotes] = useState(existing?.escalation_notes ?? '');
  const complete = items.every((item) => item.complete);
  const title = type === 'morning' ? 'Morning checklist' : type === 'end_of_day' ? 'End-of-day checklist' : 'Weekly checklist';

  return (
    <Card className="border-border/70">
      <CardHeader className="p-4 pb-2">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-base">{title}</CardTitle>
          <Badge variant={existing?.completed_at ? 'default' : 'outline'}>{existing?.completed_at ? 'Completed' : `${items.filter((item) => item.complete).length}/${items.length}`}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 p-4 pt-2">
        {items.map((item, index) => (
          <label key={item.id} className="flex min-h-10 cursor-pointer items-center gap-3 rounded-lg px-2 py-1 hover:bg-muted/30">
            <Checkbox
              checked={item.complete}
              onCheckedChange={(value) => setItems(items.map((candidate, candidateIndex) => (
                candidateIndex === index ? { ...candidate, complete: value === true } : candidate
              )))}
            />
            <span className={cn('text-sm', item.complete && 'text-muted-foreground line-through')}>{item.label}</span>
          </label>
        ))}
        <Textarea
          className="mt-3 min-h-20"
          placeholder="Escalation or handoff notes"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
        />
        <div className="flex gap-2 pt-2">
          <Button variant="outline" className="flex-1" onClick={() => save(type, items, false, notes)}>Save progress</Button>
          <Button className="flex-1" disabled={!complete} onClick={() => save(type, items, true, notes)}>
            <Check className="mr-2 h-4 w-4" /> Complete
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Operations() {
  const { signOut, session } = useAuth();
  const { isAdmin } = useAuthRoles(session?.user.id);
  const operations = useOperationsData();
  const [reservationOpen, setReservationOpen] = useState(false);
  const [vendorOpen, setVendorOpen] = useState(false);
  const [readinessCleaning, setReadinessCleaning] = useState<OperationalCleaning | null>(null);
  const today = localDateKey();
  const todayChecklists = operations.checklists.filter((checklist) => checklist.checklist_date === today);
  const readyCount = operations.units.filter((unit) => unit.operational_status === 'vacant_ready').length;
  const occupiedCount = operations.units.filter((unit) => unit.operational_status === 'occupied').length;

  return (
    <div className="min-h-screen pattern-bg">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="gold-gradient flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-background">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate font-heading text-lg font-bold sm:text-xl">Homestead Helper</h1>
              <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Daily property operations</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={operations.refresh} aria-label="Refresh operations">
              <RefreshCcw className="h-4 w-4 sm:mr-2" /><span className="hidden sm:inline">Refresh</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={signOut} aria-label="Sign out">
              <LogOut className="h-4 w-4 sm:mr-2" /><span className="hidden sm:inline">Sign out</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-5 pb-28 sm:px-6 sm:py-7 sm:pb-8">
        {!operations.schemaReady && (
          <Card className="border-amber-500/40 bg-amber-500/10">
            <CardContent className="flex gap-3 p-4">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
              <div>
                <p className="font-semibold text-amber-100">Operations migration is not active yet</p>
                <p className="mt-1 text-sm text-amber-100/75">The interface is ready, but the new Supabase migration must be applied before live operational records can load.</p>
              </div>
            </CardContent>
          </Card>
        )}

        <section className="grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
          <Card className="overflow-hidden border-border/70 bg-gradient-to-br from-card to-primary/60">
            <CardContent className="p-5 sm:p-6">
              <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
                <div>
                  <p className="text-sm font-medium text-secondary">{format(new Date(), 'EEEE, MMMM d')}</p>
                  <h2 className="mt-1 font-heading text-2xl font-semibold sm:text-3xl">What needs attention today</h2>
                  <p className="mt-2 max-w-xl text-sm text-muted-foreground">
                    Exceptions first: turnovers, unconfirmed cleaning, maintenance, approvals, and overdue work.
                  </p>
                </div>
                <Button onClick={() => setReservationOpen(true)} className="min-h-11 shrink-0">
                  <Plus className="mr-2 h-4 w-4" /> Add reservation
                </Button>
              </div>
              <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {([
                  { label: 'Urgent', value: operations.summary.urgentCount, Icon: AlertTriangle, tone: 'text-rose-300' },
                  { label: 'Arriving', value: operations.summary.arrivalsToday.length, Icon: DoorOpen, tone: 'text-emerald-300' },
                  { label: 'Leaving', value: operations.summary.departuresToday.length, Icon: LogOut, tone: 'text-sky-300' },
                  { label: 'Approvals', value: operations.approvals.length, Icon: ShieldCheck, tone: 'text-amber-300' },
                ]).map(({ label, value, Icon, tone }) => (
                  <div key={label} className="rounded-xl border border-border/70 bg-background/35 p-3">
                    <Icon className={cn('h-4 w-4', tone)} />
                    <p className="mt-2 text-2xl font-bold">{value}</p>
                    <p className="text-xs text-muted-foreground">{label}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/70">
            <CardHeader className="p-5 pb-2">
              <CardTitle className="text-base">Property pulse</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3 p-5 pt-2">
              <div className="rounded-xl bg-emerald-500/10 p-3">
                <p className="text-2xl font-bold text-emerald-200">{readyCount}</p>
                <p className="text-xs text-muted-foreground">Vacant & ready</p>
              </div>
              <div className="rounded-xl bg-sky-500/10 p-3">
                <p className="text-2xl font-bold text-sky-200">{occupiedCount}</p>
                <p className="text-xs text-muted-foreground">Occupied</p>
              </div>
              <div className="rounded-xl bg-amber-500/10 p-3">
                <p className="text-2xl font-bold text-amber-200">{operations.summary.cleaningAction.length}</p>
                <p className="text-xs text-muted-foreground">Cleaning action</p>
              </div>
              <div className="rounded-xl bg-orange-500/10 p-3">
                <p className="text-2xl font-bold text-orange-200">{operations.summary.openMaintenance.length}</p>
                <p className="text-xs text-muted-foreground">Open maintenance</p>
              </div>
            </CardContent>
          </Card>
        </section>

        <Tabs defaultValue="today" className="space-y-4">
          <div className="overflow-x-auto pb-1">
            <TabsList className="h-11 min-w-max justify-start">
              <TabsTrigger value="today">Today</TabsTrigger>
              <TabsTrigger value="units">15 units</TabsTrigger>
              <TabsTrigger value="stays">Stays</TabsTrigger>
              <TabsTrigger value="cleaning">Cleaning</TabsTrigger>
              <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
              <TabsTrigger value="checklists">Checklists</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="today" className="space-y-5">
            <div className="grid gap-5 lg:grid-cols-2">
              <Card className="border-border/70">
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="flex items-center gap-2 text-base"><DoorOpen className="h-4 w-4 text-emerald-300" /> Arrivals today</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 p-4 pt-2">
                  {operations.summary.arrivalsToday.length
                    ? operations.summary.arrivalsToday.map((reservation) => <ReservationRow key={reservation.id} reservation={reservation} direction="arrival" />)
                    : <EmptyState text="No arrivals today." />}
                </CardContent>
              </Card>
              <Card className="border-border/70">
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="flex items-center gap-2 text-base"><LogOut className="h-4 w-4 text-sky-300" /> Departures today</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 p-4 pt-2">
                  {operations.summary.departuresToday.length
                    ? operations.summary.departuresToday.map((reservation) => <ReservationRow key={reservation.id} reservation={reservation} direction="departure" />)
                    : <EmptyState text="No departures today." />}
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
              <Card className="border-border/70">
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="flex items-center justify-between gap-2 text-base">
                    <span className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-300" /> Requires action</span>
                    <Badge variant="outline">{operations.summary.urgentCount}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 p-4 pt-2">
                  {operations.summary.cleaningAction.slice(0, 5).map((cleaning) => (
                    <div key={cleaning.id} className="flex items-center gap-3 rounded-xl border border-border/70 p-3">
                      <Sparkles className="h-5 w-5 shrink-0 text-amber-300" />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{cleaning.unit?.name ?? 'Unit'} · {CLEANING_STATUS_LABELS[cleaning.status] ?? cleaning.status}</p>
                        <p className="text-xs text-muted-foreground">Deadline {displayTimestamp(cleaning.cleaning_deadline)}</p>
                      </div>
                      {cleaning.status === 'readiness_verification_required' && (
                        <Button size="sm" onClick={() => setReadinessCleaning(cleaning)}>Verify</Button>
                      )}
                    </div>
                  ))}
                  {operations.summary.overdueTasks.slice(0, 5).map((task) => (
                    <div key={task.id} className="flex items-center gap-3 rounded-xl border border-rose-500/30 bg-rose-500/5 p-3">
                      <Clock3 className="h-5 w-5 shrink-0 text-rose-300" />
                      <div className="min-w-0 flex-1"><p className="font-medium">{task.title}</p><p className="text-xs text-muted-foreground">Overdue operational task</p></div>
                      <Button size="sm" variant="outline" onClick={() => operations.completeTask(task.id)}>Done</Button>
                    </div>
                  ))}
                  {!operations.summary.cleaningAction.length && !operations.summary.overdueTasks.length && <EmptyState text="Nothing urgent is waiting." />}
                </CardContent>
              </Card>

              <Card className="border-border/70">
                <CardHeader className="p-4 pb-2"><CardTitle className="text-base">Next 7 days</CardTitle></CardHeader>
                <CardContent className="space-y-3 p-4 pt-2">
                  <div className="flex items-center justify-between rounded-xl bg-muted/30 p-3">
                    <span className="flex items-center gap-2 text-sm"><DoorOpen className="h-4 w-4 text-emerald-300" /> Arrivals</span>
                    <span className="text-xl font-bold">{operations.summary.arrivalsNextSevenDays.length}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-muted/30 p-3">
                    <span className="flex items-center gap-2 text-sm"><LogOut className="h-4 w-4 text-sky-300" /> Departures</span>
                    <span className="text-xl font-bold">{operations.summary.departuresNextSevenDays.length}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-muted/30 p-3">
                    <span className="flex items-center gap-2 text-sm"><RefreshCcw className="h-4 w-4 text-amber-300" /> Same-day turns</span>
                    <span className="text-xl font-bold">{operations.summary.sameDayTurnoverUnitIds.size}</span>
                  </div>
                  <Link to="/host-hub" className="flex min-h-11 items-center justify-between rounded-xl border border-border/70 px-3 text-sm hover:bg-muted/30">
                    Open booking calendar <ArrowRight className="h-4 w-4" />
                  </Link>
                </CardContent>
              </Card>
            </div>

            {operations.approvals.length > 0 && (
              <Card className="border-amber-500/35 bg-amber-500/5">
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="flex items-center gap-2 text-base"><ShieldCheck className="h-4 w-4 text-amber-300" /> Dalton approval required</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 p-4 pt-2">
                  {operations.approvals.map((approval) => (
                    <div key={approval.id} className="flex flex-col gap-3 rounded-xl border border-amber-500/25 p-3 sm:flex-row sm:items-center">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{approval.category.replace(/_/g, ' ')}</p>
                        <p className="text-sm text-muted-foreground">{approval.reason}</p>
                        {approval.amount != null && <p className="mt-1 text-sm font-semibold">${Number(approval.amount).toLocaleString()}</p>}
                      </div>
                      {isAdmin ? (
                        <div className="grid grid-cols-2 gap-2">
                          <Button size="sm" variant="outline" onClick={() => {
                            const reason = window.prompt('Reason for denial');
                            if (reason) operations.decideApproval(approval.id, 'denied', reason);
                          }}>Deny</Button>
                          <Button size="sm" onClick={() => operations.decideApproval(approval.id, 'approved')}>Approve</Button>
                        </div>
                      ) : <Badge variant="outline">Waiting on Dalton</Badge>}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="units">
            <UnitBoard units={operations.units} reservations={operations.reservations} onStatus={operations.updateUnitStatus} />
          </TabsContent>

          <TabsContent value="stays" className="space-y-3">
            <div className="flex justify-end"><Button onClick={() => setReservationOpen(true)}><Plus className="mr-2 h-4 w-4" /> Add reservation</Button></div>
            {operations.reservations
              .filter((reservation) => reservation.status !== 'cancelled')
              .map((reservation) => (
                <ReservationManageCard key={reservation.id} reservation={reservation} update={operations.updateReservation} />
              ))}
            {!operations.reservations.length && <EmptyState text="No reservations yet." />}
          </TabsContent>

          <TabsContent value="cleaning" className="space-y-3">
            {operations.cleanings.length ? operations.cleanings.map((cleaning) => (
              <Card key={cleaning.id} className={cn('border-border/70', cleaning.status === 'overdue' && 'border-rose-500/50')}>
                <CardContent className="p-4">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                    <div className="flex min-w-0 flex-1 gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-300"><Sparkles className="h-5 w-5" /></div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold">{cleaning.unit?.name ?? 'Unit'}</p>
                          <Badge variant="outline">{CLEANING_STATUS_LABELS[cleaning.status] ?? cleaning.status}</Badge>
                          {operations.summary.sameDayTurnoverUnitIds.has(cleaning.unit_id) && <Badge className="bg-rose-500 text-white">Same-day turn</Badge>}
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Checkout {displayTimestamp(cleaning.checkout_at)} · Deadline {displayTimestamp(cleaning.cleaning_deadline)}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Cleaner: {cleaning.assigned_cleaner_name || cleaning.assigned_cleaner_email || 'Not assigned'}
                          {cleaning.next_check_in_at ? ` · Next check-in ${displayTimestamp(cleaning.next_check_in_at)}` : ' · No next check-in'}
                        </p>
                        {(cleaning.supplies_needed || cleaning.damage_found || cleaning.maintenance_issue_found) && (
                          <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-2 text-xs text-amber-100">
                            {[cleaning.supplies_needed, cleaning.damage_found, cleaning.maintenance_issue_found].filter(Boolean).join(' · ')}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-end">
                      {['needs_scheduling', 'awaiting_confirmation', 'cleaner_declined'].includes(cleaning.status) && (
                        <Button size="sm" variant="outline" onClick={() => operations.issueCleanerLink(cleaning.id)}>Copy cleaner link</Button>
                      )}
                      {cleaning.status === 'awaiting_confirmation' && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => operations.updateCleaning(cleaning.id, { status: 'cleaner_declined', confirmation_status: 'declined', declined_at: new Date().toISOString() }, 'Cleaner decline recorded.')}>Decline</Button>
                          <Button size="sm" onClick={() => operations.updateCleaning(cleaning.id, { status: 'confirmed', confirmation_status: 'confirmed', confirmed_at: new Date().toISOString() }, 'Cleaning confirmed.')}>Confirm</Button>
                        </>
                      )}
                      {cleaning.status === 'confirmed' && <Button size="sm" onClick={() => operations.updateCleaning(cleaning.id, { status: 'in_progress' }, 'Cleaning started.')}>Start</Button>}
                      {cleaning.status === 'in_progress' && <Button size="sm" onClick={() => operations.updateCleaning(cleaning.id, { status: 'completed' }, 'Cleaning complete. Readiness verification is now required.')}>Complete</Button>}
                      {cleaning.status === 'readiness_verification_required' && <Button size="sm" onClick={() => setReadinessCleaning(cleaning)}>Verify readiness</Button>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )) : <EmptyState text="No cleaning tasks yet." />}
          </TabsContent>

          <TabsContent value="maintenance" className="space-y-3">
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="outline" onClick={() => setVendorOpen(true)}><Plus className="mr-2 h-4 w-4" /> Add vendor</Button>
              <Link to="/maintenance"><Button><Plus className="mr-2 h-4 w-4" /> Create maintenance request</Button></Link>
            </div>
            {operations.summary.openMaintenance.length ? operations.summary.openMaintenance.map((request) => (
              <Card key={request.id} className={cn('border-border/70', (request.emergency || request.priority === 'emergency') && 'border-rose-500/50 bg-rose-500/5')}>
                <CardContent className="flex items-start gap-3 p-4">
                  <Wrench className={cn('mt-0.5 h-5 w-5 shrink-0', request.emergency ? 'text-rose-300' : 'text-orange-300')} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{request.title || request.description || 'Maintenance request'}</p>
                      <Badge variant="outline">{request.status.replace(/_/g, ' ')}</Badge>
                      {request.approval_required && <Badge className="bg-amber-500 text-background">Dalton approval required</Badge>}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{request.unit?.name ?? 'Property-wide'} · {request.priority ?? (request.priority_urgent ? 'urgent' : 'routine')}</p>
                    <div className="mt-3 max-w-xs">
                      <Select value={request.vendor_id ?? 'unassigned'} onValueChange={(value) => operations.assignVendor(request.id, value === 'unassigned' ? null : value)}>
                        <SelectTrigger aria-label={`Vendor for ${request.title || request.description || 'maintenance request'}`} className="h-9">
                          <SelectValue placeholder="Assign vendor" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unassigned">No vendor assigned</SelectItem>
                          {operations.vendors.map((vendor) => <SelectItem key={vendor.id} value={vendor.id}>{vendor.name} · {vendor.trade}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Link to="/maintenance"><Button size="sm" variant="outline">Open</Button></Link>
                </CardContent>
              </Card>
            )) : <EmptyState text="No open maintenance." />}

            {operations.vendors.length > 0 && (
              <Card className="border-border/70">
                <CardHeader className="p-4 pb-2"><CardTitle className="text-base">Primary and backup vendors</CardTitle></CardHeader>
                <CardContent className="grid gap-2 p-4 pt-2 sm:grid-cols-2">
                  {operations.vendors.map((vendor) => (
                    <div key={vendor.id} className="rounded-xl border border-border/70 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium">{vendor.name}</p>
                        <Badge variant="outline">{vendor.vendor_rank}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{vendor.trade}{vendor.company ? ` · ${vendor.company}` : ''}</p>
                      <div className="mt-2 flex gap-2">
                        {vendor.phone && <a href={`tel:${vendor.phone}`}><Button size="sm" variant="outline">Call</Button></a>}
                        {vendor.email && <a href={`mailto:${vendor.email}`}><Button size="sm" variant="outline">Email</Button></a>}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="checklists" className="grid gap-4 lg:grid-cols-3">
            {(['morning', 'end_of_day', 'weekly'] as const).map((type) => (
              <ChecklistCard key={type} type={type} existing={todayChecklists.find((checklist) => checklist.checklist_type === type)} save={operations.saveChecklist} />
            ))}
          </TabsContent>

          <TabsContent value="activity">
            <Card className="border-border/70">
              <CardHeader className="p-4 pb-2"><CardTitle className="flex items-center gap-2 text-base"><Activity className="h-4 w-4" /> Activity history</CardTitle></CardHeader>
              <CardContent className="divide-y divide-border/60 p-4 pt-2">
                {operations.activity.length ? operations.activity.map((entry) => (
                  <div key={entry.id} className="flex items-start gap-3 py-3">
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted"><UserRound className="h-4 w-4" /></div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm"><span className="font-medium">{entry.actor_label || (entry.source === 'automation' ? 'Automation' : 'Property staff')}</span> · {entry.action.replace(/_/g, ' ')}</p>
                      <p className="text-xs text-muted-foreground">{entry.record_type} · {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}</p>
                    </div>
                  </div>
                )) : <EmptyState text="No operational activity yet." />}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <section className="grid gap-4 sm:grid-cols-3">
          <Link to="/host-hub" className="group rounded-xl border border-border/70 bg-card p-4 hover:border-secondary/50">
            <CalendarCheck2 className="h-5 w-5 text-secondary" />
            <p className="mt-3 font-medium">Bookings & calendar</p>
            <p className="mt-1 text-xs text-muted-foreground">Existing unit, guest, payment, and availability tools</p>
          </Link>
          <Link to="/maintenance" className="group rounded-xl border border-border/70 bg-card p-4 hover:border-secondary/50">
            <Wrench className="h-5 w-5 text-secondary" />
            <p className="mt-3 font-medium">Maintenance workspace</p>
            <p className="mt-1 text-xs text-muted-foreground">Create, assign, complete, and verify work</p>
          </Link>
          <div className="rounded-xl border border-border/70 bg-card p-4">
            <ClipboardCheck className="h-5 w-5 text-secondary" />
            <p className="mt-3 font-medium">Source of truth</p>
            <p className="mt-1 text-xs text-muted-foreground">Operations here · accounting in QuickBooks · secrets in 1Password</p>
          </div>
        </section>
      </main>

      <AddReservationDialog open={reservationOpen} onOpenChange={setReservationOpen} units={operations.units} onSave={operations.createReservation} />
      <AddVendorDialog open={vendorOpen} onOpenChange={setVendorOpen} onSave={operations.createVendor} />
      <ReadinessDialog cleaning={readinessCleaning} onClose={() => setReadinessCleaning(null)} onVerify={operations.verifyCleaning} />
    </div>
  );
}

function AddVendorDialog({ open, onOpenChange, onSave }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: ReturnType<typeof useOperationsData>['createVendor'];
}) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    company: '',
    trade: 'handyman',
    phone: '',
    email: '',
    vendorRank: 'primary' as 'primary' | 'backup',
    emergencyAvailability: false,
  });
  const trades = ['cleaner', 'handyman', 'plumbing', 'electrical', 'hvac', 'appliance repair', 'internet or networking', 'lawn care', 'snow removal', 'pest control', 'locksmith', 'general contractor', 'emergency maintenance'];
  const save = async () => {
    if (!form.name || !form.trade) return;
    setSaving(true);
    const saved = await onSave(form);
    setSaving(false);
    if (saved) {
      onOpenChange(false);
      setForm({ ...form, name: '', company: '', phone: '', email: '' });
    }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Add a vendor</DialogTitle><DialogDescription>Keep QuickBooks as the accounting record. Store only the operational contact details needed here.</DialogDescription></DialogHeader>
        <div className="grid gap-4 py-2 sm:grid-cols-2">
          <div className="space-y-2"><Label htmlFor="vendor-name">Name</Label><Input id="vendor-name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></div>
          <div className="space-y-2"><Label htmlFor="vendor-company">Company</Label><Input id="vendor-company" value={form.company} onChange={(event) => setForm({ ...form, company: event.target.value })} /></div>
          <div className="space-y-2"><Label>Trade</Label><Select value={form.trade} onValueChange={(trade) => setForm({ ...form, trade })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{trades.map((trade) => <SelectItem key={trade} value={trade}>{trade.replace(/\b\w/g, (letter) => letter.toUpperCase())}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-2"><Label>Primary or backup</Label><Select value={form.vendorRank} onValueChange={(vendorRank: 'primary' | 'backup') => setForm({ ...form, vendorRank })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="primary">Primary</SelectItem><SelectItem value="backup">Backup</SelectItem></SelectContent></Select></div>
          <div className="space-y-2"><Label htmlFor="vendor-phone">Phone</Label><Input id="vendor-phone" inputMode="tel" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></div>
          <div className="space-y-2"><Label htmlFor="vendor-email">Email</Label><Input id="vendor-email" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></div>
          <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-border/70 p-3 sm:col-span-2">
            <Checkbox checked={form.emergencyAvailability} onCheckedChange={(value) => setForm({ ...form, emergencyAvailability: value === true })} />
            <span className="text-sm">Available for emergencies</span>
          </label>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button disabled={saving || !form.name} onClick={save}>{saving ? 'Saving…' : 'Add vendor'}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ReservationManageCard({ reservation, update }: {
  reservation: OperationalReservation;
  update: ReturnType<typeof useOperationsData>['updateReservation'];
}) {
  const [checkInDate, setCheckInDate] = useState(reservation.check_in_date);
  const [checkOutDate, setCheckOutDate] = useState(reservation.check_out_date ?? '');
  const datesChanged = checkInDate !== reservation.check_in_date || checkOutDate !== (reservation.check_out_date ?? '');
  return (
    <Card className="border-border/70">
      <CardContent className="p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-semibold">{reservation.unit?.name ?? 'Unit'}</p>
              <Badge variant="outline">{SOURCE_LABELS[reservation.booking_source ?? 'other'] ?? reservation.booking_source}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">{reservation.guest?.name ?? 'Guest not linked'}</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:w-[330px]">
            <div><Label className="text-xs">Check-in</Label><Input type="date" value={checkInDate} onChange={(event) => setCheckInDate(event.target.value)} /></div>
            <div><Label className="text-xs">Check-out</Label><Input type="date" value={checkOutDate} onChange={(event) => setCheckOutDate(event.target.value)} /></div>
          </div>
          <Select value={reservation.status} onValueChange={(status) => update(reservation.id, { status }, `Reservation marked ${status.replace(/_/g, ' ')}.`)}>
            <SelectTrigger className="min-h-10 lg:w-36" aria-label={`Status for ${reservation.guest?.name ?? 'reservation'}`}><SelectValue /></SelectTrigger>
            <SelectContent>
              {['inquiry', 'tentative', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'no_show', 'extended'].map((status) => (
                <SelectItem key={status} value={status}>{status.replace(/_/g, ' ')}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="grid grid-cols-2 gap-2 lg:flex">
            <Button
              variant="outline"
              disabled={!datesChanged || !checkInDate || !checkOutDate}
              onClick={() => update(reservation.id, { check_in_date: checkInDate, check_out_date: checkOutDate }, 'Reservation dates and linked cleaning updated.')}
            >
              Save dates
            </Button>
            <Button
              variant="ghost"
              className="text-destructive hover:text-destructive"
              onClick={() => {
                if (window.confirm('Cancel this reservation and its incomplete cleaning task?')) {
                  update(reservation.id, { status: 'cancelled' }, 'Reservation and incomplete cleaning cancelled.');
                }
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex min-h-24 items-center justify-center rounded-xl border border-dashed border-border/70 px-4 text-center text-sm text-muted-foreground">
      <CheckCircle2 className="mr-2 h-4 w-4 text-emerald-300" /> {text}
    </div>
  );
}
