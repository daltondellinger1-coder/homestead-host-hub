# Graph Report - homestead-host-hub  (2026-06-24)

## Corpus Check
- 214 files · ~3,351,689 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1461 nodes · 2644 edges · 110 communities (100 shown, 10 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `c1af9b2a`
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
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_Community 57|Community 57]]
- [[_COMMUNITY_Community 58|Community 58]]
- [[_COMMUNITY_Community 59|Community 59]]
- [[_COMMUNITY_Community 60|Community 60]]
- [[_COMMUNITY_Community 62|Community 62]]
- [[_COMMUNITY_Community 63|Community 63]]
- [[_COMMUNITY_Community 64|Community 64]]
- [[_COMMUNITY_Community 65|Community 65]]
- [[_COMMUNITY_Community 66|Community 66]]
- [[_COMMUNITY_Community 67|Community 67]]
- [[_COMMUNITY_Community 68|Community 68]]
- [[_COMMUNITY_Community 69|Community 69]]
- [[_COMMUNITY_Community 72|Community 72]]
- [[_COMMUNITY_Community 73|Community 73]]
- [[_COMMUNITY_Community 74|Community 74]]
- [[_COMMUNITY_Community 75|Community 75]]
- [[_COMMUNITY_Community 77|Community 77]]
- [[_COMMUNITY_Community 78|Community 78]]
- [[_COMMUNITY_Community 79|Community 79]]
- [[_COMMUNITY_Community 80|Community 80]]
- [[_COMMUNITY_Community 81|Community 81]]
- [[_COMMUNITY_Community 82|Community 82]]
- [[_COMMUNITY_Community 83|Community 83]]
- [[_COMMUNITY_Community 88|Community 88]]
- [[_COMMUNITY_Community 89|Community 89]]
- [[_COMMUNITY_Community 90|Community 90]]
- [[_COMMUNITY_Community 91|Community 91]]
- [[_COMMUNITY_Community 92|Community 92]]
- [[_COMMUNITY_Community 93|Community 93]]
- [[_COMMUNITY_Community 94|Community 94]]
- [[_COMMUNITY_Community 95|Community 95]]
- [[_COMMUNITY_Community 96|Community 96]]
- [[_COMMUNITY_Community 97|Community 97]]
- [[_COMMUNITY_Community 98|Community 98]]
- [[_COMMUNITY_Community 99|Community 99]]
- [[_COMMUNITY_Community 100|Community 100]]
- [[_COMMUNITY_Community 101|Community 101]]
- [[_COMMUNITY_Community 102|Community 102]]
- [[_COMMUNITY_Community 103|Community 103]]
- [[_COMMUNITY_Community 104|Community 104]]
- [[_COMMUNITY_Community 105|Community 105]]
- [[_COMMUNITY_Community 106|Community 106]]

## God Nodes (most connected - your core abstractions)
1. `cn()` - 84 edges
2. `dependencies` - 56 edges
3. `Button` - 48 edges
4. `url_results` - 28 edges
5. `url_results` - 28 edges
6. `url_results` - 28 edges
7. `url_results` - 28 edges
8. `url_results` - 28 edges
9. `url_results` - 28 edges
10. `Input` - 26 edges

## Surprising Connections (you probably didn't know these)
- `cn()` --calls--> `clsx`  [INFERRED]
  src/lib/utils.ts → package.json
- `WeeklyReport()` --calls--> `addDays()`  [INFERRED]
  src/components/WeeklyReport.tsx → src/lib/calendarSyncHealth.ts
- `DrawerHeader()` --calls--> `cn()`  [EXTRACTED]
  src/components/ui/drawer.tsx → src/lib/utils.ts
- `DrawerFooter()` --calls--> `cn()`  [EXTRACTED]
  src/components/ui/drawer.tsx → src/lib/utils.ts
- `SheetHeader()` --calls--> `cn()`  [EXTRACTED]
  src/components/ui/sheet.tsx → src/lib/utils.ts

