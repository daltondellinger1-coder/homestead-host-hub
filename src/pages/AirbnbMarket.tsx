import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  BadgeDollarSign,
  BedDouble,
  BriefcaseBusiness,
  Camera,
  Check,
  CheckCircle2,
  ClipboardList,
  HelpCircle,
  Home,
  Info,
  Mountain,
  Target,
  TrendingUp,
  Wrench,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  actionBacklog,
  amenityKeys,
  compTypeLabel,
  contractorFitScore,
  contractorWeights,
  dataFreshness,
  effectiveNightly,
  effectiveWeeklyNightly,
  homesteadUnits,
  marketComps,
  type AmenityKey,
  type HomesteadUnit,
} from '@/data/airbnbMarket';
import { cn } from '@/lib/utils';

const money = (value?: number) => (value ? `$${value.toLocaleString()}` : 'Verify');
const pct = (value?: number) => (typeof value === 'number' ? `${value.toFixed(1)}%` : 'Verify');
const directMonthlyComps = marketComps.filter((comp) => comp.monthlyEstimate);
const monthlyMedian = [...directMonthlyComps]
  .map((comp) => comp.monthlyEstimate || 0)
  .sort((a, b) => a - b)[Math.floor(directMonthlyComps.length / 2)];
const unit5 = homesteadUnits.find((unit) => unit.unit === 'Unit 5');
const unit5Delta = unit5?.monthlyPrice && monthlyMedian ? monthlyMedian - unit5.monthlyPrice : undefined;

function Header() {
  return (
    <header className="sticky top-0 z-10 border-b border-border/40 bg-card/95 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
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
              <p className="hidden text-xs text-muted-foreground sm:block">Contractor-stay control room</p>
            </div>
          </div>
        </div>
        <div className="hidden rounded-full border border-secondary/20 bg-secondary/10 px-3 py-1 text-xs font-semibold text-secondary sm:block">
          Internal owner view
        </div>
      </div>
    </header>
  );
}

function SectionHeader({ icon: Icon, title, subtext }: { icon: typeof Target; title: string; subtext?: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="rounded-xl bg-secondary/15 p-2 text-secondary">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <h2 className="font-heading text-xl font-bold text-foreground">{title}</h2>
        {subtext && <p className="mt-1 text-sm leading-5 text-muted-foreground">{subtext}</p>}
      </div>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, detail, tone = 'blue' }: { icon: typeof Target; label: string; value: string; detail: string; tone?: 'blue' | 'green' | 'amber' }) {
  return (
    <div className={cn('rounded-2xl border p-4 shadow-sm', tone === 'green' ? 'border-emerald-400/20 bg-emerald-400/10' : tone === 'amber' ? 'border-amber-400/25 bg-amber-400/10' : 'border-secondary/20 bg-secondary/10')}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-muted-foreground">{label}</p>
          <p className="mt-2 font-heading text-2xl font-bold text-foreground">{value}</p>
        </div>
        <div className={cn('rounded-xl p-2', tone === 'green' ? 'bg-emerald-400/15 text-emerald-300' : tone === 'amber' ? 'bg-amber-400/15 text-amber-300' : 'bg-secondary/15 text-secondary')}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <p className="mt-3 text-sm leading-5 text-muted-foreground">{detail}</p>
    </div>
  );
}

function AmenityMark({ value }: { value?: boolean | 'unclear' }) {
  if (value === true) return <Check className="mx-auto h-4 w-4 text-emerald-300" aria-label="yes" />;
  if (value === false) return <X className="mx-auto h-4 w-4 text-red-300" aria-label="no" />;
  return <HelpCircle className="mx-auto h-4 w-4 text-amber-300" aria-label="unclear" />;
}

