import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, RefreshCcw, Activity, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

type HealthLog = {
  id?: string;
  created_at?: string;
  source?: string | null;
  processed_status?: string | null;
  error_text?: string | null;
  related_request_id?: string | null;
  raw_payload?: unknown;
};

function formatDate(value?: string) {
  if (!value) return 'Unknown time';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function statusVariant(status?: string | null) {
  if (!status) return 'outline' as const;
  if (status === 'ok') return 'default' as const;
  if (status.startsWith('skipped') || status === 'duplicate') return 'secondary' as const;
  return 'destructive' as const;
}

function getPayloadSummary(payload: unknown) {
  if (!payload || typeof payload !== 'object') return 'No payload summary';
  const record = payload as Record<string, unknown>;
  const event = record.event ?? record.eventId ?? record.type;
  const requestId = record.request_id ?? record.submissionId ?? record.responseId;
  const results = Array.isArray(record.results) ? `${record.results.length} notification result(s)` : null;
  return [event ? `event: ${String(event)}` : null, requestId ? `request: ${String(requestId)}` : null, results]
    .filter(Boolean)
    .join(' · ') || 'Payload captured';
}

export default function MaintenanceHealth() {
  const [logs, setLogs] = useState<HealthLog[]>([]);
  const [loading, setLoading] = useState(true);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from('webhook_payload_log')
      .select('id,created_at,source,processed_status,error_text,related_request_id,raw_payload')
      .in('source', ['tally', 'maintenance-notifications'])
      .order('created_at', { ascending: false })
      .limit(25);

    if (error) {
      console.error('Failed to load maintenance webhook health', error);
      toast.error('Failed to load webhook health');
      setLogs([]);
    } else {
      setLogs((data ?? []) as HealthLog[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const totals = useMemo(() => {
    const tally = logs.filter((log) => log.source === 'tally').length;
    const notifications = logs.filter((log) => log.source === 'maintenance-notifications').length;
    const issues = logs.filter((log) => {
      const status = log.processed_status ?? '';
      return status && status !== 'ok' && status !== 'duplicate' && !status.startsWith('skipped');
    }).length;
    return { tally, notifications, issues };
  }, [logs]);

  return (
    <div className="min-h-screen pattern-bg">
      <header
        className="border-b border-border/40 sticky top-0 z-10"
        style={{ background: 'linear-gradient(180deg, hsl(222 47% 10%), hsl(222 47% 8%))' }}
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link to="/maintenance">
              <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-foreground hover:bg-muted/50 -ml-2">
                <ArrowLeft className="h-4 w-4 mr-1.5" />
                Back
              </Button>
            </Link>
            <div className="h-6 w-px bg-border" />
            <div className="min-w-0">
              <h1 className="text-lg font-heading font-bold tracking-tight text-foreground truncate">Maintenance Webhook Health</h1>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-body">Tally + notification logs</p>
            </div>
          </div>
          <Button size="sm" onClick={loadLogs} disabled={loading} className="shrink-0">
            <RefreshCcw className={`h-4 w-4 sm:mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 pb-24 space-y-5">
        <section className="grid gap-3 sm:grid-cols-3">
          <Card className="bg-card/60 border-border/40">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-body flex items-center gap-2"><Activity className="h-4 w-4 text-secondary" /> Tally logs</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-heading font-semibold">{totals.tally}</CardContent>
          </Card>
          <Card className="bg-card/60 border-border/40">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-body flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-secondary" /> Notifications</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-heading font-semibold">{totals.notifications}</CardContent>
          </Card>
          <Card className="bg-card/60 border-border/40">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-body flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-destructive" /> Needs review</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-heading font-semibold">{totals.issues}</CardContent>
          </Card>
        </section>

        <Card className="bg-card/60 border-border/40">
          <CardHeader>
            <CardTitle className="text-base font-heading">Recent webhook_payload_log entries</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <p className="text-sm text-muted-foreground font-body">Loading...</p>
            ) : logs.length === 0 ? (
              <p className="text-sm text-muted-foreground font-body">No recent maintenance webhook or notification logs found.</p>
            ) : (
              logs.map((log, index) => (
                <div key={log.id ?? `${log.created_at}-${index}`} className="rounded-lg border border-border/40 bg-background/40 p-3 space-y-2">
                  <div className="flex flex-wrap items-center gap-2 justify-between">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">{log.source ?? 'unknown source'}</Badge>
                      <Badge variant={statusVariant(log.processed_status)}>{log.processed_status ?? 'unknown'}</Badge>
                    </div>
                    <span className="text-xs text-muted-foreground font-body flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {formatDate(log.created_at)}
                    </span>
                  </div>
                  <p className="text-sm font-body text-foreground">{getPayloadSummary(log.raw_payload)}</p>
                  {log.related_request_id && (
                    <p className="text-xs text-muted-foreground font-mono break-all">related_request_id: {log.related_request_id}</p>
                  )}
                  {log.error_text && (
                    <p className="text-xs text-destructive font-body break-words">{log.error_text}</p>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
