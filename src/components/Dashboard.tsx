import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { usePropertyData } from '@/hooks/usePropertyData';
import { useAuth } from '@/hooks/useAuth';
import StatsOverview from '@/components/StatsOverview';
import SortableUnitGrid from '@/components/SortableUnitGrid';
import PaymentCalendar from '@/components/PaymentCalendar';
import BookingTimeline from '@/components/BookingTimeline';
import GuestDialog from '@/components/GuestDialog';
import RecordPaymentDialog from '@/components/RecordPaymentDialog';
import SchedulePaymentsDialog from '@/components/SchedulePaymentsDialog';
import AddUnitDialog from '@/components/AddUnitDialog';
import EditUnitDialog from '@/components/EditUnitDialog';
import LeaseHistoryDialog from '@/components/LeaseHistoryDialog';
import FutureGuestDialog from '@/components/FutureGuestDialog';
import OnboardingTutorial, { useOnboardingState } from '@/components/OnboardingTutorial';
import PullToRefresh from '@/components/PullToRefresh';

import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Mountain, LayoutGrid, CalendarDays, DollarSign, HelpCircle, LogOut, Trash2, Home, UserPlus } from 'lucide-react';
import { Guest, Payment, UnitStatus } from '@/types/property';
import { toast } from 'sonner';

type ViewMode = 'units' | 'calendar';
type GuestDialogMode = { unitId: string; mode: 'add' | 'edit' } | null;

interface DashboardProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

