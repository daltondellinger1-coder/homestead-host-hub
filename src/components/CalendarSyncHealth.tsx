import { AlertTriangle, CalendarCheck2, RefreshCcw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AirbnbBlock } from '@/hooks/useAirbnbBlocks';
import { summarizeCalendarSyncHealth } from '@/lib/calendarSyncHealth';

export default function CalendarSyncHealth({
  units,
  blocksByUnit,
  loading,
  error,
}: {
  units: { id: string; name: string }[];
  blocksByUnit: Map<string, AirbnbBlock[]>;
  loading: boolean;
  error: string | null;
}) {
  const health = summarizeCalendarSyncHealth({ units, blocksByUnit });
  const hasBlocks = health.totalBlocks > 0;
  const needsReview = !loading && (!!error || !hasBlocks);

  return (
    <Card className="bg-card/60 border-border/40">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-heading flex items-center gap-2">
          <CalendarCheck2 className="h-4 w-4 text-secondary" /> Channel calendar sync health
          {loading ? <Badge variant="outline">checking</Badge> : needsReview ? <Badge variant="destructive">review</Badge> : <Badge variant="default">active</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg bg-background/40 border border-border/30 p-2">
            <p className="text-lg font-heading font-semibold">{health.totalBlocks}</p>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-body">Upcoming blocks</p>
          </div>
          <div className="rounded-lg bg-background/40 border border-border/30 p-2">
            <p className="text-lg font-heading font-semibold">{health.mappedUnits}/{health.totalUnits}</p>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-body">Mapped units</p>
          </div>
          <div className="rounded-lg bg-background/40 border border-border/30 p-2">
            <p className="text-lg font-heading font-semibold">{health.blockedNightsNext30}</p>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-body">Nights / 30d</p>
          </div>
        </div>

        {loading ? (
          <p className="text-xs text-muted-foreground font-body flex items-center gap-1.5"><RefreshCcw className="h-3 w-3 animate-spin" /> Checking public calendar_events feed...</p>
        ) : error ? (
          <p className="text-xs text-destructive font-body flex items-center gap-1.5"><AlertTriangle className="h-3 w-3" /> Public calendar_events feed error: {error}</p>
        ) : !hasBlocks ? (
          <p className="text-xs text-destructive font-body flex items-center gap-1.5"><AlertTriangle className="h-3 w-3" /> No upcoming Airbnb/channel blocks found. Do not rely on public booking date blocking until sync is verified.</p>
        ) : (
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground font-body">Top blocked units next 30 days:</p>
            {health.unitsWithBlocks.filter(u => u.upcomingBlocks > 0).slice(0, 4).map((unit) => (
              <div key={unit.unitId} className="flex items-center justify-between text-xs font-body">
                <span>{unit.unitName}</span>
                <span className="text-muted-foreground tabular-nums">{unit.blockedNightsNext30} nights · {unit.upcomingBlocks} block(s)</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
