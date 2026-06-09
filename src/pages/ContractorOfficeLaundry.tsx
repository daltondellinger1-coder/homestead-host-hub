import { useEffect, type ReactNode } from "react";
import { ExternalLink, Camera, CheckCircle2, ClipboardList, Hammer, Shield, Wrench } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const projectUrl = "https://homestead-hill.com/contractor/office-laundry-bid-a7k29";

const pricingNotes = [
  "Price each numbered section separately so approvals can be broken out cleanly.",
  "Owner will purchase/stage the linked finish materials and equipment unless otherwise agreed.",
  "Include labor, normal small installation materials, and normal rough plumbing/venting materials tied to your scope.",
  "Flag field conflicts, missing rough materials, or code/permit concerns before work starts.",
];

const scopeSections = [
  {
    number: "02",
    title: "Exterior Door",
    items: [
      <>
        Install owner-provided{" "}
        <ProductLink href="https://www.lowes.com/pd/RELIABILT-RB-32-6-PNL-STEEL-SLAB/5014734849">
          RELIABILT 32 in. x 80 in. steel universal reversible slab front door
        </ProductLink>{" "}
        if existing frame/jamb conditions allow.
      </>,
      "Field-verify slab dimensions, thickness, hinge count/location, bore/backset, handing/swing, threshold, weatherstrip, and jamb condition.",
      "Preserve existing trim, jamb, and plaster where feasible; avoid prehung replacement unless slab-only is not workable.",
      "If slab replacement is not feasible, price the least-invasive correction and note what changed.",
    ],
  },
  {
    number: "03",
    title: "Interior Door to Half Bath / Back Room",
    items: [
      <>
        Install owner-provided{" "}
        <ProductLink href="https://www.lowes.com/pd/RELIABILT-32-in-x-80-in-6-panel-Hollow-Core-Primed-Molded-Composite-Slab-Door/5014866481">
          RELIABILT 32 in. x 80 in. six-panel hollow-core primed interior slab door with lockset bore
        </ProductLink>
        .
      </>,
      "Field-verify opening, swing/handing, hinge prep, latch prep, bathroom clearance, and trim/jamb condition.",
      "Include trimming/planing, hinge/latch fitting, fastening, minor patching, and finish prep.",
    ],
  },
  {
    number: "22",
    title: "Laundry / Appliance Install",
    items: [
      <>
        Coordinate final{" "}
        <ProductLink href="https://www.ajmadison.com/cgi-bin/ajmadison/TV2000WN.html">
          Speed Queen TV2000WN washer
        </ProductLink>{" "}
        and{" "}
        <ProductLink href="https://www.ajmadison.com/cgi-bin/ajmadison/DV2000WE.html">
          Speed Queen DV2000WE dryer
        </ProductLink>{" "}
        placement with plumbing, dryer vent path, clearances, and service access.
      </>,
      "Run/complete washer rough-in: hot/cold supply, washer box or shutoffs, drain/standpipe, trap/venting, supports, penetrations, sealing/fireblocking.",
      "Install dryer vent exhaust system to exterior per code, including ducting, termination, clamps/tape, sealant, and normal venting materials.",
    ],
  },
  {
    number: "23",
    title: "Half Bath Rough-In / Fixture Install",
    items: [
      "Convert back room into half bath; rough-in and install fixtures as separated below for pricing and review.",
      "Rough in toilet drain/waste/vent plus sink supply, drain/waste/vent, shutoffs, and fixture connections.",
      <>
        Install owner-provided{" "}
        <ProductLink href="https://www.lowes.com/pd/Project-Source-Pro-flush-White-Elongated-Chair-height-12-in-Rough-In-WaterSense-1-28-GPF-2-piece-Toilet/5017824327">
          Project Source Pro-Flush elongated chair-height 2-piece toilet
        </ProductLink>
        .
      </>,
      <>
        Install owner-provided{" "}
        <ProductLink href="https://www.lowes.com/pd/AquaSource-33-66-in-H-White-Vitreous-China-Pedestal-Sink-Combo/5006032605">
          Project Source Alexa white pedestal sink combo
        </ProductLink>
        .
      </>,
      <>
        Install owner-provided{" "}
        <ProductLink href="https://www.amazon.com/dp/B0B2LKJ8C9">
          Hurran 4 in. matte black centerset bathroom faucet
        </ProductLink>
        .
      </>,
      <>
        Install owner-provided{" "}
        <ProductLink href="https://www.amazon.com/dp/B0CQJRRZPG">
          DUMOS 30 in. x 22 in. black rounded-rectangle bathroom mirror
        </ProductLink>
        .
      </>,
      <>
        Install owner-provided{" "}
        <ProductLink href="https://www.amazon.com/dp/B0DHKMB3Z3">
          Donrao LED Modern Bathroom Light Fixtures, 3-Light 24-Inch Matte Black Vanity Light, 6000K Cool White
        </ProductLink>
        ; center with the sink/mirror layout.
      </>,
      <>
        Install owner-provided{" "}
        <ProductLink href="https://www.lowes.com/pd/Broan-Broan-NuTone-Roomside-Series-Bathroom-Exhaust-Fan-80-CFM-ENERGY-STAR/5015680201">
          Broan-NuTone Roomside Series 80 CFM bathroom exhaust fan
        </ProductLink>
        .
      </>,
      "Patch, prep, and paint disturbed half-bath surfaces. Owner provides paint.",
    ],
  },
  {
    number: "26",
    title: "Electrical / Lighting Coordination",
    items: [
      "Electrical work is excluded unless specifically clarified.",
      "Coordinate blocking, wall patching, mirror placement, sink placement, fan placement, and access so fixtures are centered and usable.",
    ],
  },
  {
    number: "36",
    title: "Painting / Finish / Patch",
    items: [
      "Patch and prep surfaces disturbed by door work, bath rough-in, laundry plumbing, exhaust/dryer venting, mini-split install, lighting/mirror coordination, and penetrations.",
      "Paint disturbed areas as assigned. Owner provides paint.",
      "Include normal finish consumables tied to contractor work.",
    ],
  },
  {
    number: "39",
    title: "HVAC / Mini-Split",
    items: [
      <>
        Install owner-provided{" "}
        <ProductLink href="https://www.amazon.com/dp/B00UV3LGUE">
          Senville LETO 12,000 BTU 110/120V mini-split heat pump
        </ProductLink>{" "}
        if included in final contractor scope.
      </>,
      "Clarify kit gaps: wall sleeve, line-hide, bracket/pad, support, condensate tubing/pump, exterior sealant, fasteners, or adapters.",
      "Electrical feed, disconnect, breaker/wire sizing, and permit are by electrician.",
    ],
  },
  {
    number: "40",
    title: "Tankless Water Heater",
    items: [
      "Tankless water heater is already owner-purchased. Do not include equipment cost.",
      "Bid install only if included in final contractor scope.",
      "Flag plumbing materials, venting, isolation valves, condensate handling, mounting/backing, and permit/code items.",
    ],
  },
];