function PriceStrip({ monthly, weekly, nightly }: { monthly?: number; weekly?: number; nightly?: number }) {
  return (
    <div className="grid grid-cols-3 gap-2 text-sm">
      <div className="rounded-xl bg-background/45 p-3">
        <p className="text-muted-foreground">Night</p>
        <p className="font-semibold text-foreground">{money(nightly)}</p>
      </div>
      <div className="rounded-xl bg-background/45 p-3">
        <p className="text-muted-foreground">Week</p>
        <p className="font-semibold text-foreground">{money(weekly)}</p>
        {weekly && <p className="text-[11px] text-muted-foreground">${effectiveWeeklyNightly(weekly)}/nt</p>}
      </div>
      <div className="rounded-xl bg-background/45 p-3">
        <p className="text-muted-foreground">Month</p>
        <p className="font-semibold text-foreground">{money(monthly)}</p>
        {monthly && <p className="text-[11px] text-muted-foreground">${effectiveNightly(monthly)}/nt</p>}
      </div>
    </div>
  );
}

function UnitCard({ unit }: { unit: HomesteadUnit }) {
  const score = contractorFitScore(unit);
  const tone = unit.status === 'push' ? 'border-emerald-400/25 bg-emerald-400/10' : unit.status === 'verify' ? 'border-amber-400/25 bg-amber-400/10' : 'border-border/60 bg-card/70';

  return (
    <article className={cn('rounded-3xl border p-4 sm:p-5', tone)}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-heading text-xl font-bold text-foreground">{unit.unit}</p>
          <p className="mt-1 text-sm leading-5 text-muted-foreground">{unit.bestFor}</p>
        </div>
        <div className="rounded-2xl bg-background/50 px-3 py-2 text-right">
          <p className="text-xs text-muted-foreground">Fit</p>
          <p className="font-heading text-xl font-bold text-foreground">{score}</p>
        </div>
      </div>

      <div className="mt-4">
        <PriceStrip monthly={unit.monthlyPrice} weekly={unit.weeklyPrice} nightly={unit.nightlyPrice} />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-xl bg-background/45 p-3">
          <p className="text-muted-foreground">Discount</p>
          <p className="font-semibold text-foreground">{pct(unit.monthlyDiscountPct || unit.weeklyDiscountPct)}</p>
        </div>
        <div className="rounded-xl bg-background/45 p-3">
          <p className="text-muted-foreground">Reviews</p>
          <p className="font-semibold text-foreground">{unit.rating ? `${unit.rating} (${unit.reviews})` : 'Verify'}</p>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-border/50 bg-background/35 p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Target className="h-4 w-4 text-secondary" />
          Owner action
        </div>
        <p className="mt-2 text-sm leading-5 text-muted-foreground">{unit.ownerAction}</p>
        <p className="mt-3 rounded-xl bg-background/40 px-3 py-2 text-xs leading-5 text-muted-foreground">{unit.dataStatus}</p>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div>
          <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground"><CheckCircle2 className="h-4 w-4 text-emerald-300" /> Visible strengths</p>
          <div className="flex flex-wrap gap-2">
            {unit.amenities.map((item) => (
              <span key={item} className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-xs text-emerald-100">{item}</span>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground"><Wrench className="h-4 w-4 text-amber-300" /> Missing or unclear</p>
          <div className="flex flex-wrap gap-2">
            {unit.missingOrUnclear.map((item) => (
              <span key={item} className="rounded-full border border-amber-400/20 bg-amber-400/10 px-2.5 py-1 text-xs text-amber-100">{item}</span>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4">
        <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground"><Camera className="h-4 w-4 text-secondary" /> First-photo fixes</p>
        <ol className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
          {unit.photoActions.map((item) => (
            <li key={item} className="rounded-xl bg-background/35 px-3 py-2">{item}</li>
          ))}
        </ol>
      </div>
    </article>
  );
}

function RevenueSimulator() {
  const scenarios = [
    { price: 1700, occ: 90 },
    { price: 1850, occ: 85 },
    { price: 2000, occ: 75 },
    { price: 2200, occ: 65 },
  ];

  return (
    <section className="rounded-3xl border border-border/60 bg-card/70 p-4 sm:p-5">
      <SectionHeader icon={TrendingUp} title="Monthly revenue simulator" subtext="Use this to decide whether to chase higher rent or higher occupancy for contractor stays." />
      <div className="mt-4 grid gap-3 sm:grid-cols-4">
        {scenarios.map((scenario) => (
          <div key={scenario.price} className="rounded-2xl border border-border/50 bg-background/40 p-4">
            <p className="text-sm text-muted-foreground">{money(scenario.price)} at {scenario.occ}%</p>
            <p className="mt-2 font-heading text-2xl font-bold text-foreground">{money(Math.round((scenario.price * scenario.occ) / 100))}</p>
            <p className="mt-1 text-xs text-muted-foreground">weighted monthly revenue</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function CompetitorCards() {
  return (
    <section className="rounded-3xl border border-border/60 bg-card/70 p-4 sm:p-5">
      <SectionHeader icon={Home} title="Competitor cards" subtext="Each comp is grouped by how much it matters to a 30+ day worker, not by vacation appeal." />
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {marketComps.map((comp) => (
          <article key={comp.name} className="rounded-2xl border border-border/50 bg-background/35 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-foreground">{comp.name}</p>
                <p className="text-xs text-secondary">{compTypeLabel(comp.compType)}</p>
              </div>
              <div className="text-right text-xs text-muted-foreground">
                {comp.bedrooms ? `${comp.bedrooms}BR` : 'Beds verify'} {comp.rating ? ` · ${comp.rating}` : ''}
              </div>
            </div>
            <div className="mt-3">
              <PriceStrip monthly={comp.monthlyEstimate} weekly={comp.weeklyEstimate} nightly={comp.nightlyPrice} />
            </div>
            <p className="mt-3 text-sm leading-5 text-muted-foreground">{comp.notes}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {comp.contractorAmenities.map((item) => (
                <span key={item} className="rounded-full border border-border/50 bg-muted/25 px-2.5 py-1 text-xs text-muted-foreground">{item}</span>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function AmenityMatrix() {
  const rows: { name: string; map: Partial<Record<AmenityKey, boolean | 'unclear'>> }[] = [
    ...homesteadUnits.map((unit) => ({ name: unit.unit, map: unit.amenityMap })),
    ...marketComps.slice(0, 4).map((comp) => ({ name: comp.name, map: comp.amenityMap })),
  ];

  return (
    <section className="rounded-3xl border border-border/60 bg-card/70 p-4 sm:p-5">
      <SectionHeader icon={ClipboardList} title="Amenity gap matrix" subtext="Green means visible strength, amber means unclear, red means not a fit or likely missing." />
      <div className="mt-4 overflow-x-auto rounded-2xl border border-border/50">
        <table className="min-w-[920px] w-full text-left text-sm">
          <thead className="bg-muted/50 text-xs text-muted-foreground">
            <tr>
              <th className="sticky left-0 bg-muted px-4 py-3 text-left">Listing</th>
              {amenityKeys.map((key) => <th key={key} className="px-3 py-3 text-center">{key}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {rows.map((row) => (
              <tr key={row.name} className="bg-background/25">
                <td className="sticky left-0 bg-card px-4 py-3 font-semibold text-foreground">{row.name}</td>
                {amenityKeys.map((key) => (
                  <td key={key} className="px-3 py-3 text-center"><AmenityMark value={row.map[key]} /></td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ActionBacklog() {
  return (
    <section className="rounded-3xl border border-border/60 bg-card/70 p-4 sm:p-5">
      <SectionHeader icon={Wrench} title="Listing improvement backlog" subtext="Cheap changes first. Do not cut price until contractor value is obvious in the listing." />
      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        {actionBacklog.map((group) => (
          <div key={group.group} className="rounded-2xl border border-border/50 bg-background/35 p-4">
            <p className="font-semibold text-foreground">{group.group}</p>
            <ul className="mt-3 space-y-2 text-sm leading-5 text-muted-foreground">
              {group.items.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function AirbnbMarket() {
  return (
    <div className="min-h-screen pattern-bg">
      <Header />
      <main className="mx-auto max-w-7xl space-y-5 px-4 py-5 pb-24 sm:px-6 sm:py-6 lg:px-8">
        <section className="overflow-hidden rounded-3xl border border-secondary/20 bg-gradient-to-br from-secondary/15 via-card/80 to-card p-5 shadow-xl sm:p-7">
          <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-secondary/25 bg-secondary/10 px-3 py-1 text-xs font-semibold text-secondary">
                <BriefcaseBusiness className="h-3.5 w-3.5" />
                Monthly contractor stays
              </div>
              <h2 className="mt-4 font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Would a 30+ day worker pick Homestead Hill?</h2>
              <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
                Internal owner dashboard for price rank, contractor fit, amenity gaps, photo fixes, and the next cheapest action.
              </p>
            </div>
            <div className="rounded-2xl border border-border/50 bg-background/35 p-4">
              <p className="text-sm font-semibold text-foreground">Owner read</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">Unit 5 is not the cheap nightly option. It is a strong monthly value if the listing proves clean, quiet, work-ready housing.</p>
            </div>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard icon={BadgeDollarSign} label="Unit 5 monthly" value={money(unit5?.monthlyPrice)} detail={`About $${effectiveNightly(unit5?.monthlyPrice)}/night after the Airbnb monthly discount.`} tone="green" />
          <MetricCard icon={TrendingUp} label="Vs comp median" value={unit5Delta ? `$${unit5Delta} lower` : 'Verify'} detail="Monthly pricing looks strong if Airbnb shows the discount clearly." tone="green" />
          <MetricCard icon={BedDouble} label="Best target" value="30+ days" detail="Traveling worker, contractor, nurse, inspector, or supervisor." />
          <MetricCard icon={Target} label="Next move" value="Fix proof" detail="Photos and amenity tags must prove long-stay readiness before a price cut." tone="amber" />
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-3xl border border-border/60 bg-card/70 p-4 sm:p-5">
            <SectionHeader icon={ClipboardList} title="Owner action board" />
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {['Add every HH Airbnb link and 30-day screenshot', 'Standardize first 5 photos for contractor confidence', 'Audit laundry, workspace, parking, WiFi, pet tags'].map((item) => (
                <div key={item} className="rounded-2xl border border-border/50 bg-background/40 p-4 text-sm leading-5 text-muted-foreground">{item}</div>
              ))}
            </div>
          </div>
          <div className="rounded-3xl border border-border/60 bg-card/70 p-4 sm:p-5">
            <SectionHeader icon={Info} title="Fit score weights" />
            <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
              {contractorWeights.map(([label, weight]) => (
                <div key={label} className="flex items-center justify-between gap-2 rounded-xl bg-background/40 px-3 py-2">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-semibold text-foreground">{weight}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="font-heading text-2xl font-bold text-foreground">Homestead Hill unit rollup</h2>
            <p className="mt-1 text-sm text-muted-foreground">Each unit gets a clear owner action, contractor fit score, amenity gap, and photo punch list.</p>
          </div>
          <div className="grid gap-4">
            {homesteadUnits.map((unit) => (
              <UnitCard key={unit.unit} unit={unit} />
            ))}
          </div>
        </section>

        <RevenueSimulator />
        <CompetitorCards />
        <AmenityMatrix />
        <ActionBacklog />

        <section className="rounded-3xl border border-border/60 bg-card/70 p-4 text-sm leading-6 text-muted-foreground sm:p-5">
          <p className="font-semibold text-foreground">Data freshness and assumptions</p>
          <p className="mt-2">Pulled: {dataFreshness.pulled}</p>
          <p>{dataFreshness.caveat}</p>
        </section>
      </main>
    </div>
  );
}
