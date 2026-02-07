import { useState } from 'react';
import { usePropertyData } from '@/hooks/usePropertyData';
import StatsOverview from '@/components/StatsOverview';
import UnitCard from '@/components/UnitCard';
import AddGuestDialog from '@/components/AddGuestDialog';
import RecordPaymentDialog from '@/components/RecordPaymentDialog';
import AddUnitDialog from '@/components/AddUnitDialog';
import { Button } from '@/components/ui/button';
import { Plus, Mountain } from 'lucide-react';
import { Guest, Payment } from '@/types/property';

export default function Dashboard() {
  const { units, addUnit, addGuest, removeGuest, addPayment, markPaymentPaid, stats } = usePropertyData();

  const [guestDialogUnit, setGuestDialogUnit] = useState<string | null>(null);
  const [paymentDialogUnit, setPaymentDialogUnit] = useState<string | null>(null);
  const [showAddUnit, setShowAddUnit] = useState(false);

  const activeGuestUnit = units.find(u => u.id === guestDialogUnit);
  const activePaymentUnit = units.find(u => u.id === paymentDialogUnit);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Mountain className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-heading font-bold tracking-tight">Homestead Hill</h1>
              <p className="text-xs text-muted-foreground font-body">Property Management</p>
            </div>
          </div>
          <Button size="sm" onClick={() => setShowAddUnit(true)} className="font-body">
            <Plus className="h-4 w-4 mr-1.5" />
            Add Unit
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Stats */}
        <StatsOverview
          totalMonthlyIncome={stats.totalMonthlyIncome}
          occupiedUnits={stats.occupiedUnits}
          vacantUnits={stats.vacantUnits}
          totalDepositsHeld={stats.totalDepositsHeld}
          nextVacancy={stats.nextVacancy}
        />

        {/* Upcoming Payments */}
        {stats.upcomingPayments.length > 0 && (
          <div className="glass-card rounded-xl p-5">
            <h2 className="font-heading text-lg font-semibold mb-3">Upcoming Payments</h2>
            <div className="space-y-2">
              {stats.upcomingPayments.map(p => (
                <div key={p.id} className="flex items-center justify-between text-sm bg-primary/5 rounded-md px-4 py-2.5">
                  <div>
                    <span className="font-medium">{p.unitName}</span>
                    <span className="text-muted-foreground"> · {p.guestName}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-medium">
                      {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(p.amount)}
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

        {/* Unit Grid */}
        <div>
          <h2 className="font-heading text-lg font-semibold mb-4">Units</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {units.map((unit, i) => (
              <UnitCard
                key={unit.id}
                unit={unit}
                index={i}
                onAddGuest={id => setGuestDialogUnit(id)}
                onRecordPayment={id => setPaymentDialogUnit(id)}
                onMarkPaid={markPaymentPaid}
                onRemoveGuest={removeGuest}
              />
            ))}
          </div>
        </div>
      </main>

      {/* Dialogs */}
      <AddGuestDialog
        open={!!guestDialogUnit}
        onClose={() => setGuestDialogUnit(null)}
        onSave={(guest: Guest) => guestDialogUnit && addGuest(guestDialogUnit, guest)}
        unitName={activeGuestUnit?.name ?? ''}
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
