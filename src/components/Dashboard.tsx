import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { usePropertyData } from '@/hooks/usePropertyData';
import StatsOverview from '@/components/StatsOverview';
import UnitCard from '@/components/UnitCard';
import PaymentCalendar from '@/components/PaymentCalendar';
import GuestDialog from '@/components/GuestDialog';
import RecordPaymentDialog from '@/components/RecordPaymentDialog';
import AddUnitDialog from '@/components/AddUnitDialog';
import PullToRefresh from '@/components/PullToRefresh';

import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Mountain, LayoutGrid, CalendarDays, History, BarChart3 } from 'lucide-react';
import { Guest, Payment } from '@/types/property';

type ViewMode = 'units' | 'calendar';
type GuestDialogMode = { unitId: string; mode: 'add' | 'edit' } | null;

interface DashboardProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

export default function Dashboard({ viewMode, onViewModeChange }: DashboardProps) {
  const { units, loading, refresh, addUnit, removeUnit, addGuest, updateGuest, removeGuest, addPayment, markPaymentPaid, stats, allPaymentEvents, allBookingEvents } = usePropertyData();

  const handleRefresh = useCallback(async () => {
    await refresh();
  }, [refresh]);

  const [guestDialog, setGuestDialog] = useState<GuestDialogMode>(null);
  const [paymentDialogUnit, setPaymentDialogUnit] = useState<string | null>(null);
  const [showAddUnit, setShowAddUnit] = useState(false);
  const [deleteUnitId, setDeleteUnitId] = useState<string | null>(null);

  const activeGuestUnit = guestDialog ? units.find(u => u.id === guestDialog.unitId) : null;
  const activePaymentUnit = units.find(u => u.id === paymentDialogUnit);

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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-secondary/15">
              <Mountain className="h-6 w-6 text-secondary" />
            </div>
            <div>
              <h1 className="text-xl font-heading font-bold tracking-tight text-foreground">Homestead Hill</h1>
              <p className="text-[10px] text-muted-foreground font-body uppercase tracking-widest">Vincennes, Indiana</p>
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
            <Link to="/reports">
              <Button
                size="sm"
                variant="ghost"
                className="font-body text-muted-foreground hover:text-foreground hover:bg-muted/50 px-2 sm:px-3"
              >
                <BarChart3 className="h-4 w-4 sm:mr-1.5" />
                <span className="hidden sm:inline">Reports</span>
              </Button>
            </Link>
            <Link to="/payments">
              <Button
                size="sm"
                variant="ghost"
                className="font-body text-muted-foreground hover:text-foreground hover:bg-muted/50 px-2 sm:px-3"
              >
                <History className="h-4 w-4 sm:mr-1.5" />
                <span className="hidden sm:inline">History</span>
              </Button>
            </Link>
            <Button
              size="sm"
              className="font-body gold-gradient border-0 text-background font-semibold hover:opacity-90 px-2 sm:px-3"
              onClick={() => setShowAddUnit(true)}
            >
              <Plus className="h-4 w-4 sm:mr-1.5" />
              <span className="hidden sm:inline">Add Unit</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 sm:pb-6 space-y-6">
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
            totalDepositsHeld={stats.totalDepositsHeld}
            nextVacancy={stats.nextVacancy}
          />
        )}

        {viewMode === 'units' ? (
          <>
            {stats.upcomingPayments.length > 0 && (
              <div className="glass-card rounded-xl p-5">
                <h2 className="font-heading text-base font-semibold mb-3">Upcoming Payments</h2>
                <div className="space-y-1.5">
                  {stats.upcomingPayments.slice(0, 8).map(p => (
                    <div key={p.id} className="flex items-center justify-between text-xs bg-muted/40 rounded-md px-4 py-2.5">
                      <div>
                        <span className="font-medium">{p.unitName}</span>
                        <span className="text-muted-foreground"> · {p.guestName}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-medium">
                          {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(p.amount)}
                        </span>
                        <span className="text-muted-foreground ml-2">
                          {new Date(p.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h2 className="font-heading text-base font-semibold mb-4">All Units ({units.length})</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {units.map((unit, i) => (
                  <UnitCard
                    key={unit.id}
                    unit={unit}
                    index={i}
                    onAddGuest={id => setGuestDialog({ unitId: id, mode: 'add' })}
                    onEditGuest={id => setGuestDialog({ unitId: id, mode: 'edit' })}
                    onRecordPayment={id => setPaymentDialogUnit(id)}
                    onMarkPaid={markPaymentPaid}
                    onRemoveGuest={removeGuest}
                    onDeleteUnit={id => setDeleteUnitId(id)}
                  />
                ))}
              </div>
            </div>
          </>
        ) : (
          <PaymentCalendar events={allPaymentEvents} bookingEvents={allBookingEvents} onMarkPaid={markPaymentPaid} />
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

      
    </div>
    </PullToRefresh>
  );
}