const ownerProvided = [
  "Exterior and interior slab doors linked above",
  "Speed Queen washer and dryer equipment",
  "Half-bath toilet, pedestal sink, faucet, mirror, vanity light, and exhaust fan",
  "Mini-split equipment if approved in final scope",
  "Paint for assigned disturbed-area touch-up",
  "Tankless water heater equipment already purchased",
];

const contractorSupplied = [
  "Normal rough plumbing and venting materials for laundry and half bath",
  "Dryer vent ducting, termination, clamps/tape, sealant, and supports",
  "Shims, fasteners, caulk, patch/filler, masking, and normal finish consumables",
  "Blocking, backing, supports, and minor trim/filler tied to listed work",
  "Any missing rough materials should be clearly flagged in the bid",
];

const exclusions = [
  ["Electrical", "Excluded unless specifically clarified; electrician handles electrical feed, breaker/wire sizing, disconnects, fixture wiring, and permits."],
  ["Windows", "Excluded; handled separately."],
  ["Airbnb furnishings / housewares", "Excluded from base bid; may be separately approved after bid."],
  ["TVs, mounts, beds, bedding, towels, dishes, consumables", "Excluded from base bid; may be separately approved after bid."],
  ["Blinds", "Excluded unless separately approved after final window measurements and bid review."],
  ["Unlisted drywall/wall work", "Excluded beyond listed patch, prep, paint, and disturbed-area finish unless approved in writing."],
  ["Anything not specifically listed", "Excluded unless approved in writing."],
];

function ProductLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline font-semibold text-secondary underline decoration-primary/50 underline-offset-4 break-words [overflow-wrap:anywhere] transition hover:text-secondary/80 hover:decoration-primary"
    >
      {children}
      <ExternalLink className="ml-1 inline h-3.5 w-3.5 align-[-2px]" aria-hidden="true" />
    </a>
  );
}

function InfoCard({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children: ReactNode }) {
  return (
    <section className="rounded-3xl border border-secondary/20 bg-card/80 p-6 shadow-lg shadow-black/20 backdrop-blur">
      <div className="mb-4 flex items-center gap-3">
        <div className="rounded-2xl bg-secondary/10 p-3 text-secondary">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
        <h2 className="text-xl font-semibold text-foreground">{title}</h2>
      </div>
      {children}
    </section>
  );
}

