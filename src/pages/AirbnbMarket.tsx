import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  BadgeDollarSign,
  ChevronDown,
  ClipboardList,
  Mountain,
  Settings2,
  Target,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  generateAirbnbWeeklyBriefing,
  type HomesteadUnit,
  type ManualSnapshotFormValues,
  type MarketComp,
} from '@/data/airbnbMarket';
import { useAirbnbMarketBriefing } from '@/hooks/useAirbnbMarketBriefing';
import { useAirbnbMarketSnapshotAdmin, useAirbnbMarketWeeklyBriefingAdmin } from '@/hooks/useAirbnbMarketSnapshotAdmin';
import {
  availabilityLabel,
  buildTopSummary,
  compRangeSummary,
  isDirectAirbnbListingUrl,
  longStayProofScore,
  pricePositionVsCompMedian,
  recommendedMove,
  trustLabel,
  type AvailabilityLabel,
  type PricePositionLabel,
  type RecommendedMove,
  type TrustLabel,
} from '@/lib/airbnbMarketSignals';
import { useUpdateCompListingUrl } from '@/hooks/useAirbnbMarketSnapshotAdmin';
import { cn } from '@/lib/utils';

const money = (value?: number) => (typeof value === 'number' ? `$${value.toLocaleString()}` : '—');

function Header() {
  return (
    <header className="sticky top-0 z-10 border-b border-border/40 bg-card/95 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Link to="/">
            <Button size="sm" variant="ghost" className="-ml-2 text-muted-foreground hover:bg-muted/50 hover:text-foreground">
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Back
            </Button>
          </Link>
          <div className="h-6 w-px bg-border" />
          <div className="flex min-w-0 items-center gap-2">
            <div className="rounded-xl bg-secondary/15 p-1.5">
              <Mountain className="h-5 w-5 text-secondary" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate font-heading text-lg font-bold tracking-tight text-foreground">Airbnb Market</h1>
              <p className="hidden text-xs text-muted-foreground sm:block">Are we priced right for the proof we give?</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

const POSITION_TONE: Record<PricePositionLabel, string> = {
  'Below market': 'border-emerald-400/25 bg-emerald-400/10 text-emerald-100',
  'At market': 'border-secondary/30 bg-secondary/10 text-secondary',
  'Above market': 'border-amber-400/25 bg-amber-400/10 text-amber-100',
  Unknown: 'border-border/50 bg-muted/40 text-muted-foreground',
};

const AVAILABILITY_TONE: Record<AvailabilityLabel, string> = {
  'Open 30 days': 'border-emerald-400/25 bg-emerald-400/10 text-emerald-100',
  'Partially open': 'border-amber-400/25 bg-amber-400/10 text-amber-100',
  Blocked: 'border-red-400/25 bg-red-400/10 text-red-100',
  Unknown: 'border-border/50 bg-muted/40 text-muted-foreground',
};

const TRUST_TONE: Record<TrustLabel, string> = {
  'Strong trust': 'border-emerald-400/25 bg-emerald-400/10 text-emerald-100',
  'Some trust': 'border-secondary/30 bg-secondary/10 text-secondary',
  'Low trust': 'border-amber-400/25 bg-amber-400/10 text-amber-100',
  'No trust yet': 'border-border/50 bg-muted/40 text-muted-foreground',
};

const MOVE_TONE: Record<RecommendedMove, string> = {
  Hold: 'border-secondary/30 bg-secondary/10 text-secondary',
  'Raise 5%': 'border-emerald-400/25 bg-emerald-400/10 text-emerald-100',
  'Lower 5%': 'border-amber-400/25 bg-amber-400/10 text-amber-100',
  'Improve listing before pricing change': 'border-amber-400/30 bg-amber-400/10 text-amber-100',
};

function Pill({ tone, children }: { tone: string; children: React.ReactNode }) {
  return <span className={cn('inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold', tone)}>{children}</span>;
}

function SummaryStat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className={cn('rounded-2xl border p-4', tone)}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-80">{label}</p>
      <p className="mt-2 font-heading text-3xl font-bold">{value}</p>
    </div>
  );
}