## Communities (110 total, 10 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.05
Nodes (95): AddUnitDialog(), AddUnitDialogProps, AvailabilitySearchProps, AvailableUnit, BookingInfo, TYPE_ICONS, BookingBar, BookingTimeline() (+87 more)

### Community 1 - "Community 1"
Cohesion: 0.04
Nodes (56): dependencies, class-variance-authority, clsx, cmdk, date-fns, @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities (+48 more)

### Community 2 - "Community 2"
Cohesion: 0.06
Nodes (31): decode_failures, note, page_count_warnings, url_results, https://form.jotform.com/261687221033149, https://homestead-hill.com/extend/unit-1, https://homestead-hill.com/extend/unit-10, https://homestead-hill.com/extend/unit-11 (+23 more)

### Community 3 - "Community 3"
Cohesion: 0.44
Nodes (8): ContractorOfficeLaundry(), contractorSupplied, exclusions, InfoCard(), ownerProvided, pricingNotes, ProductLink(), scopeSections

### Community 4 - "Community 4"
Cohesion: 0.06
Nodes (29): useIsMobile(), Separator, Sidebar, SidebarContent, SidebarContext, SidebarFooter, SidebarGroup, SidebarGroupAction (+21 more)

### Community 5 - "Community 5"
Cohesion: 0.08
Nodes (15): NavLink, NavLinkCompatProps, Avatar, AvatarFallback, AvatarImage, Checkbox, HoverCardContent, InputOTP (+7 more)

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
Cohesion: 0.15
Nodes (17): PullToRefresh(), PullToRefreshProps, cn(), ButtonProps, buttonVariants, Calendar(), CalendarProps, Pagination() (+9 more)

### Community 11 - "Community 11"
Cohesion: 0.15
Nodes (18): adminTitles, titles, MaintenanceTutorial(), OnboardingTutorial(), OnboardingTutorialProps, steps, TutorialDialog(), TutorialDialogProps (+10 more)

### Community 12 - "Community 12"
Cohesion: 0.22
Nodes (8): code:text (Hermes, run the Homestead Hill full-system test for the unit), Command Name, Copy/Paste Goal Command, Current Known System Boundaries, Default Test Data Pattern, Homestead Hill Full-System Test Goal Command, Required Approval Gates, Unit Rollout Mode

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
Cohesion: 0.08
Nodes (51): BulkDeletePaymentsDialog(), BulkDeletePaymentsDialogProps, formatCurrency(), PaymentEvent, Dashboard(), DashboardProps, GuestDialogMode, parseEstimatedTotal() (+43 more)

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
Cohesion: 0.2
Nodes (8): 1. Maintenance Webhook Health deployment lag — resolved, 2. Lint gate is red, 3. Existing automation rows remain in production data, Automated checks, Bugs / blockers found, Cleanup status, Homestead Hill / Host Hub Operational Path QA — 2026-05-24, Live UI path matrix

### Community 29 - "Community 29"
Cohesion: 0.22
Nodes (8): SheetContent, SheetContentProps, SheetDescription, SheetFooter(), SheetHeader(), SheetOverlay, SheetTitle, sheetVariants

### Community 30 - "Community 30"
Cohesion: 0.25
Nodes (7): NavigationMenu, NavigationMenuContent, NavigationMenuIndicator, NavigationMenuList, NavigationMenuTrigger, navigationMenuTriggerStyle, NavigationMenuViewport

### Community 31 - "Community 31"
Cohesion: 0.27
Nodes (8): buildMaintenanceQaPayload(), getSyntheticRequestFilter(), MAINTENANCE_QA_MARKER, MaintenanceQaPayload, MaintenanceQaResult, summarizeMaintenanceQaResult(), payload, summary