export default function ContractorOfficeLaundry() {
  useEffect(() => {
    document.title = "Office Laundry Contractor Scope | Homestead Hill";
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex, nofollow";
    document.head.appendChild(meta);

    return () => {
      document.head.removeChild(meta);
    };
  }, []);

  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-foreground">

      <main className="overflow-hidden">
        <section className="relative border-b border-secondary/20 navy-gradient px-4 py-10 sm:px-6 lg:px-8 lg:py-16">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-secondary/70 to-transparent" />
          <div className="mx-auto max-w-6xl">
            <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.35em] text-secondary">Homestead Hill</p>
                <p className="mt-2 text-sm text-muted-foreground">Private contractor packet · Unlisted URL</p>
              </div>
              <a
                href="/"
                className="w-fit rounded-full border border-secondary/30 px-4 py-2 text-sm font-semibold text-foreground transition hover:border-secondary hover:bg-secondary/10"
              >
                homestead-hill.com
              </a>
            </div>

            <div className="grid gap-8 lg:grid-cols-[1.35fr_0.65fr] lg:items-end">
              <div>
                <p className="mb-4 inline-flex rounded-full bg-secondary/10 px-4 py-2 text-sm font-semibold text-secondary ring-1 ring-secondary/20">
                  Contractor Pricing Scope
                </p>
                <h1 className="max-w-4xl break-words text-4xl font-semibold leading-tight text-foreground sm:text-5xl lg:text-6xl">
                  Office Laundry / Back Room Scope
                </h1>
                <p className="mt-5 max-w-3xl text-lg leading-8 text-muted-foreground">
                  Please price the listed labor, rough materials, fixture installs, and field-verification items. Owner-provided finish materials are linked inside the scope lines.
                </p>
              </div>

              <div className="rounded-3xl border border-secondary/25 bg-secondary/70 p-6 shadow-lg shadow-black/20">
                <p className="text-sm uppercase tracking-[0.25em] text-muted-foreground">Photo album</p>
                <div className="mt-4 flex items-start gap-3">
                  <Camera className="mt-1 h-5 w-5 flex-none text-secondary" aria-hidden="true" />
                  <p className="text-sm leading-6 text-foreground">
                    Review the field photos in the{" "}
                    <ProductLink href="https://photos.app.goo.gl/YbRNggErH3JVZCce6">
                      Google Photos album
                    </ProductLink>{" "}
                    while pricing the scope.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-6xl space-y-8 px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
          <InfoCard icon={ClipboardList} title="Quick Pricing Notes">
            <ul className="grid gap-3 sm:grid-cols-2">
              {pricingNotes.map((note) => (
                <li key={note} className="flex gap-3 rounded-2xl bg-background/45 p-4 text-sm leading-6 text-muted-foreground">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 flex-none text-secondary" aria-hidden="true" />
                  <span>{note}</span>
                </li>
              ))}
            </ul>
          </InfoCard>

          <section className="space-y-5">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-secondary">Numbered scope</p>
              <h2 className="mt-2 text-3xl font-semibold text-foreground">Primary Scope Sections</h2>
              <p className="mt-3 max-w-3xl break-words text-muted-foreground">
                Numbered lines preserve the bid structure so pricing can map back cleanly. Product links are separated where the contractor needs to review individual materials.
              </p>
            </div>

            <div className="grid min-w-0 gap-5 lg:grid-cols-2">
              {scopeSections.map((section) => (
                <article key={section.number} className="min-w-0 rounded-3xl border border-secondary/15 bg-gradient-card p-5 shadow-soft">
                  <div className="mb-4 flex items-start gap-3">
                    <span className="rounded-2xl bg-secondary px-3 py-2 text-sm font-bold text-secondary-foreground shadow-gold">
                      {section.number}
                    </span>
                    <h3 className="pt-1 text-xl font-semibold text-foreground">{section.title}</h3>
                  </div>
                  <ul className="min-w-0 space-y-3 text-sm leading-6 text-muted-foreground">
                    {section.items.map((item, index) => (
                      <li key={index} className="flex min-w-0 gap-3">
                        <span className="mt-2 h-1.5 w-1.5 flex-none rounded-full bg-secondary" />
                        <span className="min-w-0 break-words">{item}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            <InfoCard icon={Shield} title="Owner-Provided / Owner-To-Buy Materials">
              <ul className="min-w-0 space-y-3 text-sm leading-6 text-muted-foreground">
                {ownerProvided.map((item) => (
                  <li key={item} className="flex min-w-0 gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 flex-none text-secondary" aria-hidden="true" />
                    <span className="min-w-0 break-words">{item}</span>
                  </li>
                ))}
              </ul>
            </InfoCard>

            <InfoCard icon={Hammer} title="Contractor-Supplied Rough / Normal Materials">
              <ul className="min-w-0 space-y-3 text-sm leading-6 text-muted-foreground">
                {contractorSupplied.map((item) => (
                  <li key={item} className="flex min-w-0 gap-3">
                    <Wrench className="mt-0.5 h-5 w-5 flex-none text-secondary" aria-hidden="true" />
                    <span className="min-w-0 break-words">{item}</span>
                  </li>
                ))}
              </ul>
            </InfoCard>
          </div>

          <section className="rounded-3xl border border-secondary/20 bg-secondary/50 p-6 shadow-lg shadow-black/20">
            <div className="mb-6">
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-secondary">Base bid boundaries</p>
              <h2 className="mt-2 text-3xl font-semibold text-foreground">Excluded / Separate Scope</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {exclusions.map(([item, status]) => (
                <div key={item} className="rounded-2xl border border-secondary/15 bg-background/45 p-4">
                  <h3 className="font-semibold text-foreground">{item}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{status}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-secondary/20 bg-card/80 p-6 text-center shadow-lg shadow-black/20">
            <h2 className="text-2xl font-semibold text-foreground">Closeout / Bid Return</h2>
            <p className="mx-auto mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
              Please return pricing by numbered section, call out allowances or exclusions, and list any field-verification questions that need owner approval before work starts.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