function UnitSignalCard({ unit, comps }: { unit: HomesteadUnit; comps: MarketComp[] }) {
  const position = pricePositionVsCompMedian(unit.monthlyPrice, comps);
  const availability = availabilityLabel(unit);
  const proof = longStayProofScore(unit);
  const trust = trustLabel(unit.rating, unit.reviews);
  const move = recommendedMove(unit);
  const range = compRangeSummary(comps);

  return (
    <article className="rounded-3xl border border-border/60 bg-card/70 p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-heading text-xl font-bold text-foreground">{unit.unit}</h3>
          <p className="mt-1 text-sm leading-5 text-muted-foreground">{unit.bestFor}</p>
        </div>
        <Pill tone={MOVE_TONE[move]}>
          <Target className="mr-1 h-3.5 w-3.5" /> {move}
        </Pill>
      </div>

      <dl className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-border/50 bg-background/40 p-4">
          <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Monthly price position</dt>
          <dd className="mt-2 font-heading text-lg font-bold text-foreground">{position.summary}</dd>
          <dd className="mt-2"><Pill tone={POSITION_TONE[position.label]}>{position.label}</Pill></dd>
        </div>

        <div className="rounded-2xl border border-border/50 bg-background/40 p-4">
          <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">30-day availability</dt>
          <dd className="mt-2"><Pill tone={AVAILABILITY_TONE[availability]}>{availability}</Pill></dd>
          {unit.availability?.nextAvailableDate && (
            <dd className="mt-2 text-xs text-muted-foreground">Next available: {unit.availability.nextAvailableDate}</dd>
          )}
        </div>

        <div className="rounded-2xl border border-border/50 bg-background/40 p-4">
          <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Long-stay proof score</dt>
          <dd className="mt-2 font-heading text-2xl font-bold text-foreground">{proof.score}<span className="text-base font-semibold text-muted-foreground"> / 5</span></dd>
          <dd className="mt-2 text-xs leading-5 text-muted-foreground">{proof.missingPhrase}</dd>
        </div>

        <div className="rounded-2xl border border-border/50 bg-background/40 p-4">
          <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Review trust</dt>
          <dd className="mt-2"><Pill tone={TRUST_TONE[trust]}>{trust}</Pill></dd>
          <dd className="mt-2 text-xs text-muted-foreground">
            {unit.rating ? `${unit.rating} from ${unit.reviews ?? 0} review${unit.reviews === 1 ? '' : 's'}` : 'No reviews logged yet'}
          </dd>
        </div>
      </dl>

      <div className="mt-4 grid gap-2 rounded-2xl border border-border/50 bg-background/30 p-4 text-sm text-muted-foreground sm:grid-cols-3">
        <p><span className="font-semibold text-foreground">Compared against:</span> {range.count} similar listings</p>
        <p><span className="font-semibold text-foreground">Comp monthly median:</span> {money(range.median)}</p>
        <p><span className="font-semibold text-foreground">Comp range:</span> {range.min ? `${money(range.min)}–${money(range.max)}` : '—'}</p>
      </div>

      <details className="group mt-3 rounded-2xl border border-border/50 bg-background/20 px-4 py-3 text-sm">
        <summary className="flex cursor-pointer list-none items-center justify-between font-semibold text-foreground">
          <span>View comps</span>
          <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
        </summary>
        <ul className="mt-3 divide-y divide-border/40">
          {comps.map((c) => {
            const hasDirect = isDirectAirbnbListingUrl(c.listingUrl);
            return (
              <li key={c.id ?? c.name} className="flex items-start justify-between gap-3 py-2">
                <div className="min-w-0">
                  {hasDirect ? (
                    <a
                      href={c.listingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Open Airbnb listing for ${c.name} in a new tab`}
                      className="font-semibold text-secondary underline-offset-2 hover:underline focus-visible:underline"
                    >
                      {c.name}
                    </a>
                  ) : (
                    <p className="font-semibold text-foreground">{c.name}</p>
                  )}
                  <p className="text-xs text-muted-foreground">{c.bedrooms ? `${c.bedrooms}BR` : 'Beds unknown'}{c.rating ? ` · ${c.rating}★` : ''}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <p className="text-sm font-semibold text-foreground">{money(c.monthlyEstimate)}/mo</p>
                  {hasDirect ? (
                    <a
                      href={c.listingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Open Airbnb listing for ${c.name} in a new tab`}
                      className="text-xs font-semibold text-secondary underline-offset-2 hover:underline focus-visible:underline"
                    >
                      Open Airbnb ↗
                    </a>
                  ) : (
                    <span className="text-xs text-muted-foreground" title="Add a direct airbnb.com/rooms/... or /h/... URL in the admin panel below">
                      Exact listing link needed
                    </span>
                  )}
                </div>
              </li>
            );
          })}
          {comps.length === 0 && <li className="py-2 text-xs text-muted-foreground">No comps logged.</li>}
        </ul>


      </details>
    </article>
  );
}

