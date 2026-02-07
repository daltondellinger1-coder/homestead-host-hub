import { useState } from 'react';
import { Link } from 'react-router-dom';
import { usePropertyData } from '@/hooks/usePropertyData';
import StatsOverview from '@/components/StatsOverview';
import UnitCard from '@/components/UnitCard';
import PaymentCalendar from '@/components/PaymentCalendar';
import GuestDialog from '@/components/GuestDialog';
import RecordPaymentDialog from '@/components/RecordPaymentDialog';
import AddUnitDialog from '@/components/AddUnitDialog';
import { Button } from '@/components/ui/button';
import { Plus, Mountain, LayoutGrid, CalendarDays, History, BarChart3 } from 'lucide-react';
import { Guest, Payment } from '@/types/property';

type ViewMode = 'units' | 'calendar';
type GuestDialogMode = { unitId: string; mode: 'add' | 'edit' } | null;

export default function Dashboard() {
  const { units, loading, addUnit, addGuest, updateGuest, removeGuest, addPayment, markPaymentPaid, stats, allPaymentEvents, allBookingEvents } = usePropertyData();
  

  const [guestDialog, setGuestDialog] = useState<GuestDialogMode>(null);
  const [paymentDialogUnit, setPaymentDialogUnit] = useState<string | null>(null);
  const [showAddUnit, setShowAddUnit] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('units');

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
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center bg-muted/50 rounded-lg p-0.5">
              <Button
                size="sm"
                variant="ghost"
                className={`h-8 px-3 font-body text-xs transition-colors ${
                  viewMode === 'units'
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-transparent'
                }`}
                onClick={() => setViewMode('units')}
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
                onClick={() => setViewMode('calendar')}
              >
                <CalendarDays className="h-3.5 w-3.5 mr-1.5" />
                Calendar
              </Button>
            </div>
            <Link to="/reports">
              <Button
                size="sm"
                variant="ghost"
                className="font-body text-muted-foreground hover:text-foreground hover:bg-muted/50"
              >
                <BarChart3 className="h-4 w-4 mr-1.5" />
                Reports
              </Button>
            </Link>
            <Link to="/payments">
              <Button
                size="sm"
                variant="ghost"
                className="font-body text-muted-foreground hover:text-foreground hover:bg-muted/50"
              >
                <History className="h-4 w-4 mr-1.5" />
                History
              </Button>
            </Link>
            <Button
              size="sm"
              className="font-body gold-gradient border-0 text-background font-semibold hover:opacity-90"
              onClick={() => setShowAddUnit(true)}
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Add Unit
            </Button>
          </div>
        </div>
      </header>

      {/* Mobile view toggle */}
      <div className="sm:hidden px-4 pt-4">
        <div className="flex items-center bg-muted rounded-lg p-0.5">
          <Button
            size="sm"
            variant="ghost"
            className={`flex-1 h-8 font-body text-xs ${viewMode === 'units' ? 'bg-card shadow-sm' : ''}`}
            onClick={() => setViewMode('units')}
          >
            <LayoutGrid className="h-3.5 w-3.5 mr-1.5" />
            Units
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className={`flex-1 h-8 font-body text-xs ${viewMode === 'calendar' ? 'bg-card shadow-sm' : ''}`}
            onClick={() => setViewMode('calendar')}
          >
            <CalendarDays className="h-3.5 w-3.5 mr-1.5" />
            Calendar
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-muted-foreground font-body text-sm animate-pulse">Loading property data...</div>
          </div>
        ) : (
        <>
        <StatsOverview
          totalMonthlyIncome={stats.totalMonthlyIncome}
          occupiedCount={stats.occupiedCount}
          vacantCount={stats.vacantCount}
          totalUnits={stats.totalUnits}
          totalDepositsHeld={stats.totalDepositsHeld}
          nextVacancy={stats.nextVacancy}
        />

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
    </div>
  );
}