### Community 32 - "Community 32"
Cohesion: 0.05
Nodes (51): actionBacklog, AirbnbMarketAvailabilitySnapshotRow, AirbnbMarketBriefing, AirbnbMarketListingRow, AirbnbMarketPriceSnapshotRow, AirbnbMarketWeeklyBriefingRow, AmenityKey, amenityKeys (+43 more)

### Community 33 - "Community 33"
Cohesion: 0.06
Nodes (45): LogMaintenanceDialog(), formatRelative(), MaintenanceRequestCard(), MaintenanceRequestCardProps, photoCount(), MobileBottomNav(), MobileBottomNavProps, NavViewMode (+37 more)

### Community 34 - "Community 34"
Cohesion: 0.06
Nodes (34): brand, accentColor, domain, paperColor, primaryColor, property, guestFlyer, cards (+26 more)

### Community 49 - "Community 49"
Cohesion: 0.13
Nodes (20): ADMIN_EMAILS, allowed, authHeader, Body, completionPhotos, corsHeaders, esc(), Event (+12 more)

### Community 50 - "Community 50"
Cohesion: 0.09
Nodes (37): ManagementDashboard(), ManagementFee, RevenueTarget, PaymentHistoryContent(), SortDir, SortField, WeeklyReport(), DbGuest (+29 more)

### Community 51 - "Community 51"
Cohesion: 0.25
Nodes (5): Action, body, buildPayload(), corsHeaders, runTest()

### Community 52 - "Community 52"
Cohesion: 0.25
Nodes (7): Breadcrumb, BreadcrumbEllipsis(), BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator()

### Community 53 - "Community 53"
Cohesion: 0.33
Nodes (5): ToggleGroup, ToggleGroupContext, ToggleGroupItem, Toggle, toggleVariants

### Community 54 - "Community 54"
Cohesion: 0.4
Nodes (4): appSource, maintenanceSource, pagePath, pageSource

### Community 56 - "Community 56"
Cohesion: 0.4
Nodes (4): functionSource, migration, migrationPath, migrationsDir

### Community 59 - "Community 59"
Cohesion: 0.2
Nodes (9): Approval decisions before print/commit, code:bash (python3 scripts/generate-guest-qr-sheet.py), Generation commands, Guest / welcome basket flyer, Hannah / cleaner staff QR sheet, Homestead Hill QR Source of Truth, Per-unit maintenance QR cards, Purpose (+1 more)

### Community 63 - "Community 63"
Cohesion: 0.1
Nodes (32): CalendarSyncHealth(), amountClass(), DashboardData, HomesteadHillPLContent(), money(), TransactionCard(), Txn, unitSort() (+24 more)

### Community 64 - "Community 64"
Cohesion: 0.25
Nodes (7): Brand Tokens, Copy Rules, Design Read, Homestead Hill Print Design System, Layout Rules, Preflight Checklist, Typography

### Community 65 - "Community 65"
Cohesion: 0.31
Nodes (12): centered_text(), check_url(), decode_qrs(), draw_house_mark(), font(), main(), make_qr(), make_sheet() (+4 more)

### Community 66 - "Community 66"
Cohesion: 0.06
Nodes (30): decode_failures, url_failures, url_results, https://form.jotform.com/261687221033149, https://homestead-hill.com/extend/unit-1, https://homestead-hill.com/extend/unit-10, https://homestead-hill.com/extend/unit-11, https://homestead-hill.com/extend/unit-13 (+22 more)

### Community 67 - "Community 67"
Cohesion: 0.07
Nodes (29): decode_failures, url_results, https://form.jotform.com/261687221033149, https://homestead-hill.com/extend/unit-1, https://homestead-hill.com/extend/unit-10, https://homestead-hill.com/extend/unit-11, https://homestead-hill.com/extend/unit-13, https://homestead-hill.com/extend/unit-14 (+21 more)

### Community 68 - "Community 68"
Cohesion: 0.18
Nodes (7): ChartConfig, ChartContainer, ChartContext, ChartContextProps, ChartLegendContent, ChartTooltipContent, THEMES

