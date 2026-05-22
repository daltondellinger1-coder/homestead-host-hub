# Graph Report - homestead-host-hub  (2026-05-22)

## Corpus Check
- 149 files · ~99,625 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 847 nodes · 1676 edges · 51 communities (47 shown, 4 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `5a0cd652`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 54|Community 54]]

## God Nodes (most connected - your core abstractions)
1. `cn()` - 79 edges
2. `dependencies` - 56 edges
3. `Button` - 35 edges
4. `devDependencies` - 22 edges
5. `compilerOptions` - 19 edges
6. `Input` - 18 edges
7. `usePropertyData()` - 18 edges
8. `SelectTrigger` - 17 edges
9. `SelectContent` - 17 edges
10. `SelectItem` - 17 edges

## Surprising Connections (you probably didn't know these)
- `cn()` --calls--> `clsx`  [INFERRED]
  src/lib/utils.ts → package.json
- `DrawerHeader()` --calls--> `cn()`  [EXTRACTED]
  src/components/ui/drawer.tsx → src/lib/utils.ts
- `DrawerFooter()` --calls--> `cn()`  [EXTRACTED]
  src/components/ui/drawer.tsx → src/lib/utils.ts
- `SheetHeader()` --calls--> `cn()`  [EXTRACTED]
  src/components/ui/sheet.tsx → src/lib/utils.ts
- `SheetFooter()` --calls--> `cn()`  [EXTRACTED]
  src/components/ui/sheet.tsx → src/lib/utils.ts

## Communities (51 total, 4 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.06
Nodes (74): AddUnitDialogProps, AvailabilitySearchProps, AvailableUnit, BookingInfo, TYPE_ICONS, BookingBar, BookingTimeline(), BookingTimelineProps (+66 more)

### Community 1 - "Community 1"
Cohesion: 0.04
Nodes (55): dependencies, class-variance-authority, cmdk, date-fns, @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities, embla-carousel-react (+47 more)

### Community 2 - "Community 2"
Cohesion: 0.13
Nodes (22): useAuth(), useAuthRoles(), AppRole, canAccessPath(), getPostLoginPath(), getStoredLoginLane(), LoginLane, setStoredLoginLane() (+14 more)

### Community 3 - "Community 3"
Cohesion: 0.15
Nodes (23): ManagementDashboard(), ManagementFee, RevenueTarget, PaymentHistoryContent(), SortDir, SortField, WeeklyReport(), DbGuest (+15 more)

### Community 4 - "Community 4"
Cohesion: 0.05
Nodes (37): useIsMobile(), Separator, SheetContent, SheetContentProps, SheetDescription, SheetFooter(), SheetHeader(), SheetOverlay (+29 more)

### Community 5 - "Community 5"
Cohesion: 0.06
Nodes (57): BulkDeletePaymentsDialog(), BulkDeletePaymentsDialogProps, formatCurrency(), PaymentEvent, Dashboard(), DashboardProps, GuestDialogMode, parseEstimatedTotal() (+49 more)

### Community 6 - "Community 6"
Cohesion: 0.09
Nodes (22): devDependencies, autoprefixer, eslint, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals, jsdom (+14 more)

### Community 7 - "Community 7"
Cohesion: 0.12
Nodes (23): Action, ActionType, actionTypes, addToRemoveQueue(), dispatch(), genId(), listeners, memoryState (+15 more)

### Community 8 - "Community 8"
Cohesion: 0.09
Nodes (18): corsHeaders, descField, description, nameField, phone, phoneField, photoField, photoUrls (+10 more)

### Community 9 - "Community 9"
Cohesion: 0.09
Nodes (21): compilerOptions, allowImportingTsExtensions, isolatedModules, jsx, lib, module, moduleDetection, moduleResolution (+13 more)

### Community 10 - "Community 10"
Cohesion: 0.14
Nodes (18): PullToRefresh(), PullToRefreshProps, clsx, cn(), ButtonProps, buttonVariants, Calendar(), CalendarProps (+10 more)

### Community 11 - "Community 11"
Cohesion: 0.1
Nodes (12): NavLink, NavLinkCompatProps, Avatar, AvatarFallback, AvatarImage, Checkbox, HoverCardContent, PopoverContent (+4 more)

### Community 12 - "Community 12"
Cohesion: 0.08
Nodes (23): SortableUnitCardProps, SortableUnitGridProps, AvailabilityInfo, formatCurrency(), StatsOverview(), StatsOverviewProps, TYPE_ICONS, daysUntil() (+15 more)

### Community 13 - "Community 13"
Cohesion: 0.12
Nodes (16): aliases, components, hooks, lib, ui, utils, rsc, $schema (+8 more)

### Community 14 - "Community 14"
Cohesion: 0.21
Nodes (15): buildMaintenanceInsert(), fieldFiles(), fieldsFromPayload(), fieldString(), findField(), getTallyEventId(), HH_MAINTENANCE_QR_BRAND, HH_MAINTENANCE_QR_UNITS (+7 more)

### Community 15 - "Community 15"
Cohesion: 0.12
Nodes (15): compilerOptions, allowImportingTsExtensions, isolatedModules, lib, module, moduleDetection, moduleResolution, noEmit (+7 more)

### Community 16 - "Community 16"
Cohesion: 0.25
Nodes (8): scripts, build, build:dev, dev, lint, preview, test, test:watch