function SnapshotAdminPanel({ units, marketComps }: { units: HomesteadUnit[]; marketComps: MarketComp[] }) {
  const firstUnit = units[0];
  const initialListingId = firstUnit?.id ?? '';
  const [values, setValues] = useState<ManualSnapshotFormValues>({
    listingId: initialListingId,
    snapshotDate: new Date().toISOString().slice(0, 10),
    nightlyPrice: firstUnit?.nightlyPrice?.toString() || '',
    weeklyPrice: firstUnit?.weeklyPrice?.toString() || '',
    monthlyPrice: firstUnit?.monthlyPrice?.toString() || '',
    weeklyDiscountPct: firstUnit?.weeklyDiscountPct?.toString() || '',
    monthlyDiscountPct: firstUnit?.monthlyDiscountPct?.toString() || '',
    available30Day: firstUnit?.availability?.available30Day === undefined ? 'unknown' : firstUnit.availability.available30Day ? 'yes' : 'no',
    nextAvailableDate: firstUnit?.availability?.nextAvailableDate || '',
  });
  const mutation = useAirbnbMarketSnapshotAdmin();
  const weeklyMutation = useAirbnbMarketWeeklyBriefingAdmin();

  const update = (key: keyof ManualSnapshotFormValues, nextValue: string) => {
    setValues((current) => ({ ...current, [key]: nextValue }));
  };

  return (
    <details className="group rounded-3xl border border-border/60 bg-card/40 p-4 sm:p-5">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-foreground">
        <span className="flex items-center gap-2"><Settings2 className="h-4 w-4 text-secondary" /> Admin · Record snapshot &amp; weekly briefing</span>
        <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
      </summary>
      <form
        className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
        onSubmit={(event) => {
          event.preventDefault();
          mutation.mutate(values);
        }}
      >
        <label className="space-y-1 text-sm">
          <span className="font-semibold text-foreground">Listing</span>
          <select className="w-full rounded-xl border border-border/60 bg-background/70 px-3 py-2 text-foreground" value={values.listingId} onChange={(event) => update('listingId', event.target.value)} required>
            <option value="">Choose listing</option>
            <option value="listing-unit-5">Unit 5</option>
            <option value="listing-unit-11">Unit 11</option>
            <option value="listing-other-hh-units">Other HH units</option>
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-semibold text-foreground">Snapshot date</span>
          <input className="w-full rounded-xl border border-border/60 bg-background/70 px-3 py-2 text-foreground" type="date" value={values.snapshotDate} onChange={(event) => update('snapshotDate', event.target.value)} required />
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-semibold text-foreground">Nightly</span>
          <input className="w-full rounded-xl border border-border/60 bg-background/70 px-3 py-2 text-foreground" inputMode="decimal" value={values.nightlyPrice} onChange={(event) => update('nightlyPrice', event.target.value)} placeholder="130" />
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-semibold text-foreground">Weekly</span>
          <input className="w-full rounded-xl border border-border/60 bg-background/70 px-3 py-2 text-foreground" inputMode="decimal" value={values.weeklyPrice} onChange={(event) => update('weeklyPrice', event.target.value)} placeholder="686" />
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-semibold text-foreground">Monthly</span>
          <input className="w-full rounded-xl border border-border/60 bg-background/70 px-3 py-2 text-foreground" inputMode="decimal" value={values.monthlyPrice} onChange={(event) => update('monthlyPrice', event.target.value)} placeholder="1855" />
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-semibold text-foreground">Weekly discount %</span>
          <input className="w-full rounded-xl border border-border/60 bg-background/70 px-3 py-2 text-foreground" inputMode="decimal" value={values.weeklyDiscountPct} onChange={(event) => update('weeklyDiscountPct', event.target.value)} placeholder="10.9" />
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-semibold text-foreground">Monthly discount %</span>
          <input className="w-full rounded-xl border border-border/60 bg-background/70 px-3 py-2 text-foreground" inputMode="decimal" value={values.monthlyDiscountPct} onChange={(event) => update('monthlyDiscountPct', event.target.value)} placeholder="41.8" />
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-semibold text-foreground">30-day open?</span>
          <select className="w-full rounded-xl border border-border/60 bg-background/70 px-3 py-2 text-foreground" value={values.available30Day} onChange={(event) => update('available30Day', event.target.value)}>
            <option value="unknown">Unknown</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </label>
        <label className="space-y-1 text-sm sm:col-span-2">
          <span className="font-semibold text-foreground">Next available date</span>
          <input className="w-full rounded-xl border border-border/60 bg-background/70 px-3 py-2 text-foreground" type="date" value={values.nextAvailableDate} onChange={(event) => update('nextAvailableDate', event.target.value)} />
        </label>
        <div className="flex items-end sm:col-span-2">
          <Button type="submit" className="w-full" disabled={mutation.isPending || !values.listingId || !values.snapshotDate}>
            {mutation.isPending ? 'Saving…' : 'Save price + availability snapshot'}
          </Button>
        </div>
      </form>
      {mutation.isSuccess && <p className="mt-3 rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-sm text-emerald-100">Snapshot saved. The briefing will refresh from Supabase.</p>}
      {mutation.isError && <p className="mt-3 rounded-xl border border-amber-400/25 bg-amber-400/10 p-3 text-sm text-amber-100">Could not save snapshot: {mutation.error.message}</p>}
      <div className="mt-4 rounded-2xl border border-border/50 bg-background/35 p-4">
        <p className="text-sm font-semibold text-foreground">Weekly briefing generator</p>
        <p className="mt-1 text-sm leading-5 text-muted-foreground">Creates the owner-read summary from current unit readiness, price snapshots, and comp median.</p>
        <Button
          type="button"
          variant="secondary"
          className="mt-3 w-full sm:w-auto"
          disabled={weeklyMutation.isPending}
          onClick={() => {
            weeklyMutation.mutate(
              generateAirbnbWeeklyBriefing({
                weekStart: values.snapshotDate,
                homesteadUnits: units,
                marketComps,
              }),
            );
          }}
        >
          {weeklyMutation.isPending ? 'Generating…' : 'Generate weekly briefing'}
        </Button>
        {weeklyMutation.isSuccess && <p className="mt-3 rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-sm text-emerald-100">Weekly briefing saved. The dashboard will refresh from Supabase.</p>}
        {weeklyMutation.isError && <p className="mt-3 rounded-xl border border-amber-400/25 bg-amber-400/10 p-3 text-sm text-amber-100">Could not save weekly briefing: {weeklyMutation.error.message}</p>}
      </div>
    </details>
  );
}

