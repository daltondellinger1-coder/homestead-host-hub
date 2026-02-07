import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { SOURCE_LABELS, BookingSource } from '@/types/property';
import { Calendar, DollarSign, Shield, CheckCircle2, XCircle, StickyNote, User } from 'lucide-react';

interface ArchivedGuest {
  id: string;
  name: string;
  source: BookingSource;
  checkIn: string;
  checkOut: string;
  monthlyRate: number;
  securityDeposit: number;
  securityDepositPaid: boolean;
  notes?: string;
  payments: {
    id: string;
    amount: number;
    date: string;
    status: string;
    note?: string;
  }[];
}

interface LeaseHistoryDialogProps {
  open: boolean;
  onClose: () => void;
  unitId: string;
  unitName: string;
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(amount);

const formatDate = (iso: string) => {
  if (!iso) return 'Month-to-month';
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

export default function LeaseHistoryDialog({ open, onClose, unitId, unitName }: LeaseHistoryDialogProps) {
  const [pastGuests, setPastGuests] = useState<ArchivedGuest[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !unitId) return;

    const fetchHistory = async () => {
      setLoading(true);

      const { data: guests } = await supabase
        .from('guests')
        .select('*')
        .eq('unit_id', unitId)
        .eq('is_current', false)
        .order('check_in', { ascending: false });

      if (!guests || guests.length === 0) {
        setPastGuests([]);
        setLoading(false);
        return;
      }

      const guestIds = guests.map(g => g.id);
      const { data: payments } = await supabase
        .from('payments')
        .select('*')
        .in('guest_id', guestIds)
        .order('date', { ascending: false });

      const paymentsByGuest = new Map<string, ArchivedGuest['payments']>();
      for (const p of payments ?? []) {
        const list = paymentsByGuest.get(p.guest_id) ?? [];
        list.push({
          id: p.id,
          amount: Number(p.amount),
          date: p.date,
          status: p.status,
          note: p.note ?? undefined,
        });
        paymentsByGuest.set(p.guest_id, list);
      }

      setPastGuests(
        guests.map(g => ({
          id: g.id,
          name: g.name,
          source: g.source as BookingSource,
          checkIn: g.check_in,
          checkOut: g.check_out ?? '',
          monthlyRate: Number(g.monthly_rate),
          securityDeposit: Number(g.security_deposit),
          securityDepositPaid: g.security_deposit_paid,
          notes: g.notes ?? undefined,
          payments: paymentsByGuest.get(g.id) ?? [],
        }))
      );
      setLoading(false);
    };

    fetchHistory();
  }, [open, unitId]);

  const totalCollected = pastGuests.reduce(
    (sum, g) => sum + g.payments.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount, 0),
    0
  );

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-lg font-body max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-heading">
            {unitName} — Lease History
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="py-10 text-center text-muted-foreground text-sm animate-pulse">
            Loading history…
          </div>
        ) : pastGuests.length === 0 ? (
          <div className="py-10 text-center text-muted-foreground text-sm">
            No past guests for this unit yet.
          </div>
        ) : (
          <>
            {/* Summary */}
            <div className="flex items-center gap-4 text-xs text-muted-foreground pb-2 border-b border-border/50">
              <span>{pastGuests.length} past {pastGuests.length === 1 ? 'guest' : 'guests'}</span>
              <span>·</span>
              <span>{formatCurrency(totalCollected)} total collected</span>
            </div>

            <ScrollArea className="flex-1 -mx-6 px-6">
              <div className="space-y-4 py-2">
                {pastGuests.map(guest => (
                  <div
                    key={guest.id}
                    className="rounded-lg border border-border/50 bg-muted/20 p-4 space-y-2.5"
                  >
                    {/* Guest header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <User className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="font-medium text-sm">{guest.name}</span>
                      </div>
                      <Badge variant="secondary" className="text-[11px]">
                        {SOURCE_LABELS[guest.source]}
                      </Badge>
                    </div>

                    {/* Dates */}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5 shrink-0" />
                      <span>{formatDate(guest.checkIn)} — {formatDate(guest.checkOut)}</span>
                    </div>

                    {/* Rate */}
                    <div className="flex items-center gap-2 text-xs">
                      <DollarSign className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span>{formatCurrency(guest.monthlyRate)}<span className="text-muted-foreground"> /mo</span></span>
                    </div>

                    {/* Deposit */}
                    {guest.securityDeposit > 0 && (
                      <div className="flex items-center gap-2 text-xs">
                        <Shield className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="flex items-center gap-1">
                          {formatCurrency(guest.securityDeposit)} deposit
                          {guest.securityDepositPaid ? (
                            <CheckCircle2 className="h-3 w-3 text-success" />
                          ) : (
                            <XCircle className="h-3 w-3 text-destructive" />
                          )}
                        </span>
                      </div>
                    )}

                    {/* Notes */}
                    {guest.notes && (
                      <div className="flex items-start gap-2 text-xs text-muted-foreground">
                        <StickyNote className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                        <span>{guest.notes}</span>
                      </div>
                    )}

                    {/* Payment summary */}
                    {guest.payments.length > 0 && (
                      <div className="pt-2 border-t border-border/40 space-y-1">
                        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                          Payments ({guest.payments.length})
                        </p>
                        <div className="space-y-1">
                          {guest.payments.slice(0, 5).map(p => (
                            <div key={p.id} className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-2">
                                <Badge
                                  variant={p.status === 'paid' ? 'default' : 'secondary'}
                                  className="text-[10px] py-0 px-1.5"
                                >
                                  {p.status}
                                </Badge>
                                <span>{formatDate(p.date)}</span>
                              </div>
                              <span className="font-medium">{formatCurrency(p.amount)}</span>
                            </div>
                          ))}
                          {guest.payments.length > 5 && (
                            <p className="text-[10px] text-muted-foreground">
                              +{guest.payments.length - 5} more payments
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