export default function Dashboard({ viewMode, onViewModeChange }: DashboardProps) {
  const { units, loading, refresh, addUnit, updateUnit, reorderUnits, removeUnit, addGuest, addFutureGuest, updateFutureGuest, deleteFutureGuest, deleteGuest, updateGuest, removeGuest, addPayment, addPaymentForGuest, updatePayment, deletePayment, markPaymentPaid, markPaymentUnpaid, resetAllData, stats, allPaymentEvents, allBookingEvents } = usePropertyData();
  const { signOut } = useAuth();
  const { isComplete: onboardingComplete } = useOnboardingState();
  const [showOnboarding, setShowOnboarding] = useState(!onboardingComplete);

  const handleRefresh = useCallback(async () => {
    await refresh();
  }, [refresh]);

  const [guestDialog, setGuestDialog] = useState<GuestDialogMode>(null);
  const [paymentDialogUnit, setPaymentDialogUnit] = useState<string | null>(null);
  const [showAddUnit, setShowAddUnit] = useState(false);
  const [editUnitId, setEditUnitId] = useState<string | null>(null);
  const [deleteUnitId, setDeleteUnitId] = useState<string | null>(null);
  const [historyUnitId, setHistoryUnitId] = useState<string | null>(null);
  const [schedulePaymentsTarget, setSchedulePaymentsTarget] = useState<{ unitId: string; futureGuestId?: string } | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [futureGuestDialog, setFutureGuestDialog] = useState<{ unitId: string; guestId?: string } | null>(null);
  const [deleteFutureGuestId, setDeleteFutureGuestId] = useState<string | null>(null);
  const [deleteCurrentGuestTarget, setDeleteCurrentGuestTarget] = useState<{ unitId: string; guestId: string; guestName: string } | null>(null);

  const activeGuestUnit = guestDialog ? units.find(u => u.id === guestDialog.unitId) : null;
  const activePaymentUnit = units.find(u => u.id === paymentDialogUnit);
  const editUnit = units.find(u => u.id === editUnitId);
  const historyUnit = units.find(u => u.id === historyUnitId);
  const scheduleUnit = units.find(u => u.id === schedulePaymentsTarget?.unitId);
  const scheduleFutureGuest = schedulePaymentsTarget?.futureGuestId
    ? scheduleUnit?.futureGuests.find(fg => fg.id === schedulePaymentsTarget.futureGuestId)
    : null;

  const handleGuestSave = (guest: Guest) => {
    if (!guestDialog) return;
    if (guestDialog.mode === 'edit') {
      updateGuest(guestDialog.unitId, guest);
    } else {
      addGuest(guestDialog.unitId, guest);
    }
  };

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="min-h-screen pattern-bg">
      {/* Header */}
      <header className="border-b border-border/40 sticky top-0 z-10" style={{ background: 'linear-gradient(180deg, hsl(222 47% 10%), hsl(222 47% 8%))' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 rounded-lg bg-secondary/15">
              <Mountain className="h-5 w-5 sm:h-6 sm:w-6 text-secondary" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-heading font-bold tracking-tight text-foreground">Homestead Hill</h1>
              <p className="text-[9px] sm:text-[10px] text-muted-foreground font-body uppercase tracking-widest">Vincennes, Indiana</p>
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <div className="hidden sm:flex items-center bg-muted/50 rounded-lg p-0.5">
              <Button
                size="sm"
                variant="ghost"
                className={`h-8 px-3 font-body text-xs transition-colors ${
                  viewMode === 'units'
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-transparent'
                }`}
                onClick={() => onViewModeChange('units')}
              >
                <LayoutGrid className="h-3.5 w-3.5 mr-1.5" />
                Units
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className={`h-8 px-3 font-body text-xs transition-colors ${
                  viewMode === 'calendar'
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-transparent'
                }`}
                onClick={() => onViewModeChange('calendar')}
              >
                <CalendarDays className="h-3.5 w-3.5 mr-1.5" />
                Calendar
              </Button>
            </div>
            <Link to="/finances" className="hidden sm:block">
              <Button
                size="sm"
                variant="ghost"
                className="font-body text-muted-foreground hover:text-foreground hover:bg-muted/50 px-3"
              >
                <DollarSign className="h-4 w-4 mr-1.5" />
                Finances
              </Button>
            </Link>
            <Button
              size="icon"
              variant="ghost"
              className="h-9 w-9 text-destructive/70 hover:text-destructive hover:bg-destructive/10"
              onClick={() => setShowResetConfirm(true)}
              title="Reset All Data"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-9 w-9 text-muted-foreground hover:text-foreground"
              onClick={() => setShowOnboarding(true)}
              title="Help / Tutorial"
            >
              <HelpCircle className="h-5 w-5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="hidden sm:inline-flex h-9 w-9 text-muted-foreground hover:text-foreground"
              onClick={signOut}
              title="Sign Out"
            >
              <LogOut className="h-4 w-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  className="font-body gold-gradient border-0 text-background font-semibold hover:opacity-90 h-9 w-9 sm:w-auto sm:h-auto p-0 sm:px-3 sm:py-1.5"
                >
                  <Plus className="h-5 w-5 sm:h-4 sm:w-4 sm:mr-1.5" />
                  <span className="hidden sm:inline">Add</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="font-body">
                <DropdownMenuItem onClick={() => setShowAddUnit(true)}>
                  <Home className="h-4 w-4 mr-2" />
                  Add Unit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFutureGuestDialog({ unitId: '' })}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Book Future Guest
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 pb-24 sm:pb-6 space-y-5 sm:space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-muted-foreground font-body text-sm animate-pulse">Loading property data...</div>
          </div>
        ) : (
        <>
        {viewMode === 'units' && (
          <StatsOverview
            totalMonthlyIncome={stats.totalMonthlyIncome}
            occupiedCount={stats.occupiedCount}
            vacantCount={stats.vacantCount}
            totalUnits={stats.totalUnits}
          />
        )}

        {viewMode === 'units' ? (
          <div>
            <h2 className="font-heading text-base font-semibold mb-4">All Units ({units.length})</h2>
            <SortableUnitGrid
              units={units}
              onReorder={reorderUnits}
              onAddGuest={id => setGuestDialog({ unitId: id, mode: 'add' })}
              onEditGuest={id => setGuestDialog({ unitId: id, mode: 'edit' })}
              onEditUnit={id => setEditUnitId(id)}
              onRecordPayment={id => setPaymentDialogUnit(id)}
              onMarkPaid={markPaymentPaid}
              onRemoveGuest={removeGuest}
              onDeleteUnit={id => setDeleteUnitId(id)}
              onViewHistory={id => setHistoryUnitId(id)}
              onSchedulePayments={(id, futureGuestId) => setSchedulePaymentsTarget({ unitId: id, futureGuestId })}
              onEditFutureGuest={(unitId, guestId) => setFutureGuestDialog({ unitId, guestId })}
              onDeleteFutureGuest={id => setDeleteFutureGuestId(id)}
              onDeleteCurrentGuest={(unitId) => {
                const unit = units.find(u => u.id === unitId) as any;
                const guestId = unit?._guestDbId;
                if (guestId) {
                  setDeleteCurrentGuestTarget({ unitId, guestId, guestName: unit?.currentGuest?.name ?? 'this guest' });
                }
              }}
            />
          </div>
        ) : (
          <div className="space-y-6">
            <BookingTimeline
              units={units}
              paymentEvents={allPaymentEvents}
              onMarkPaid={markPaymentPaid}
              onEditCurrentGuest={id => setGuestDialog({ unitId: id, mode: 'edit' })}
              onEditFutureGuest={(unitId, guestId) => setFutureGuestDialog({ unitId, guestId })}
              onAddGuest={id => setGuestDialog({ unitId: id, mode: 'add' })}
              onAddFutureGuest={id => setFutureGuestDialog({ unitId: id })}
            />
            <PaymentCalendar
              events={allPaymentEvents}
              bookingEvents={allBookingEvents}
              onMarkPaid={markPaymentPaid}
              onMarkUnpaid={markPaymentUnpaid}
              onUpdatePayment={updatePayment}
              onDeletePayment={deletePayment}
              onAddPayment={addPayment}
              onDeleteGuest={deleteGuest}
              occupiedUnits={units
                .filter(u => u.currentGuest)
                .map(u => ({
                  unitId: u.id,
                  unitName: u.name,
                  guestName: u.currentGuest!.name,
                  monthlyRate: u.currentGuest!.monthlyRate,
                }))}
            />
          </div>
        )}
        </>
        )}
      </main>

      {/* Dialogs */}
      <GuestDialog
        open={!!guestDialog}
        onClose={() => setGuestDialog(null)}
        onSave={handleGuestSave}
        unitName={activeGuestUnit?.name ?? ''}
        existingGuest={guestDialog?.mode === 'edit' ? activeGuestUnit?.currentGuest : null}
      />

      <RecordPaymentDialog
        open={!!paymentDialogUnit}
        onClose={() => setPaymentDialogUnit(null)}
        onSave={(payment: Payment) => paymentDialogUnit && addPayment(paymentDialogUnit, payment)}
        unitName={activePaymentUnit?.name ?? ''}
        defaultAmount={activePaymentUnit?.currentGuest?.monthlyRate}
      />

      <AddUnitDialog
        open={showAddUnit}
        onClose={() => setShowAddUnit(false)}
        onSave={addUnit}
      />

      <FutureGuestDialog
        open={!!futureGuestDialog}
        onClose={() => setFutureGuestDialog(null)}
        onSave={(unitId, guest) => {
          if (futureGuestDialog?.guestId) {
            updateFutureGuest(futureGuestDialog.guestId, guest, true);
            toast.success(`Booking updated for ${guest.name}`);
          } else {
            addFutureGuest(unitId, guest);
            toast.success(`Future booking added for ${guest.name}`);
          }
        }}
        units={units}
        preselectedUnitId={futureGuestDialog?.unitId || null}
        existingGuest={
          futureGuestDialog?.guestId
            ? units.flatMap(u => u.futureGuests).find(fg => fg.id === futureGuestDialog.guestId) ?? null
            : null
        }
      />

      <EditUnitDialog
        open={!!editUnitId}
        onClose={() => setEditUnitId(null)}
        onSave={(name: string, status: UnitStatus) => {
          if (editUnitId) updateUnit(editUnitId, name, status);
        }}
        currentName={editUnit?.name ?? ''}
        currentStatus={editUnit?.status ?? 'vacant'}
      />

      <LeaseHistoryDialog
        open={!!historyUnitId}
        onClose={() => setHistoryUnitId(null)}
        unitId={historyUnitId ?? ''}
        unitName={historyUnit?.name ?? ''}
        onDeleteGuest={deleteGuest}
      />

      <SchedulePaymentsDialog
        open={!!schedulePaymentsTarget}
        onClose={() => setSchedulePaymentsTarget(null)}
        unitId={schedulePaymentsTarget?.unitId ?? ''}
        unitName={
          scheduleFutureGuest
            ? `${scheduleUnit?.name ?? ''} — ${scheduleFutureGuest.name}`
            : scheduleUnit?.name ?? ''
        }
        payments={scheduleFutureGuest?.payments ?? scheduleUnit?.currentGuest?.payments ?? []}
        defaultAmount={scheduleFutureGuest?.monthlyRate ?? scheduleUnit?.currentGuest?.monthlyRate}
        onAddPayment={
          scheduleFutureGuest
            ? (unitId, payment) => addPaymentForGuest(scheduleFutureGuest.id, unitId, payment)
            : addPayment
        }
        onUpdatePayment={updatePayment}
        onDeletePayment={deletePayment}
        onMarkPaid={markPaymentPaid}
      />

      <AlertDialog open={!!deleteUnitId} onOpenChange={open => !open && setDeleteUnitId(null)}>
        <AlertDialogContent className="glass-card border-border/60">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-heading">Delete Unit</AlertDialogTitle>
            <AlertDialogDescription className="font-body text-sm">
              Are you sure you want to delete <span className="font-semibold text-foreground">{units.find(u => u.id === deleteUnitId)?.name}</span>? This will also remove any associated guest and payment records. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="font-body text-xs">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="font-body text-xs bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteUnitId) {
                  removeUnit(deleteUnitId);
                  setDeleteUnitId(null);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
       </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteFutureGuestId} onOpenChange={open => !open && setDeleteFutureGuestId(null)}>
        <AlertDialogContent className="glass-card border-border/60">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-heading">Delete Future Booking</AlertDialogTitle>
            <AlertDialogDescription className="font-body text-sm">
              Are you sure you want to delete this future booking? Any scheduled payments for this guest will also be removed. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="font-body text-xs">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="font-body text-xs bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteFutureGuestId) {
                  deleteFutureGuest(deleteFutureGuestId);
                  setDeleteFutureGuestId(null);
                  toast.success('Future booking deleted');
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteCurrentGuestTarget} onOpenChange={open => !open && setDeleteCurrentGuestTarget(null)}>
        <AlertDialogContent className="glass-card border-border/60">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-heading">Delete Guest</AlertDialogTitle>
            <AlertDialogDescription className="font-body text-sm">
              This will permanently delete <span className="font-semibold text-foreground">{deleteCurrentGuestTarget?.guestName}</span> and all their payment records from everywhere — calendar, reports, and payment history. The unit will be set to vacant. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="font-body text-xs">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="font-body text-xs bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteCurrentGuestTarget) {
                  deleteGuest(deleteCurrentGuestTarget.guestId);
                  setDeleteCurrentGuestTarget(null);
                  toast.success(`${deleteCurrentGuestTarget.guestName} deleted`);
                }
              }}
            >
              Delete Guest
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <OnboardingTutorial open={showOnboarding} onClose={() => setShowOnboarding(false)} />

      <AlertDialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
        <AlertDialogContent className="glass-card border-border/60">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-heading">Reset All Data</AlertDialogTitle>
            <AlertDialogDescription className="font-body text-sm">
              This will permanently delete <span className="font-semibold text-foreground">all units, guests, and payment records</span>. You'll start with a completely clean slate. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="font-body text-xs">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="font-body text-xs bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                await resetAllData();
                setShowResetConfirm(false);
                toast.success('All data has been reset');
              }}
            >
              Reset Everything
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      
    </div>
    </PullToRefresh>
  );
}