function WeeklyBriefingCard({ briefing }: { briefing?: import('@/data/airbnbMarket').AirbnbMarketBriefing['weeklyBriefing'] }) {
  if (!briefing) return null;
  return (
    <section className="rounded-3xl border border-secondary/20 bg-secondary/5 p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-secondary/15 p-2 text-secondary"><ClipboardList className="h-5 w-5" /></div>
        <div className="flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-secondary">Week of {briefing.weekStart}</p>
          <p className="mt-1 font-heading text-base font-bold text-foreground">{briefing.headline}</p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{briefing.ownerRead}</p>
        </div>
      </div>
    </section>
  );
}

function CompUrlAdminPanel({ comps }: { comps: MarketComp[] }) {
  const editableComps = comps.filter((c) => typeof c.id === 'string' && c.id.length > 0);
  const [listingId, setListingId] = useState<string>(editableComps[0]?.id ?? '');
  const [url, setUrl] = useState<string>('');
  const mutation = useUpdateCompListingUrl();
  const selected = editableComps.find((c) => c.id === listingId);
  const currentUrl = selected?.listingUrl;
  const trimmed = url.trim();
  const isClearing = trimmed.length === 0;
  const isValid = isClearing || isDirectAirbnbListingUrl(trimmed);
  const showWarning = trimmed.length > 0 && !isValid;

  return (
    <details className="group rounded-3xl border border-border/60 bg-card/40 p-4 sm:p-5">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-foreground">
        <span className="flex items-center gap-2"><Settings2 className="h-4 w-4 text-secondary" /> Admin · Add or update comp Airbnb listing URL</span>
        <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
      </summary>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        Only direct Airbnb listing URLs are accepted (e.g. <code className="rounded bg-background/60 px-1 py-0.5 text-xs">https://www.airbnb.com/rooms/123456</code> or <code className="rounded bg-background/60 px-1 py-0.5 text-xs">https://www.airbnb.com/h/your-listing</code>). Search URLs are rejected so we never advertise a generic search page as a real comp.
      </p>
      {editableComps.length === 0 ? (
        <p className="mt-3 rounded-xl border border-border/50 bg-background/50 p-3 text-sm text-muted-foreground">No comps with database ids loaded yet. Wait for the Supabase briefing to load.</p>
      ) : (
        <form
          className="mt-4 grid gap-3 sm:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (!listingId || !isValid) return;
            mutation.mutate({ listingId, listingUrl: isClearing ? null : trimmed });
          }}
        >
          <label className="space-y-1 text-sm">
            <span className="font-semibold text-foreground">Competitor</span>
            <select
              className="w-full rounded-xl border border-border/60 bg-background/70 px-3 py-2 text-foreground"
              value={listingId}
              onChange={(e) => { setListingId(e.target.value); setUrl(''); }}
            >
              {editableComps.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}{c.listingUrl ? ' · linked' : ' · no direct link'}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-semibold text-foreground">Direct Airbnb URL (or blank to clear)</span>
            <input
              type="url"
              className="w-full rounded-xl border border-border/60 bg-background/70 px-3 py-2 text-foreground"
              placeholder="https://www.airbnb.com/rooms/1234567890"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </label>
          {currentUrl && (
            <p className="text-xs text-muted-foreground sm:col-span-2">
              Current: <a href={currentUrl} target="_blank" rel="noopener noreferrer" className="text-secondary underline-offset-2 hover:underline">{currentUrl}</a>
            </p>
          )}
          {showWarning && (
            <p className="rounded-xl border border-amber-400/25 bg-amber-400/10 p-3 text-sm text-amber-100 sm:col-span-2">
              That doesn't look like a direct Airbnb listing URL. Use the actual airbnb.com/rooms/&lt;id&gt; or airbnb.com/h/&lt;slug&gt; URL from the listing page.
            </p>
          )}
          <div className="sm:col-span-2">
            <Button type="submit" disabled={mutation.isPending || !listingId || !isValid}>
              {mutation.isPending ? 'Saving…' : isClearing ? 'Clear listing URL' : 'Save direct listing URL'}
            </Button>
          </div>
          {mutation.isSuccess && <p className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-sm text-emerald-100 sm:col-span-2">Saved. The dashboard will refresh from Supabase.</p>}
          {mutation.isError && <p className="rounded-xl border border-amber-400/25 bg-amber-400/10 p-3 text-sm text-amber-100 sm:col-span-2">Could not save: {mutation.error.message}</p>}
        </form>
      )}
    </details>
  );
}

