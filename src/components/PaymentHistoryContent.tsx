import { Fragment, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { usePropertyData } from '@/hooks/usePropertyData';
import { SOURCE_LABELS, PAYMENT_METHOD_LABELS, PAYMENT_METHODS, PaymentMethod } from '@/types/property';
import { summarizeMethod } from '@/lib/paymentMethods';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Filter, X, Trash2, AlertTriangle, Download } from 'lucide-react';
import { toast } from 'sonner';
import BulkDeletePaymentsDialog from '@/components/BulkDeletePaymentsDialog';
import { buildPaymentsCsv, downloadCsv, DateBasis } from '@/lib/paymentExport';

type SortField = 'date' | 'amount' | 'unit';
type SortDir = 'asc' | 'desc';

export default function PaymentHistoryContent() {
  const { units, loading, allPaymentEvents, bulkDeletePayments } = usePropertyData();
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [searchParams] = useSearchParams();

  const initialStatus = searchParams.get('status') ?? 'all';
  const initialFrom = searchParams.get('from') ?? '';
  const initialTo = searchParams.get('to') ?? '';
  const initialSort = (searchParams.get('sort') as SortField) ?? 'date';
  const initialDir = (searchParams.get('dir') as SortDir) ?? 'desc';

  const [unitFilter, setUnitFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>(initialStatus);
  const [methodFilter, setMethodFilter] = useState<string>(searchParams.get('method') ?? 'all');
  const [dateFrom, setDateFrom] = useState(initialFrom);
  const [dateTo, setDateTo] = useState(initialTo);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>(initialSort);
  const [sortDir, setSortDir] = useState<SortDir>(initialDir);
  const [dateBasis, setDateBasis] = useState<DateBasis>(
    (searchParams.get('basis') as DateBasis) === 'due' ? 'due' : 'received'
  );

  const uniqueUnits = useMemo(() => {
    const names = [...new Set(allPaymentEvents.map(e => e.unitName))];
    return names.sort((a, b) => {
      const numA = parseInt(a.replace(/\D/g, '')) || 0;
      const numB = parseInt(b.replace(/\D/g, '')) || 0;
      return numA - numB;
    });
  }, [allPaymentEvents]);

  const uniqueSources = useMemo(() => {
    return [...new Set(allPaymentEvents.map(e => e.source))];
  }, [allPaymentEvents]);

  const filtered = useMemo(() => {
    let result = [...allPaymentEvents];
    if (unitFilter !== 'all') result = result.filter(e => e.unitName === unitFilter);
    if (sourceFilter !== 'all') result = result.filter(e => e.source === sourceFilter);
    if (statusFilter !== 'all') result = result.filter(e => e.status === statusFilter);
    if (methodFilter === 'needs_review') {
      result = result.filter(e => e.needsMethodReview);
    } else if (methodFilter === 'split') {
      result = result.filter(e => (e.allocations?.length ?? 0) > 1);
    } else if (methodFilter !== 'all') {
      result = result.filter(e =>
        e.paymentMethod === methodFilter ||
        (e.allocations ?? []).some(a => a.method === methodFilter),
      );
    }
    const basisDate = (e: (typeof allPaymentEvents)[number]) =>
      dateBasis === 'due' ? (e.dueDate ?? '') : e.date;
    if (dateFrom) result = result.filter(e => {
      const d = basisDate(e);
      return d !== '' && d >= dateFrom;
    });
    if (dateTo) result = result.filter(e => {
      const d = basisDate(e);
      return d !== '' && d <= dateTo;
    });
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(e => e.guestName.toLowerCase().includes(q) || e.unitName.toLowerCase().includes(q) || (e.note ?? '').toLowerCase().includes(q));
    }
    result.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'date') {
        // Sort by the selected date basis; rows missing the due date sort last.
        const av = basisDate(a);
        const bv = basisDate(b);
        if (av === '' && bv === '') cmp = 0;
        else if (av === '') cmp = 1;
        else if (bv === '') cmp = -1;
        else cmp = av.localeCompare(bv);
      }
      else if (sortField === 'amount') cmp = a.amount - b.amount;
      else if (sortField === 'unit') cmp = a.unitName.localeCompare(b.unitName);
      return sortDir === 'desc' ? -cmp : cmp;
    });
    return result;
  }, [allPaymentEvents, unitFilter, sourceFilter, statusFilter, methodFilter, dateFrom, dateTo, searchQuery, sortField, sortDir, dateBasis]);

  const totalFiltered = filtered.reduce((s, e) => s + e.amount, 0);
  const paidTotal = filtered.filter(e => e.status === 'paid').reduce((s, e) => s + e.amount, 0);
  const needsReviewCount = allPaymentEvents.filter(e => e.needsMethodReview).length;
  const methodTotals = useMemo(() => {
    const m = new Map<PaymentMethod, number>();
    for (const e of filtered) {
      if (e.status !== 'paid') continue;
      const allocs = e.allocations ?? [];
      if (allocs.length > 1) {
        for (const a of allocs) m.set(a.method, (m.get(a.method) ?? 0) + a.amount);
      } else if (e.paymentMethod) {
        m.set(e.paymentMethod, (m.get(e.paymentMethod) ?? 0) + e.amount);
      }
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [filtered]);
  const hasActiveFilters = unitFilter !== 'all' || sourceFilter !== 'all' || statusFilter !== 'all' || methodFilter !== 'all' || dateFrom || dateTo || searchQuery;

  const clearFilters = () => { setUnitFilter('all'); setSourceFilter('all'); setStatusFilter('all'); setMethodFilter('all'); setDateFrom(''); setDateTo(''); setSearchQuery(''); };

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };

  const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
  const fmtDate = (iso: string) => new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      paid: 'bg-[hsl(var(--success))]/15 text-[hsl(var(--success))] border-[hsl(var(--success))]/30',
      upcoming: 'bg-[hsl(var(--secondary))]/15 text-[hsl(var(--secondary))] border-[hsl(var(--secondary))]/30',
      pending: 'bg-[hsl(var(--warning))]/15 text-[hsl(var(--warning))] border-[hsl(var(--warning))]/30',
      overdue: 'bg-[hsl(var(--destructive))]/15 text-[hsl(var(--destructive))] border-[hsl(var(--destructive))]/30',
    };
    return <Badge variant="outline" className={`text-[10px] font-body font-medium capitalize ${styles[status] ?? ''}`}>{status}</Badge>;
  };

  const sortArrow = (field: SortField) => sortField !== field ? '' : sortDir === 'asc' ? ' ↑' : ' ↓';

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-muted-foreground font-body text-sm animate-pulse">Loading payment data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="glass-card rounded-xl p-4">
          <p className="text-xs text-muted-foreground font-body">Total ({filtered.length})</p>
          <p className="text-base sm:text-lg font-heading font-bold mt-0.5">{fmt(totalFiltered)}</p>
        </div>
        <div className="glass-card rounded-xl p-4">
          <p className="text-xs text-muted-foreground font-body">Collected</p>
          <p className="text-base sm:text-lg font-heading font-bold mt-0.5 text-[hsl(var(--success))]">{fmt(paidTotal)}</p>
        </div>
        <div className="glass-card rounded-xl p-4">
          <p className="text-xs text-muted-foreground font-body">Outstanding</p>
          <p className="text-base sm:text-lg font-heading font-bold mt-0.5 text-[hsl(var(--warning))]">{fmt(totalFiltered - paidTotal)}</p>
        </div>
      </div>

      {needsReviewCount > 0 && (
        <button
          type="button"
          onClick={() => setMethodFilter('needs_review')}
          className="w-full flex items-center gap-2 rounded-xl border border-[hsl(var(--warning))]/40 bg-[hsl(var(--warning))]/10 px-4 py-3 text-left hover:bg-[hsl(var(--warning))]/15 transition"
        >
          <AlertTriangle className="h-4 w-4 text-[hsl(var(--warning))] shrink-0" />
          <div className="text-xs font-body">
            <span className="font-heading font-semibold text-[hsl(var(--warning))]">{needsReviewCount}</span>{' '}
            paid payment{needsReviewCount === 1 ? '' : 's'} need a payment method — tap to review.
          </div>
        </button>
      )}

      {methodTotals.length > 0 && (
        <div className="glass-card rounded-xl p-4">
          <p className="text-xs font-body text-muted-foreground mb-2">Collected by method</p>
          <div className="flex flex-wrap gap-2">
            {methodTotals.map(([m, total]) => (
              <Badge key={m} variant="outline" className="text-[10px] font-body">
                {PAYMENT_METHOD_LABELS[m]}: {fmt(total)}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="glass-card rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2 text-xs font-body text-muted-foreground">
          <Filter className="h-3.5 w-3.5" />
          <span>Filters</span>
          {hasActiveFilters && (
            <Button size="sm" variant="ghost" className="h-5 px-2 text-[10px] text-destructive ml-auto" onClick={clearFilters}>
              <X className="h-3 w-3 mr-1" />Clear all
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            className="font-body text-[10px] h-6 px-2 ml-auto"
            onClick={() => {
              const csv = buildPaymentsCsv(filtered.map(e => ({
                id: e.id, date: e.date, dueDate: e.dueDate, unitName: e.unitName, guestName: e.guestName,
                source: e.source, status: e.status, amount: e.amount, note: e.note,
                paymentMethod: e.paymentMethod, paymentMethodOther: e.paymentMethodOther,
                needsMethodReview: e.needsMethodReview, allocations: e.allocations,
              })), dateBasis);
              downloadCsv(`payments-${dateBasis}-${new Date().toISOString().slice(0,10)}.csv`, csv);
              toast.success(`Exported ${filtered.length} payment${filtered.length === 1 ? '' : 's'} (${dateBasis === 'due' ? 'Due Date' : 'Received Date'})`);
            }}
          >
            <Download className="h-3 w-3 mr-1" />Export CSV
          </Button>
          <Button size="sm" variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive font-body text-[10px] h-6 px-2" onClick={() => setBulkDeleteOpen(true)}>
            <Trash2 className="h-3 w-3 mr-1" />Bulk Delete
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input placeholder="Search guest, unit, note..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9 h-9 text-xs font-body" />
          </div>
          <Select value={unitFilter} onValueChange={setUnitFilter}>
            <SelectTrigger className="h-9 text-xs font-body"><SelectValue placeholder="All Units" /></SelectTrigger>
            <SelectContent><SelectItem value="all">All Units</SelectItem>{uniqueUnits.map(u => (<SelectItem key={u} value={u}>{u}</SelectItem>))}</SelectContent>
          </Select>
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="h-9 text-xs font-body"><SelectValue placeholder="All Sources" /></SelectTrigger>
            <SelectContent><SelectItem value="all">All Sources</SelectItem>{uniqueSources.map(s => (<SelectItem key={s} value={s}>{SOURCE_LABELS[s]}</SelectItem>))}</SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 text-xs font-body"><SelectValue placeholder="All Statuses" /></SelectTrigger>
            <SelectContent><SelectItem value="all">All Statuses</SelectItem><SelectItem value="paid">Paid</SelectItem><SelectItem value="upcoming">Upcoming</SelectItem><SelectItem value="pending">Pending</SelectItem><SelectItem value="overdue">Overdue</SelectItem></SelectContent>
          </Select>
          <Select value={methodFilter} onValueChange={setMethodFilter}>
            <SelectTrigger className="h-9 text-xs font-body"><SelectValue placeholder="All Methods" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Methods</SelectItem>
              <SelectItem value="needs_review">Needs payment method</SelectItem>
              <SelectItem value="split">Split payments</SelectItem>
              {PAYMENT_METHODS.map(m => (<SelectItem key={m} value={m}>{PAYMENT_METHOD_LABELS[m]}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs font-body">
          <span className="text-muted-foreground">Report by:</span>
          <Select value={dateBasis} onValueChange={v => setDateBasis(v as DateBasis)}>
            <SelectTrigger className="h-8 w-[160px] text-xs font-body"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="received">Received Date</SelectItem>
              <SelectItem value="due">Due Date</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-muted-foreground ml-2">Range:</span>
          <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-8 w-auto text-xs font-body" />
          <span className="text-muted-foreground">to</span>
          <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-8 w-auto text-xs font-body" />
          {dateBasis === 'due' && (
            <span className="text-[10px] text-muted-foreground italic">Rows without a due date are hidden when a date range is applied.</span>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="glass-card rounded-xl overflow-hidden overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="cursor-pointer select-none text-xs font-body" onClick={() => toggleSort('date')}>
                {dateBasis === 'due' ? 'Due' : 'Received'}{sortArrow('date')}
              </TableHead>
              <TableHead className="text-xs font-body hidden md:table-cell">
                {dateBasis === 'due' ? 'Received' : 'Due'}
              </TableHead>
              <TableHead className="cursor-pointer select-none text-xs font-body" onClick={() => toggleSort('unit')}>Unit{sortArrow('unit')}</TableHead>
              <TableHead className="text-xs font-body">Guest</TableHead>
              <TableHead className="text-xs font-body">Source</TableHead>
              <TableHead className="text-xs font-body">Method</TableHead>
              <TableHead className="text-xs font-body">Status</TableHead>
              <TableHead className="text-right cursor-pointer select-none text-xs font-body" onClick={() => toggleSort('amount')}>Amount{sortArrow('amount')}</TableHead>
              <TableHead className="text-xs font-body hidden sm:table-cell">Note</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-sm text-muted-foreground py-12 font-body">No payments match your filters</TableCell>
              </TableRow>
            ) : (
              filtered.map(event => {
                const methodLabel = summarizeMethod(event.paymentMethod ?? null, event.allocations, event.paymentMethodOther);
                const allocs = (event.allocations ?? []).filter(a => a.amount > 0);
                const isSplit = allocs.length > 1;
                return (
                  <Fragment key={`${event.unitId}-${event.id}`}>
                    <TableRow>
                      <TableCell className="text-xs font-body whitespace-nowrap">{fmtDate(event.date)}</TableCell>
                      <TableCell className="text-xs font-body font-medium">{event.unitName}</TableCell>
                      <TableCell className="text-xs font-body">{event.guestName}</TableCell>
                      <TableCell className="text-xs font-body"><Badge variant="secondary" className="text-[10px] font-body font-normal">{SOURCE_LABELS[event.source]}</Badge></TableCell>
                      <TableCell className="text-xs font-body">
                        {methodLabel ? (
                          <Badge variant="outline" className="text-[10px] font-body font-normal">{methodLabel}</Badge>
                        ) : event.needsMethodReview ? (
                          <Badge variant="outline" className="text-[10px] font-body font-normal bg-[hsl(var(--warning))]/15 text-[hsl(var(--warning))] border-[hsl(var(--warning))]/30">Needs method</Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>{statusBadge(event.status)}</TableCell>
                      <TableCell className="text-right text-xs font-body font-medium tabular-nums">{fmt(event.amount)}</TableCell>
                      <TableCell className="text-xs font-body text-muted-foreground hidden sm:table-cell max-w-[200px] truncate">{event.note ?? '—'}</TableCell>
                    </TableRow>
                    {isSplit && (
                      <TableRow key={`${event.unitId}-${event.id}-split`} className="bg-muted/20 hover:bg-muted/20">
                        <TableCell colSpan={8} className="text-[10px] font-body text-muted-foreground py-1.5">
                          <span className="mr-2">Allocations:</span>
                          {allocs.map((a, i) => (
                            <span key={i} className="mr-3">
                              {a.method === 'other' && a.otherDescription ? a.otherDescription : PAYMENT_METHOD_LABELS[a.method]}: <span className="tabular-nums font-medium text-foreground">{fmt(a.amount)}</span>
                            </span>
                          ))}
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>


      <BulkDeletePaymentsDialog
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        allPayments={allPaymentEvents}
        units={units.map(u => ({ id: u.id, name: u.name }))}
        onBulkDelete={async (ids) => {
          await bulkDeletePayments(ids);
          toast.success(`${ids.length} payment${ids.length !== 1 ? 's' : ''} deleted`);
        }}
      />
    </div>
  );
}
