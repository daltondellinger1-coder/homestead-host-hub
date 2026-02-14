import { useState, useMemo } from 'react';
import { usePropertyData } from '@/hooks/usePropertyData';
import { SOURCE_LABELS } from '@/types/property';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Filter, X, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import BulkDeletePaymentsDialog from '@/components/BulkDeletePaymentsDialog';

type SortField = 'date' | 'amount' | 'unit';
type SortDir = 'asc' | 'desc';

export default function PaymentHistoryContent() {
  const { units, loading, allPaymentEvents, bulkDeletePayments } = usePropertyData();
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  const [unitFilter, setUnitFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

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
    if (dateFrom) result = result.filter(e => e.date >= dateFrom);
    if (dateTo) result = result.filter(e => e.date <= dateTo);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(e => e.guestName.toLowerCase().includes(q) || e.unitName.toLowerCase().includes(q) || (e.note ?? '').toLowerCase().includes(q));
    }
    result.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'date') cmp = a.date.localeCompare(b.date);
      else if (sortField === 'amount') cmp = a.amount - b.amount;
      else if (sortField === 'unit') cmp = a.unitName.localeCompare(b.unitName);
      return sortDir === 'desc' ? -cmp : cmp;
    });
    return result;
  }, [allPaymentEvents, unitFilter, sourceFilter, statusFilter, dateFrom, dateTo, searchQuery, sortField, sortDir]);

  const totalFiltered = filtered.reduce((s, e) => s + e.amount, 0);
  const paidTotal = filtered.filter(e => e.status === 'paid').reduce((s, e) => s + e.amount, 0);
  const hasActiveFilters = unitFilter !== 'all' || sourceFilter !== 'all' || statusFilter !== 'all' || dateFrom || dateTo || searchQuery;

  const clearFilters = () => { setUnitFilter('all'); setSourceFilter('all'); setStatusFilter('all'); setDateFrom(''); setDateTo(''); setSearchQuery(''); };

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
          <Button size="sm" variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive font-body text-[10px] h-6 px-2 ml-auto" onClick={() => setBulkDeleteOpen(true)}>
            <Trash2 className="h-3 w-3 mr-1" />Bulk Delete
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
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
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs font-body">
          <span className="text-muted-foreground">Date range:</span>
          <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-8 w-auto text-xs font-body" />
          <span className="text-muted-foreground">to</span>
          <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-8 w-auto text-xs font-body" />
        </div>
      </div>

      {/* Table */}
      <div className="glass-card rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="cursor-pointer select-none text-xs font-body" onClick={() => toggleSort('date')}>Date{sortArrow('date')}</TableHead>
              <TableHead className="cursor-pointer select-none text-xs font-body" onClick={() => toggleSort('unit')}>Unit{sortArrow('unit')}</TableHead>
              <TableHead className="text-xs font-body">Guest</TableHead>
              <TableHead className="text-xs font-body">Source</TableHead>
              <TableHead className="text-xs font-body">Status</TableHead>
              <TableHead className="text-right cursor-pointer select-none text-xs font-body" onClick={() => toggleSort('amount')}>Amount{sortArrow('amount')}</TableHead>
              <TableHead className="text-xs font-body hidden sm:table-cell">Note</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-12 font-body">No payments match your filters</TableCell>
              </TableRow>
            ) : (
              filtered.map(event => (
                <TableRow key={`${event.unitId}-${event.id}`}>
                  <TableCell className="text-xs font-body whitespace-nowrap">{fmtDate(event.date)}</TableCell>
                  <TableCell className="text-xs font-body font-medium">{event.unitName}</TableCell>
                  <TableCell className="text-xs font-body">{event.guestName}</TableCell>
                  <TableCell className="text-xs font-body"><Badge variant="secondary" className="text-[10px] font-body font-normal">{SOURCE_LABELS[event.source]}</Badge></TableCell>
                  <TableCell>{statusBadge(event.status)}</TableCell>
                  <TableCell className="text-right text-xs font-body font-medium tabular-nums">{fmt(event.amount)}</TableCell>
                  <TableCell className="text-xs font-body text-muted-foreground hidden sm:table-cell max-w-[200px] truncate">{event.note ?? '—'}</TableCell>
                </TableRow>
              ))
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