export default function AirbnbMarket() {
  const { data: briefing, isFetching, isError } = useAirbnbMarketBriefing();
  const homesteadUnits = briefing.homesteadUnits;
  const marketComps = briefing.marketComps;
  const weeklyBriefing = briefing.weeklyBriefing;
  const summary = buildTopSummary(homesteadUnits, marketComps);

  return (
    <div className="min-h-screen pattern-bg">
      <Header />
      <main className="mx-auto max-w-6xl space-y-5 px-4 py-5 pb-24 sm:px-6 sm:py-6">
        {isFetching && <div className="rounded-2xl border border-secondary/20 bg-secondary/10 p-3 text-sm text-secondary">Loading market briefing from Supabase… showing last static fallback until it refreshes.</div>}
        {isError && <div className="rounded-2xl border border-amber-400/25 bg-amber-400/10 p-3 text-sm text-amber-100">Supabase market briefing unavailable. Static fallback is still visible.</div>}

        <section className="rounded-3xl border border-secondary/20 bg-gradient-to-br from-secondary/15 via-card/80 to-card p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-secondary/15 p-2 text-secondary"><BadgeDollarSign className="h-5 w-5" /></div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-secondary">Owner summary</p>
              <h2 className="mt-1 font-heading text-2xl font-bold text-foreground sm:text-3xl">Are we priced right for the proof we give?</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">One card per Homestead Hill unit, five signals each: price position, 30-day availability, long-stay proof, review trust, and recommended move.</p>
            </div>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryStat label="Below market" value={summary.belowMarket} tone="border-emerald-400/25 bg-emerald-400/10 text-emerald-100" />
            <SummaryStat label="At market" value={summary.atMarket} tone="border-secondary/30 bg-secondary/10 text-secondary" />
            <SummaryStat label="Above market" value={summary.aboveMarket} tone="border-amber-400/25 bg-amber-400/10 text-amber-100" />
            <SummaryStat label="Need listing proof" value={summary.needsProof} tone="border-amber-400/30 bg-amber-400/10 text-amber-100" />
          </div>
        </section>

        <WeeklyBriefingCard briefing={weeklyBriefing} />

        <section className="grid gap-4">
          {homesteadUnits.map((unit) => (
            <UnitSignalCard key={unit.unit} unit={unit} comps={marketComps} />
          ))}
        </section>

        <CompUrlAdminPanel comps={marketComps} />
        <SnapshotAdminPanel units={homesteadUnits} marketComps={marketComps} />
      </main>
    </div>
  );
}