### Community 17 - "Community 17"
Cohesion: 0.13
Nodes (14): Branded QR generator, code:block1 (https://tally.so/r/ABC123), code:block2 (https://tally.so/r/ABC123?unit=Unit+1), code:bash (python3 scripts/generate-maintenance-qr-codes.py --form-url ), code:block4 (https://tally.so/r/ABC123?unit=Unit+1), How it works day-to-day, If logging from email gets tedious later, Maintenance Form & QR Code Setup (+6 more)

### Community 18 - "Community 18"
Cohesion: 0.14
Nodes (12): Carousel, CarouselApi, CarouselContent, CarouselContext, CarouselContextProps, CarouselItem, CarouselNext, CarouselOptions (+4 more)

### Community 19 - "Community 19"
Cohesion: 0.17
Nodes (11): compilerOptions, allowJs, noImplicitAny, noUnusedLocals, noUnusedParameters, paths, skipLibCheck, strictNullChecks (+3 more)

### Community 20 - "Community 20"
Cohesion: 0.17
Nodes (9): FormControl, FormDescription, FormFieldContext, FormFieldContextValue, FormItem, FormItemContext, FormItemContextValue, FormLabel (+1 more)

### Community 21 - "Community 21"
Cohesion: 0.17
Nodes (11): Menubar, MenubarCheckboxItem, MenubarContent, MenubarItem, MenubarLabel, MenubarRadioItem, MenubarSeparator, MenubarShortcut() (+3 more)

### Community 22 - "Community 22"
Cohesion: 0.18
Nodes (7): ChartConfig, ChartContainer, ChartContext, ChartContextProps, ChartLegendContent, ChartTooltipContent, THEMES

### Community 23 - "Community 23"
Cohesion: 0.18
Nodes (9): Command, CommandDialogProps, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator (+1 more)

### Community 24 - "Community 24"
Cohesion: 0.2
Nodes (9): After I ship, code:text (Tenant scans QR in unit), Files I'll create/edit, How it flows, Maintenance Work Order System, Out of scope (not building), What I'll build in Host Hub, What you set up outside the app (one-time, ~15 min) (+1 more)

### Community 25 - "Community 25"
Cohesion: 0.2
Nodes (9): ContextMenuCheckboxItem, ContextMenuContent, ContextMenuItem, ContextMenuLabel, ContextMenuRadioItem, ContextMenuSeparator, ContextMenuShortcut(), ContextMenuSubContent (+1 more)

### Community 26 - "Community 26"
Cohesion: 0.44
Nodes (8): center_text(), font(), main(), make_card(), make_contact_sheet(), make_qr(), safe_name(), target_url()

### Community 27 - "Community 27"
Cohesion: 0.25
Nodes (7): Can I connect a custom domain to my Lovable project?, code:sh (# Step 1: Clone the repository using the project's Git URL.), How can I deploy this project?, How can I edit this code?, Project info, Welcome to your Lovable project, What technologies are used for this project?

### Community 28 - "Community 28"
Cohesion: 0.25
Nodes (7): Breadcrumb, BreadcrumbEllipsis(), BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator()

### Community 29 - "Community 29"
Cohesion: 0.25
Nodes (6): DrawerContent, DrawerDescription, DrawerFooter(), DrawerHeader(), DrawerOverlay, DrawerTitle

### Community 30 - "Community 30"
Cohesion: 0.25
Nodes (7): NavigationMenu, NavigationMenuContent, NavigationMenuIndicator, NavigationMenuList, NavigationMenuTrigger, navigationMenuTriggerStyle, NavigationMenuViewport

### Community 31 - "Community 31"
Cohesion: 0.33
Nodes (5): ToggleGroup, ToggleGroupContext, ToggleGroupItem, Toggle, toggleVariants

### Community 32 - "Community 32"
Cohesion: 0.06
Nodes (44): LogMaintenanceDialog(), formatRelative(), MaintenanceRequestCard(), MaintenanceRequestCardProps, photoCount(), adminTitles, titles, MobileBottomNav() (+36 more)

### Community 33 - "Community 33"
Cohesion: 0.4
Nodes (4): Alert, AlertDescription, AlertTitle, alertVariants

### Community 34 - "Community 34"
Cohesion: 0.5
Nodes (3): AccordionContent, AccordionItem, AccordionTrigger

### Community 35 - "Community 35"
Cohesion: 0.4
Nodes (4): name, private, type, version

### Community 49 - "Community 49"
Cohesion: 0.13
Nodes (20): ADMIN_EMAILS, allowed, authHeader, Body, completionPhotos, corsHeaders, esc(), Event (+12 more)

### Community 54 - "Community 54"
Cohesion: 0.4
Nodes (4): InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot

## Knowledge Gaps
- **448 isolated node(s):** `allowJs`, `noImplicitAny`, `noUnusedLocals`, `noUnusedParameters`, `@/*` (+443 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `Community 10` to `Community 0`, `Community 3`, `Community 4`, `Community 5`, `Community 7`, `Community 11`, `Community 12`, `Community 18`, `Community 20`, `Community 21`, `Community 22`, `Community 23`, `Community 25`, `Community 28`, `Community 29`, `Community 30`, `Community 31`, `Community 32`, `Community 33`, `Community 34`, `Community 54`?**
  _High betweenness centrality (0.278) - this node is a cross-community bridge._
- **Why does `dependencies` connect `Community 1` to `Community 10`, `Community 35`?**
  _High betweenness centrality (0.150) - this node is a cross-community bridge._
- **Why does `clsx` connect `Community 10` to `Community 1`?**
  _High betweenness centrality (0.143) - this node is a cross-community bridge._
- **What connects `allowJs`, `noImplicitAny`, `noUnusedLocals` to the rest of the system?**
  _448 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.06 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.04 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.13 - nodes in this community are weakly interconnected._