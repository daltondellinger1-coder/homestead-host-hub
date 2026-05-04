import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Mountain, ArrowLeft, Plus, Wrench, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import { usePropertyData } from '@/hooks/usePropertyData';
import { useMaintenanceRequests, type MaintenanceRequest } from '@/hooks/useMaintenanceRequests';
import MaintenanceRequestCard from '@/components/MaintenanceRequestCard';
import MaintenanceRequestDialog from '@/components/MaintenanceRequestDialog';
import LogMaintenanceDialog from '@/components/LogMaintenanceDialog';

export default function Maintenance() {
  const { units } = usePropertyData();
  const { requests, loading } = useMaintenanceRequests();
  const [unitFilter, setUnitFilter] = useState<string>('all');
  const [logOpen, setLogOpen] = useState(false);
  const [selected, setSelected] = useState<MaintenanceRequest | null>(null);
  const [doneOpen, setDoneOpen] = useState(false);

  const unitNameById = useMemo(() => {
    const map: Record<string, string> = {};
    for (const u of units) map[u.id] = u.name;
    return map;
  }, [units]);

  const filtered = useMemo(() => {
    if (unitFilter === 'all') return requests;
    return requests.filter(r => r.unit_id === unitFilter);
  }, [requests, unitFilter]);

  const newReqs = filtered.filter(r => r.status === 'new').sort((a, b) => Number(b.priority_urgent) - Number(a.priority_urgent));
  const inProgress = filtered.filter(r => r.status === 'in_progress').sort((a, b) => Number(b.priority_urgent) - Number(a.priority_urgent));
  const done = filtered.filter(r => r.status === 'done');
  const archived = filtered.filter(r => r.status === 'archived');
  const [archivedOpen, setArchivedOpen] = useState(false);

  return (
    <div className="min-h-screen pattern-bg">
      <header
        className="border-b border-border/40 sticky top-0 z-10"
        style={{ background: 'linear-gradient(180deg, hsl(222 47% 10%), hsl(222 47% 8%))' }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <Link to="/">
              <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-foreground hover:bg-muted/50 -ml-2">
                <ArrowLeft className="h-4 w-4 mr-1.5" />
                Back
              </Button>
            </Link>
            <div className="h-6 w-px bg-border" />
            <div className="flex items-center gap-2 min-w-0">
              <div className="p-1.5 rounded-lg bg-secondary/15">
                <Wrench className="h-5 w-5 text-secondary" />
              </div>
              <h1 className="text-lg font-heading font-bold tracking-tight text-foreground truncate">Maintenance</h1>
            </div>
          </div>
          <Button size="sm" onClick={() => setLogOpen(true)} className="shrink-0">
            <Plus className="h-4 w-4 sm:mr-1.5" />
            <span className="hidden sm:inline">Log Request</span>
          </Button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 pb-24 sm:pb-6 space-y-5">
        {/* Filter */}
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={unitFilter} onValueChange={setUnitFilter}>
            <SelectTrigger className="w-full max-w-xs h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All units</SelectItem>
              {units.map(u => (
                <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground font-body">Loading...</p>
        ) : requests.length === 0 ? (
          <div className="rounded-lg border border-border/40 bg-card/40 p-6 text-center space-y-3">
            <Wrench className="h-8 w-8 text-muted-foreground mx-auto" />
            <h2 className="font-heading text-base text-foreground">No maintenance requests yet</h2>
            <p className="text-sm font-body text-muted-foreground">
              Tenants scan the QR code in their unit, fill out a form, and you and your maintenance contact get an email.
              Then click <span className="text-secondary">Log Request</span> to track it here.
            </p>
          </div>
        ) : (
          <>
            {/* New */}
            <section className="space-y-2">
              <h2 className="text-xs uppercase tracking-wider font-body text-muted-foreground flex items-center gap-2">
                New
                {newReqs.length > 0 && <span className="text-secondary font-semibold">{newReqs.length}</span>}
              </h2>
              {newReqs.length === 0 ? (
                <p className="text-xs text-muted-foreground font-body italic">No new requests</p>
              ) : (
                <div className="space-y-2">
                  {newReqs.map(r => (
                    <MaintenanceRequestCard
                      key={r.id}
                      request={r}
                      unitName={unitNameById[r.unit_id] ?? 'Unknown unit'}
                      onClick={() => setSelected(r)}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* In Progress */}
            <section className="space-y-2">
              <h2 className="text-xs uppercase tracking-wider font-body text-muted-foreground flex items-center gap-2">
                In Progress
                {inProgress.length > 0 && <span className="text-warning font-semibold">{inProgress.length}</span>}
              </h2>
              {inProgress.length === 0 ? (
                <p className="text-xs text-muted-foreground font-body italic">Nothing in progress</p>
              ) : (
                <div className="space-y-2">
                  {inProgress.map(r => (
                    <MaintenanceRequestCard
                      key={r.id}
                      request={r}
                      unitName={unitNameById[r.unit_id] ?? 'Unknown unit'}
                      onClick={() => setSelected(r)}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* Done (collapsible) */}
            {done.length > 0 && (
              <Collapsible open={doneOpen} onOpenChange={setDoneOpen}>
                <CollapsibleTrigger className="w-full flex items-center justify-between text-xs uppercase tracking-wider font-body text-muted-foreground hover:text-foreground transition-colors">
                  <span className="flex items-center gap-2">
                    Done
                    <span className="text-success font-semibold">{done.length}</span>
                  </span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${doneOpen ? 'rotate-180' : ''}`} />
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-2 mt-2">
                  {done.map(r => (
                    <MaintenanceRequestCard
                      key={r.id}
                      request={r}
                      unitName={unitNameById[r.unit_id] ?? 'Unknown unit'}
                      onClick={() => setSelected(r)}
                    />
                  ))}
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Archived (collapsible) */}
            {archived.length > 0 && (
              <Collapsible open={archivedOpen} onOpenChange={setArchivedOpen}>
                <CollapsibleTrigger className="w-full flex items-center justify-between text-xs uppercase tracking-wider font-body text-muted-foreground hover:text-foreground transition-colors">
                  <span className="flex items-center gap-2">
                    Archived
                    <span className="text-muted-foreground font-semibold">{archived.length}</span>
                  </span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${archivedOpen ? 'rotate-180' : ''}`} />
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-2 mt-2 opacity-70">
                  {archived.map(r => (
                    <MaintenanceRequestCard
                      key={r.id}
                      request={r}
                      unitName={unitNameById[r.unit_id] ?? 'Unknown unit'}
                      onClick={() => setSelected(r)}
                    />
                  ))}
                </CollapsibleContent>
              </Collapsible>
            )}
          </>
        )}
      </main>

      <LogMaintenanceDialog
        open={logOpen}
        onOpenChange={setLogOpen}
        units={units}
        defaultUnitId={unitFilter !== 'all' ? unitFilter : undefined}
      />

      <MaintenanceRequestDialog
        request={selected}
        unitName={selected ? (unitNameById[selected.unit_id] ?? 'Unknown unit') : ''}
        open={!!selected}
        onOpenChange={(open) => { if (!open) setSelected(null); }}
      />
    </div>
  );
}