### Community 69 - "Community 69"
Cohesion: 0.21
Nodes (21): add_shadow(), build_cards(), card_icon(), center(), cover_crop(), draw_icon(), draw_logo(), draw_sheet() (+13 more)

### Community 72 - "Community 72"
Cohesion: 0.07
Nodes (29): decode_failures, url_results, https://form.jotform.com/261687221033149, https://homestead-hill.com/extend/unit-1, https://homestead-hill.com/extend/unit-10, https://homestead-hill.com/extend/unit-11, https://homestead-hill.com/extend/unit-13, https://homestead-hill.com/extend/unit-14 (+21 more)

### Community 73 - "Community 73"
Cohesion: 0.07
Nodes (29): decode_failures, url_results, https://form.jotform.com/261687221033149, https://homestead-hill.com/extend/unit-1, https://homestead-hill.com/extend/unit-10, https://homestead-hill.com/extend/unit-11, https://homestead-hill.com/extend/unit-13, https://homestead-hill.com/extend/unit-14 (+21 more)

### Community 74 - "Community 74"
Cohesion: 0.07
Nodes (28): url_results, https://form.jotform.com/261687221033149, https://homestead-hill.com/contact?unit=10, https://homestead-hill.com/contact?unit=7, https://homestead-hill.com/contact?unit=8, https://homestead-hill.com/contact?unit=9, https://homestead-hill.com/extend/unit-1, https://homestead-hill.com/extend/unit-11 (+20 more)

### Community 75 - "Community 75"
Cohesion: 0.15
Nodes (12): files, folder_id, folder_meta, display_url, id, link_label, mimeType, name (+4 more)

### Community 77 - "Community 77"
Cohesion: 0.15
Nodes (12): decode_failures, decoded_qr_count, out, pdf_count, png_count, unique_urls_checked, unit_count, units (+4 more)

### Community 78 - "Community 78"
Cohesion: 0.5
Nodes (8): check_url(), count_page_qrs(), decode_qrs(), fix_sheet(), main(), make_qr(), unit_slug(), urls_for()

### Community 79 - "Community 79"
Cohesion: 0.54
Nodes (7): check_url(), decode_qrs(), main(), make_qr(), overlay_qrs(), unit_slug(), urls_for()

### Community 80 - "Community 80"
Cohesion: 0.54
Nodes (7): check_url(), decode_qrs(), main(), make_qr(), make_sheet(), unit_slug(), urls_for()

### Community 81 - "Community 81"
Cohesion: 0.4
Nodes (8): centered_text(), check_url(), decode_qrs(), main(), make_qr(), repaint_and_place(), unit_slug(), urls_for()

### Community 82 - "Community 82"
Cohesion: 0.25
Nodes (6): DrawerContent, DrawerDescription, DrawerFooter(), DrawerHeader(), DrawerOverlay, DrawerTitle

### Community 83 - "Community 83"
Cohesion: 0.33
Nodes (5): folder_id, folder_link, folder_name, uploaded, uploaded_count

### Community 88 - "Community 88"
Cohesion: 0.25
Nodes (7): cleaning, extend, maintenance, notes, qr_region_decode_failures, qr_region_results, homestead-hill-unit-4-image-model-text-final-small-qr-extend-fix-sheet.png

### Community 89 - "Community 89"
Cohesion: 0.25
Nodes (8): scripts, build, build:dev, dev, lint, preview, test, test:watch

### Community 90 - "Community 90"
Cohesion: 0.4
Nodes (4): folder_id, folder_url, uploaded, uploaded_count

### Community 91 - "Community 91"
Cohesion: 0.4
Nodes (4): folder_id, folder_url, uploaded, uploaded_count

### Community 92 - "Community 92"
Cohesion: 0.4
Nodes (4): name, private, type, version

### Community 93 - "Community 93"
Cohesion: 0.4
Nodes (4): Alert, AlertDescription, AlertTitle, alertVariants

### Community 94 - "Community 94"
Cohesion: 0.5
Nodes (3): AccordionContent, AccordionItem, AccordionTrigger

### Community 95 - "Community 95"
Cohesion: 0.5
Nodes (4): cleaning, extend, maintenance, homestead-hill-unit-10-image-model-text-final-small-qr-extend-fix-sheet.png

### Community 96 - "Community 96"
Cohesion: 0.5
Nodes (4): cleaning, extend, maintenance, homestead-hill-unit-11-image-model-text-final-small-qr-extend-fix-sheet.png

### Community 97 - "Community 97"
Cohesion: 0.5
Nodes (4): cleaning, extend, maintenance, homestead-hill-unit-13-image-model-text-final-small-qr-extend-fix-sheet.png

### Community 98 - "Community 98"
Cohesion: 0.5
Nodes (4): cleaning, extend, maintenance, homestead-hill-unit-14-image-model-text-final-small-qr-extend-fix-sheet.png

### Community 99 - "Community 99"
Cohesion: 0.5
Nodes (4): cleaning, extend, maintenance, homestead-hill-unit-1-image-model-text-final-small-qr-extend-fix-sheet.png

### Community 100 - "Community 100"
Cohesion: 0.5
Nodes (4): cleaning, extend, maintenance, homestead-hill-unit-2-image-model-text-final-small-qr-extend-fix-sheet.png

### Community 101 - "Community 101"
Cohesion: 0.5
Nodes (4): cleaning, extend, maintenance, homestead-hill-unit-3-image-model-text-final-small-qr-extend-fix-sheet.png

### Community 102 - "Community 102"
Cohesion: 0.5
Nodes (4): cleaning, extend, maintenance, homestead-hill-unit-5-image-model-text-final-small-qr-extend-fix-sheet.png

### Community 103 - "Community 103"
Cohesion: 0.5
Nodes (4): cleaning, extend, maintenance, homestead-hill-unit-6-image-model-text-final-small-qr-extend-fix-sheet.png

### Community 104 - "Community 104"
Cohesion: 0.5
Nodes (4): cleaning, extend, maintenance, homestead-hill-unit-7-image-model-text-final-small-qr-extend-fix-sheet.png

### Community 105 - "Community 105"
Cohesion: 0.5
Nodes (4): cleaning, extend, maintenance, homestead-hill-unit-8-image-model-text-final-small-qr-extend-fix-sheet.png

### Community 106 - "Community 106"
Cohesion: 0.5
Nodes (4): cleaning, extend, maintenance, homestead-hill-unit-9-image-model-text-final-small-qr-extend-fix-sheet.png

## Knowledge Gaps
- **777 isolated node(s):** `allowJs`, `noImplicitAny`, `noUnusedLocals`, `noUnusedParameters`, `@/*` (+772 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **10 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `Community 10` to `Community 0`, `Community 1`, `Community 4`, `Community 5`, `Community 7`, `Community 16`, `Community 18`, `Community 20`, `Community 21`, `Community 23`, `Community 25`, `Community 29`, `Community 30`, `Community 32`, `Community 33`, `Community 50`, `Community 52`, `Community 53`, `Community 63`, `Community 68`, `Community 82`, `Community 93`, `Community 94`?**
  _High betweenness centrality (0.101) - this node is a cross-community bridge._
- **Why does `dependencies` connect `Community 1` to `Community 92`?**
  _High betweenness centrality (0.056) - this node is a cross-community bridge._
- **Why does `clsx` connect `Community 1` to `Community 10`?**
  _High betweenness centrality (0.054) - this node is a cross-community bridge._
- **What connects `allowJs`, `noImplicitAny`, `noUnusedLocals` to the rest of the system?**
  _777 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.04 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.06 - nodes in this community are weakly interconnected._