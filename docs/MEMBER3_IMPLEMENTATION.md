# Member 3 implementation

## Final review — current handoff (11 October 2026)

This section is the current source of truth. The implementation notes below retain the history of each stage; earlier scaffold-only descriptions and test counts do not describe the final implementation.

### Styling and settings correction after browser feedback

The original broad Turbopack `*.css` Tailwind loader rule rewrote CSS Modules as global CSS. Production HTML omitted module class names while loaded stylesheets contained plain `.shell`, `.grid`, etc.; this explains the unstyled screens despite successful compilation. `next.config.ts` now runs the Tailwind loader only on `globals.css`, preserving native Next CSS Module exports for every feature stylesheet. No UI theme or additional dependency was introduced.

The previous review missed this runtime stylesheet/class mapping failure. Verification now fetches production HTML and linked stylesheets and confirms matching scoped layout class names on registration, inventory, bookings, calendar and analytics. Build, lint, standalone TypeScript and all 45 service tests pass after the correction. Visual browser QA is still pending.

`/boutique/settings` previously had no implementation or link in Member 3 navigation. It now redirects (307) to `/boutique/pending`, the implemented application-status screen. This is a compatibility alias, not an editable settings module. Boutique profile editing still needs Member 2's shared contract. The production redirect was verified.

After pulling in this configuration change locally, stop and restart the dev server with `npm.cmd run dev`, then hard-refresh the browser (Ctrl+Shift+R). A successful build alone is insufficient styling verification; confirm the scoped module classes and rendered layouts in browser developer tools.

### Completed functionality and integration status

| Area | Implemented functionality | Current data / integration |
| --- | --- | --- |
| Registration and status | Validated responsive registration, field/server errors, submission loading/success, pending screen, approved/rejected examples and feedback | Isolated in-memory application adapter; submission always creates PENDING; no actual approval workflow |
| Dashboard | Seven metrics, recent bookings, pickups/returns, filters, query-driven snapshot detail views, empty preview, refresh and CSV summary | Frozen fictional snapshot, independent of mutable demo inventory/bookings |
| Inventory | Search/category/status filters, create/edit, preview, version checks, archive/unarchive, quantities, INR rental/deposit fields, loading/error/empty screens | Mutable in-memory typed product service; no permanent delete (archive is the supported removal workflow) |
| Product images | Multiple previews, MIME/size/count checks, transfer progress boundary, retry/remove/reorder, cover order and descriptions | Local file reading in demo; signed Cloudinary transport and backend authorization/finalization interfaces implemented, not connected |
| Bookings and calendar | List/search/status filters, scoped details, charges/deposits, upcoming handovers, month navigation, rental ranges, pickup/return indicators, detail links | Shared in-memory booking adapter; calendar is a display, never an availability engine |
| Rental lifecycle | Confirmation dialogs, confirm/reject/cancel, pickup, return, GOOD/MINOR_DAMAGE/MAJOR_DAMAGE inspections, notes, completion, manual refund metadata | Versioned demo transitions only; no payment/refund transfers or PostgreSQL persistence |
| Analytics | Completed-only revenue, booking/status counts, monthly trend/data table, popular products, categories, conditional utilization, loading/error/empty states | Separate fictional reporting fixture; tested calculations; utilization unavailable without complete historical evidence |
| AI styling | Typed POST endpoint, strict input/output schemas, Gemini style tags, deterministic fallback, inventory filtering and combined-look budget enforcement | Server-only transport implemented; real inventory/availability adapter deliberately unavailable; no production demo recommendations |
| Navigation/layout | Reusable desktop sidebar, responsive top bar/mobile menu, skip links, overflow regions, Base UI dialogs and scoped ivory/plum styles | Source-reviewed; browser interaction and visual viewport QA still required |

**Real API integrations:** no shared business API, authenticated session, Prisma/database, live Cloudinary authorization/finalization, or real availability integration is connected. `/api/recommendations` is a real local HTTP handler, but valid dated requests deliberately return 503/INVENTORY_UNAVAILABLE with zero products. Gemini's REST transport is implemented behind private server configuration and a typed inventory adapter; no live Google request was made during verification. No failed live service silently becomes a demo success.

**Demo boundaries:** all boutique screens visibly disclose demo mode; memory mutations reset on full browser refresh. Navigating among product screens preserves product changes, and navigating among booking/detail/calendar screens preserves booking changes during that session. Onboarding, inventory, bookings, the frozen dashboard snapshot and analytics are separate datasets. Their totals are not expected to synchronize. Approval examples never authorize anything. Direct visits to demo management routes show fictional data; they are not authenticated production pages.

### Review fixes

- Dashboard reporting now reuses all seven booking statuses and labels from the existing Member 3 booking contract, including PICKED_UP rather than the obsolete ACTIVE alias. Demo return scheduling uses the same definition.
- Dashboard disclosure explicitly states that its snapshot does not reflect mutable demo edits. The status screen no longer renders a dead disabled management action; a genuine live APPROVED response can present a dashboard link, while demo approval examples cannot.
- Product form save logic rejects submission while image tasks are pending, including form submissions that bypass the disabled save button. Signed uploads reject cancellation before authorization and after transport/finalization, so a cancelled operation cannot become a saved draft asset.
- Recommendation inventory responses are runtime validated before preference generation. Malformed shared DTOs fail closed with the same INVENTORY_UNAVAILABLE response, and no Gemini call or fabricated product result.

### Required environment variables

Demo boutique screens and the blocked recommendation endpoint run without credentials. Copy the blank `.env.example` to `.env.local` only when configuring local integrations.

| Variables | Purpose / owner |
| --- | --- |
| DATABASE_URL, AUTH_SECRET | Member 2's shared PostgreSQL/auth integration; currently unused by Member 3 adapters |
| CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET, CLOUDINARY_SIGNED_UPLOAD_PRESET | Authorized backend signing/finalization and restricted image upload preset; credentials alone do not enable live uploads |
| GEMINI_API_KEY, GEMINI_MODEL | Server-only Gemini key and account-supported structured-output model ID; missing configuration selects rules once actual inventory is connected |

Never prefix private variables with NEXT_PUBLIC_. The template contains no secret values. Existing `.gitignore` ignores all `.env*` files, including `.env.example`; the template therefore needs explicit review/tracking as part of the user's eventual manual submission. No ignore rule was changed and no real environment file should be published.

### Required Member 1 / Member 2 integration and remaining blockers

Member 1 must connect admin boutique approval/rejection and agree onboarding/catalog category mappings. Member 1 also owns customer marketplace placement for occasion styling; `/boutique/recommendations` remains a README-only placeholder with no results page or navigation link.

Member 2 must supply authenticated approved-boutique sessions and enforce ownership/RBAC on every management read/write and upload operation, including direct route requests. Wire real onboarding/product/booking providers only after shared contracts are agreed. Keep canonical booking statuses/capabilities, atomic transitions, expected-version conflicts, audit records, customer visibility, rental boundaries/timezone, real stock availability and payment semantics on the backend. The exact shared endpoint paths remain proposals in the module contracts below; the recommendation POST path is implemented.

Cloudinary needs authenticated ownership-aware upload authorization, restricted signed preset, trusted asset finalization, public-ID ownership verification and draft/orphan/deletion lifecycle. Client MIME/size validation is UX validation; backend validation must verify actual content and configured limits. No insecure signature/upload API was introduced.

Analytics needs a complete consistent scoped reporting snapshot or agreed authoritative aggregates, trusted statuses/prices and historical utilization evidence. Recommendations need a real public approved inventory search plus full-period price quotes and fresh server-verified availability. Configure endpoint authentication policy where appropriate and backend rate/abuse limits before enabling live AI requests. Recommendations never reserve stock; checkout must revalidate the combined look.

There are no shared auth or Prisma models to integrate today. Real approval, persistent CRUD, upload authorization, lifecycle permission tests, actual conflict/availability decisions, payment settlement and live Gemini behavior remain blocked. No authentication, Prisma schema, payment system, booking engine, marketplace or admin implementation was duplicated or modified.

### How to run and repeat checks (PowerShell)

From `D:\Rentique\rentique`, install the lockfile dependencies if needed with `npm.cmd ci`. Run `npm.cmd run dev`, then open `http://localhost:3000/boutique/register` or `/boutique/dashboard`. Management navigation opens products, bookings, calendar and analytics. Registration goes to pending; a full browser refresh clears the demo application.

For production, run `npm.cmd run build` then `npm.cmd run start` and open the same routes. Missing product/booking IDs return a client-rendered unavailable state inside a successful page shell, rather than asserting existence or authorization through HTTP status alone. `/boutique`, `/boutique/onboarding`, `/boutique/inventory` and `/boutique/recommendations` are documentation placeholders, not active routes.

```powershell
npm.cmd run lint
npm.cmd run build
& .\node_modules\.bin\tsc.cmd --noEmit
$testFiles = @(Get-ChildItem tests -Filter '*.test.ts' | ForEach-Object { $_.FullName })
& .\node_modules\.bin\tsc.cmd @testFiles --outDir .next/member3-tests --module commonjs --target ES2022 --esModuleInterop --skipLibCheck --strict
if ($LASTEXITCODE -eq 0) { node --test .next/member3-tests/tests/*.test.js }
```

Run the standalone typecheck after the build, because Next regenerates route types during builds. Compiled test artifacts stay in ignored `.next/member3-tests`. For a live HTTP request example, use the JSON request in the occasion styling section below. The current expected result with dates is 503/INVENTORY_UNAVAILABLE; missing dates gives 200/DATES_REQUIRED; malformed/invalid input gives 400. AI success and failure selection are exercised through injected service tests until the shared inventory adapter is connected.

### Final verification results and limits

- TypeScript (`tsc --noEmit`): passed. Lint: passed without warnings. Production build: passed with all implemented screen routes and the dynamic recommendation handler. No broken imports were reported.
- All **45 tests passed** across onboarding, dashboard, products, image transport, bookings/calendar dates, lifecycle, analytics, recommendation budgets/filtering and fallback. Added malformed inventory coverage and extended status/cancellation regression assertions during review.
- Production HTTP smoke checks passed for **14 URLs**, including registration/status, dashboard query views, product list/new/existing/missing edit shells, booking list/existing/missing detail shells, calendar and analytics. Suspense dashboard shells defer their demo disclosure/data to client rendering; HTTP checks do not assert hydration behavior.
- Recommendation production HTTP checks passed: dated blocked requests 503 with zero products, undated 200/DATES_REQUIRED, invalid/malformed 400, unsupported media 415, oversized body 413 and unsupported GET 405.
- Source security review found private environment access only in the server-only recommendation entry; no dangerous HTML/eval or browser-storage persistence was found in Member 3 code. Scan of 66 source files found no hardcoded-secret pattern matches; 28 built browser bundles contained no GEMINI_API_KEY or CLOUDINARY_API_SECRET references. `.env.example` has blank values. These are targeted checks, not proof of live backend security.
- `npm.cmd audit --omit=dev --json` could not reach npm's advisory endpoint in this environment. Dependency vulnerability status remains unverified; rerun it with registry access before release.
- Browser tooling reports no connected browser. Responsive visual checks, hydration/console inspection, keyboard dialog behavior, file-picker interaction, every UI click and simulated UI failure recovery require the manual checklist below. Service tests and successful HTTP shells do not replace them.
- No commit, push, merge, rebase, branch switch or database mutation was performed. Work remains on `feature/boutique-ai` for the user's review.

### Manual browser checklist

1. At desktop, tablet and 375px mobile widths, check form wrapping, readable metrics, scrolling tables/calendar, sidebar/mobile menu, active links, Escape, keyboard focus and skip links. Check the browser console for hydration or runtime errors.
2. Register with sample details; test missing categories, bad phone/email/postal/social link, valid submission, loading lock and success routing. On pending, check update, approval/rejection examples and feedback. Refresh to confirm demo reset and no granted live access.
3. On dashboard, open each metric, recent booking, schedule, quick action and sidebar link. Download CSV and check the demo label/INR totals. Toggle empty preview, restore it and refresh. Verify the frozen snapshot disclosure.
4. On inventory, search/filter/clear, create a product, preview, edit, archive/unarchive and test zero stock, INR decimals and required-field errors. Cancel a draft and try a missing edit ID. Confirm changes survive client navigation and reset on full refresh.
5. Select multiple JPG/PNG/WebP files; check previews/progress, cover order, descriptions, reorder and remove. Reject SVG, empty/oversized files and more than six images. Saving/preview must stay disabled with pending/failed tasks. Retry/remove failures with an injected failing upload adapter; cancellation must not append an asset. Demo must say no Cloudinary upload occurs.
6. In bookings, search/filter/clear, open details, inspect dates/products/rental/deposit, upcoming handovers and missing-ID states. Cancel a confirmation dialog and confirm no state change.
7. Run RQ-108 through CONFIRMED → PICKED_UP → RETURNED → inspection → COMPLETED. Test GOOD and both damage conditions/required notes, rejection/cancellation reasons on another pending record, manual refund notes/status and no actual transfers. Check allowed actions, success feedback and calendar propagation after refresh/navigation.
8. In calendar, check next/previous, month picker, sample month, refresh, empty months, multi-day ranges and pickup/return indicators. Open an event and verify its detail route. Ensure pending ranges are tentative and the calendar makes no availability promise.
9. In analytics, inspect responsive charts and the expandable monthly table, popularity/categories, pending/cancelled counts and unavailable utilization. The fixture should show 9 bookings, 3 completed and INR16,500 completed rental charges. Refresh must preserve the fixture; demo booking edits must not silently alter this snapshot.
10. In browser developer tools or an HTTP client, POST the documented recommendation input. Expect no invented products and 503 until integration; test invalid input, missing dates and no-store responses. After shared integration, test AI success, missing key, invalid response, API failure and timeout with controllable adapters; all returned real products/combined looks must meet filters and budget.
11. With injected failing or empty services, test loading, retries, preserved drafts after version conflicts, empty lists and invalid report errors. Live errors must never switch to demo success. Default fixtures do not expose every failure state without injection.
12. After Member 1/2 integration, repeat authorization tests using pending/rejected/foreign boutique users and direct URLs/API calls; verify server denials, real persistence, upload ownership, availability conflicts, live credentials/model and endpoint limits. Current demos cannot establish these guarantees.

## Initial repository inspection (before onboarding implementation)

- Repository: `rentique`; inspected branch: `feature/boutique-ai`. Initial working tree was clean.
- Installed and declared Next.js version: `16.4.0`, with React `19.3.0`, strict TypeScript, Tailwind CSS v4, and App Router under `src/app`. The `@/*` alias targets `src/*`.
- `next.config.ts` enables cache components, partial prefetching, and the Tailwind Turbopack loader. Existing configuration is unchanged.
- The only application page is the Next.js starter at `/`. The root layout uses `next/font/google` for Geist and Geist Mono. There are no application API handlers, auth/session implementation, access guards, or business-domain implementations.
- Existing feature directories for `auth`, `bookings`, `boutiques`, `marketplace`, `analytics`, and `recommendations` contained only `.gitkeep` files. Reuse them; the shared layout/components/types and tests folders also contained placeholders.
- UI setup is shadcn `base-nova`, RSC/TSX, Base UI `@base-ui/react`, Lucide icons, and CSS theme tokens. The sole existing UI component is `src/components/ui/button.tsx`, using `ButtonPrimitive.Props` and `cva`. `src/lib/utils.ts` exports `cn` from the `cn` package.
- Other installed dependencies include Zod and `tw-animate-css`. Prisma/client, PostgreSQL drivers, Cloudinary SDK, Gemini SDK, authentication libraries, calendar libraries, and chart libraries are not installed. No Prisma schema or migrations exist.
- `.env.example` lists blank database, auth, Cloudinary, and Gemini variables. It is ignored by the existing `.env*` rule and is not tracked. Neither environment configuration nor ignore rules were changed.
- Available scripts are `dev`, `build`, `start`, and `lint`; there is no dedicated typecheck or test script. Installed Next.js project-structure and CLI guidance was inspected as required by `AGENTS.md`.

## Ownership and scope

Member 3 owns boutique management, onboarding, inventory, booking management UI, rental calendar UI, boutique analytics, and AI recommendations. Member 2 owns authentication, Prisma schema, booking APIs, and role-based access control. Member 1 owns the customer marketplace and admin UI, including coordination of boutique approvals and customer-facing recommendation placement.

The initial change created documentation-backed folders. Boutique onboarding, dashboard reporting, and product inventory UI are now implemented with typed service interfaces and isolated demo adapters. Onboarding and inventory use React Hook Form, Zod and existing Base UI components; dashboard and inventory add no dependencies. Shared authentication, Prisma models, booking systems, marketplace, global styles, and admin UI remain untouched.

## Folder structure and modules

```text
src/app/boutique/                 # Future management overview/profile route
  register/                      # Implemented registration screen
  pending/                       # Implemented status screen
  dashboard/                     # Implemented read-only management preview
  products/                      # Implemented listing, new, and [id]/edit routes
  onboarding/                    # Future onboarding route
  inventory/                     # Future inventory route
  bookings/                      # Future booking management route
  calendar/                      # Future rental calendar route
  analytics/                     # Future reporting route
  recommendations/               # Future AI results route
src/features/boutiques/           # Management overview/profile module
  dashboard/                     # Sidebar, top navigation, overview and snapshot views
  onboarding/                    # Onboarding forms and submission UI
  inventory/                     # Catalog, stock, pricing, and image UI
  booking-management/            # UI consuming Member 2's booking APIs
  rental-calendar/               # UI consuming authoritative availability
  adapters/mock/                 # Shared boutique mock adapters and fixtures
src/features/analytics/           # Boutique metric presentation and filters
  adapters/mock/                 # Analytics mock adapters and fixtures
src/features/recommendations/     # Recommendation results and explanations
  adapters/mock/                 # Recommendation mock adapters and fixtures
docs/MEMBER3_IMPLEMENTATION.md
```

`register`, `pending`, `dashboard`, `products`, `products/new`, `products/[id]/edit`, `bookings`, `bookings/[id]`, and `calendar` contain implemented pages. Other route folders retain README placeholders. The dashboard's older query-driven snapshot views remain read-only reporting samples; sidebar navigation opens the product, booking and monthly calendar routes.

Keep future route files thin, feature-specific components within their modules, and reusable primitives in the existing `src/components/ui`. Follow Base UI composition and prop conventions, the `@/` aliases, and existing Tailwind theme tokens; do not add a second UI system.

## Required API contracts (proposals, not existing APIs)

The operations below describe integration needs, not implemented functions or agreed endpoint URLs. Request/response DTOs must be agreed with the owning member before code or real adapters are added. Member 3's UI must not define Prisma models to satisfy these contracts.

| Module | Required operations and request data | Required response data | Coordination |
| --- | --- | --- | --- |
| Shared session/access | Resolve current user and accessible boutiques through the existing auth system when Member 2 supplies it | Stable user ID, roles/permissions, boutique IDs, allowed capabilities, session expiry/auth errors | Member 2; server enforces access on every operation |
| Boutique management | Read/update a boutique profile by boutique ID with validated profile fields and version | ID, name, description, contact/address, timezone, images, onboarding/approval state, allowed actions, updated version | Member 3 UI; Member 2 schema/access; backend ownership to confirm |
| Onboarding | Read/save draft and submit agreed business/contact/address fields and uploaded image references | Draft ID, validation issues by field, submission state, timestamps, permitted next action | Members 1 and 2 must agree approval flow and required fields |
| Inventory | Paginated list/filter; read/create/update/archive garment and stock records scoped to boutique | Stable item/stock IDs, category, sizes, quantity, active state, rental pricing/deposit/currency, image references, version and validation errors | Member 2 schema/access; catalog compatibility with Member 1; backend ownership to confirm |
| Media uploads | Request an authorized upload signature or server upload using file metadata; associate/remove an authorized asset | Cloudinary public ID, secure URL, dimensions, upload expiry, limits and errors | Server-side Cloudinary integration owner to confirm; never browser secrets |
| Booking management UI | List/filter/read boutique bookings; invoke only transitions permitted by the booking API, with booking ID and expected version | Booking/item IDs, permitted customer summary, rental interval, quantity, amounts/currency, canonical status, allowed actions, version | Member 2 exclusively owns APIs, transitions, conflicts, and payment/refund behavior |
| Rental calendar | Read boutique/item availability for a bounded interval and timezone | Rental/hold/block intervals, item IDs, available quantities, authoritative conflicts, statuses and permitted actions | Member 2 booking APIs; manual availability blocks only if explicitly supported |
| Analytics | Read aggregates scoped to boutique and date range, timezone and grouping | Defined revenue/booking/utilization metrics, series buckets, currency, applied filters, generation timestamp and data coverage | Metric definitions, aggregation endpoint ownership, and source data need agreement |
| AI recommendations | Request recommendations using agreed audience/context, eligible catalog IDs, constraints, and limit; optional feedback with result ID | Eligible item IDs, rank, explanation, source (`mock` or agreed live source), generation timestamp, fallback/empty status | Member 3 recommendation logic; Member 1 placement; Member 2 catalog/access contract; server integration ownership to confirm |

Cross-cutting contract decisions still required:

- Final endpoint paths, HTTP methods or server-action interfaces, session mechanism, and permission names. Derive boutique access from Member 2's authenticated context; a client-provided boutique ID is not authorization.
- Stable IDs, pagination/filter/sort format, canonical booking/onboarding statuses, and allowed transitions. Booking UI displays server-provided capabilities rather than duplicating business rules.
- Money units and currency, inclusive/exclusive date boundaries, timezone conversion, quantity/variant semantics, hold expiry, and cancellation/refund treatment.
- Validation and error shape (for example, code/message/field errors/request ID), unauthorized/forbidden/not-found/conflict behavior, mutation versioning or idempotency, and cache invalidation.
- Analytics formulas: gross versus net revenue, deposits, refunds, cancellations, utilization denominator, period boundaries, missing data, and multi-currency handling. Do not sum different currencies.
- Recommendation audience and goal, consent/data minimization, eligible catalog/availability source, Gemini model/output schema, timeout/rate limits, and a disclosed non-AI fallback policy.

## Mock adapter separation

`src/features/boutiques/adapters/mock/onboarding.ts` implements the onboarding demo service. The boutique layout selects it explicitly through `OnboardingProvider`. The analytics and recommendation mock boundaries remain placeholders. Agree additional module-local interfaces before extending them; keep fixture data outside UI components.

Future mock screens must visibly disclose mock data and non-persistent mutations. Keep mock fixtures out of components, Prisma, auth, and booking core modules. Mocks make no network calls and read no secrets. Add real adapters only once the matching APIs exist and contracts are approved; do not silently replace failed live requests with mock success.

## Current integration blockers

1. Member 2's auth/session contract and boutique permissions are absent. Protected boutique pages cannot be integrated yet; folder names provide no access control.
2. Prisma schema, migrations, database client, and agreed boutique/inventory/booking DTOs are absent. `DATABASE_URL` alone is not database integration.
3. Booking list/detail/transition and availability APIs are absent. Booking management and calendar must use labeled mocks when UI work starts.
4. Registration UI fields are specified and implemented, but persisted submission/read contracts, category taxonomy, duplicate policy, revision/resubmission rules, and Member 1's admin approval workflow still need agreement. No approval mutation or admin UI is implemented.
5. Inventory and Cloudinary upload/access contracts are absent; SDKs are not installed. Upload validation, asset ownership, and authorized signing must be specified.
6. Analytics definitions and authoritative aggregation contracts are absent. No chart dependency or reporting code has been introduced.
7. Recommendation audience, catalog eligibility, Gemini contract and server boundary are unagreed; SDK is not installed. The listed environment variable does not establish a working integration.
8. The existing root layout downloads Google fonts during builds, which may require network access in restricted environments. Build results are recorded below without changing unrelated font configuration.

## Initial scaffold verification

- `node_modules/.bin/next.cmd typegen`: passed; generated current route types before checking the root layout's `LayoutProps` helper.
- `node_modules/.bin/tsc.cmd --noEmit`: passed with no TypeScript errors.
- `npm.cmd run build`: passed with Turbopack, including compilation, TypeScript, and static page generation. The route table contains only `/` and the built-in `/_not-found`; the scaffold adds no active routes. Google font fetching did not block this build.
- PowerShell blocks the `npm.ps1` shim under the existing execution policy; the equivalent `npm.cmd` command succeeded without changing policy.
- No existing tracked files were modified. No commits, pushes, merges, or branch changes were performed.

## Completed onboarding screens

- `/boutique/register`: responsive three-section registration form with boutique name, description, contact email, phone, street address, city, state/region, postal code, categories, and optional website/social URL. Ivory surfaces, deep plum typography/actions, restrained gold accents, and boutique-scoped styles preserve other members' UI.
- `/boutique/pending`: application lookup/loading state, empty session state, retry/error state, pending confirmation, application summary and update check. Approved and rejected result presentations are implemented, including rejection feedback. Explicitly labeled demo examples allow reviewing all three statuses without changing the submitted application.
- React Hook Form uses `zodResolver` with the existing Zod v4. Base UI's native `Input` and the existing shadcn Base UI `Button` are reused; textarea and checkbox groups use native accessible controls. Labels, linked inline errors, focus styling, pending/disabled states, and alert/status regions are included. The resolver's [official integration documentation](https://github.com/react-hook-form/resolvers#zod) describes this setup; installed peer dependencies support React 19 and Zod v4.
- Validation trims text, requires a 20–1,000 character description, validates email, 10–15 phone digits, postal-code shape, at least one category from the current demo taxonomy, and an optional HTTP(S) social URL. These UI rules are provisional and must be repeated/confirmed server-side. Address validation supports international postal formats; it is not address verification.

## Defined onboarding service contract

`src/features/boutiques/onboarding/service.ts` defines `BoutiqueOnboardingService`:

```ts
readonly mode: "demo" | "live";
createApplication(input: BoutiqueRegistration): Promise<BoutiqueApplication & { status: "PENDING" }>;
getCurrentApplication(): Promise<BoutiqueApplication | null>;
```

`BoutiqueRegistration` is inferred from `schema.ts` and contains `name`, `description`, `contactEmail`, `phone`, `address`, `city`, `state`, `postalCode`, `categories`, and `socialLink` (empty string when omitted by the form). `BoutiqueApplication` contains `id`, `details`, `status` (`PENDING | APPROVED | REJECTED`), `submittedAt` (ISO timestamp), and optional `rejectionReason`. `OnboardingServiceError` supports a user-safe message and field errors keyed by registration field.

The demo validates inside the service as well as in the form and always creates `PENDING`. It rejects duplicate submissions in the same provider session and returns defensive copies. It uses only browser memory, no local/session storage, cookies, network requests, or database. Navigating between boutique screens using Next.js links preserves the provider; browser refresh, closing the tab, or leaving/remounting the boutique layout clears it. No application is actually sent for review, and no review email is sent.

Replace the demo by supplying a browser-callable real adapter to `OnboardingProvider` and setting `mode: "live"`. Do not pass a service object with methods across a Server Component serialization boundary: configure the real adapter inside the client provider or a client wrapper. Do not guess endpoints or silently fall back to demo after live failures. The real backend must bind both operations to Member 2's session, validate ownership, persist submissions, force initial `PENDING` regardless of client data, define duplicate/idempotency behavior, return validated DTOs, and translate errors into the defined service error shape. Credentials stay server-side. Status comes from the backend, not a URL parameter or preview selector.

## Onboarding management access boundary

No real management operations are exposed. Pending/rejected applications receive no management entry point from onboarding. Demo approval examples never enable management; the approved demo button stays disabled. The separately accessible dashboard is a read-only preview of a fictional boutique and does not use application approval to simulate access. `canPresentManagement` is a presentation helper that only returns true for live `APPROVED` applications; it is not authorization. A live approved application still sees a disabled integration placeholder until a protected management integration is available.

Before enabling live management data, Member 2 must enforce authenticated ownership and current approved status on the server for every management read/write, including direct URL/API requests. Approval/rejection mutations stay in Member 1's admin flow under Member 2's RBAC. No shared auth or Prisma model was changed to simulate this behavior.

## Onboarding verification

- `next.cmd typegen`, `tsc.cmd --noEmit`, `npm.cmd run lint`, and `npm.cmd run build`: passed. The production build includes `/boutique/register` and `/boutique/pending` alongside the existing root route.
- Four Node tests passed: validation/URL safety; pending creation/defensive copies/session reset; invalid/concurrent duplicate rejection; and management presentation gating across statuses and service modes.
- Test command: `node_modules/.bin/tsc.cmd tests/boutique-onboarding.test.ts --outDir .next/member3-tests --module commonjs --target ES2022 --esModuleInterop --skipLibCheck --strict`, followed by `node --test .next/member3-tests/tests/boutique-onboarding.test.js`. Compiled test output stays in ignored `.next`.
- Production HTTP smoke checks: both onboarding screens return 200 with expected content; `/boutique/inventory` remains 404.
- Visual/interactive browser verification could not run because the Browser runtime reports no connected browser. Responsive CSS and accessible markup are implemented, but viewport rendering and full browser form interaction remain unverified.
- No commits, pushes, merges, branch changes, auth modifications, or Prisma modifications were performed.

## Completed boutique dashboard

`/boutique/dashboard` implements the requested overview, reusable `BoutiqueSidebar`/`BoutiqueNavigation`, responsive `BoutiqueTopNavigation`, and a mobile navigation disclosure. Desktop and mobile share the same navigation definitions and highlight the selected view. The mobile menu closes when selecting a link and supports Escape. There are no dead links to unimplemented inventory or booking routes.

The root boutique layout now preserves only the existing onboarding provider; the extracted `OnboardingShell` keeps the registration/status screens' existing appearance. Dashboard styles are scoped to a separate CSS module, with restrained plum accents, ivory surfaces, clean tables, and no gradients. Global styles and shared UI primitives are unchanged.

Dashboard sections include active products, total bookings, pending requests, upcoming pickups/returns, completed rentals, completed rental revenue, recent bookings, and quick actions. Metric cards navigate to the relevant records. Recent booking references and schedule arrows open a read-only booking detail panel. The dashboard includes loading, retry, forbidden, empty-table, no-search-results, and missing-detail states. Tables support horizontal scrolling, labels/captions, keyboard-accessible links, and a skip-to-content link.

### Working actions and navigation

| Action | Destination or behavior |
| --- | --- |
| Overview | `/boutique/dashboard?view=overview` |
| Inventory / active products | `/boutique/products`; product search, category and stock/archive filters |
| Bookings / total bookings | Booking snapshot view with search and status filters |
| Pending requests | Booking view filtered to `PENDING`; read-only inspection |
| Completed rentals / revenue | Booking view filtered to `COMPLETED` |
| Rental schedule / upcoming cards | Schedule view with pickup/return sections and booking links |
| Booking reference / schedule arrow | Booking detail panel, with a working close-details link |
| Application status | Existing `/boutique/pending` screen |
| Refresh / Try again | Re-fetches the selected service and shows loading state |
| Export / Download summary | Downloads a CSV of the summary, including source, date, currency and minor-unit revenue; reports completion/failure |
| Preview empty boutique | Demo-only toggle that loads an empty snapshot with zero metrics and meaningful empty states |

All preview views remain on `/boutique/dashboard` using URL search parameters, so links can be bookmarked and browser history works. Unknown view/filter values fall back to overview/all records. Inventory search and booking search operate on loaded snapshot rows. They do not claim to search an entire backend catalog.

### Dashboard data service and demo definitions

`src/features/boutiques/dashboard/service.ts` defines `BoutiqueDashboardService` (`mode: "demo" | "live"`, `getSnapshot(): Promise<DashboardSnapshot>`). The snapshot contains boutique name, currency, timezone, reporting timestamp/window, authoritative summary totals, recent booking records, upcoming pickup/return records, and an inventory preview. The dashboard consumes summaries as supplied by the service; it does not calculate backend totals from partial rows.

`src/features/boutiques/adapters/mock/dashboard.ts` explicitly supplies the current demo service. It is isolated from onboarding, has no mutations, does not persist data, and makes no network/database calls. `BoutiqueDashboard` accepts a service instance for replacement from a client wrapper; do not serialize method-bearing adapters across a server/client boundary. The real adapter must validate the backend response and use approved contracts. Backend failures must never fall back to demo data. `DashboardServiceError("FORBIDDEN", ...)` renders an access-unavailable state with no snapshot; other failures render retry UI.

The fictional Silk Atelier snapshot is fixed to **11 October 2026, 00:00 Asia/Kolkata**; it does not imply current operational activity. Demo totals are 4 active products, 8 bookings, 2 pending requests, 2 upcoming pickups, 2 upcoming returns, 2 completed rentals, and **INR 8,000.00** completed rental revenue. The full demo inventory contains 5 products (one inactive). Its recent-booking sample contains all 8 fixture records; a real backend may supply fewer records than its summary totals.

- Active products count published fixture products; stock quantity does not guarantee rental availability.
- Total bookings includes all statuses, including cancelled bookings. Pending requests include only `PENDING` records.
- Schedule window is `[11 October, 18 October)` in Asia/Kolkata. Pickups require `CONFIRMED`; returns include `CONFIRMED` and `ACTIVE`. Pending/cancelled/completed records are excluded from upcoming events.
- Completed rental revenue sums the rental amounts of `COMPLETED` fixtures only, excluding deposits, cancelled/pending bookings, and future scheduled amounts. This demo measure is not a paid/net revenue claim; payment/refund/revenue definitions require backend agreement.
- Monetary fields are integers in the currency's minor units; display uses the ISO currency's standard exponent without rounding away fractional units. CSV explicitly labels revenue in minor units and neutralizes formula-like labels.

### Remaining dashboard integration blockers

Member 2 must supply session-scoped, approved-boutique access and authorize every dashboard read on the backend. No authentication, RBAC, Prisma schema, database queries, or booking lifecycle logic were added. The directly accessible demo route is safe only as a sample-data preview; it must not be treated as a protected live management route. Add server-side route/data access checks before enabling live data.

The team must agree the aggregate endpoint, summary/time-window definitions, currency handling, permitted customer fields, snapshot paging/limits, catalog/booking DTOs, approval/ownership errors, and refresh/cache policy. Booking decisions, inventory editing/uploads, real calendar availability, payments, and admin approvals remain outside this read-only dashboard task. Sidebar views and quick actions deliberately expose working inspection/export actions while these APIs are unavailable.

### Dashboard verification

- Final `tsc.cmd --noEmit`, `npm.cmd run lint`, and `npm.cmd run build` passed. The standalone TypeScript check was run after the build completed to avoid racing Next.js's generated type files. `git diff --check` passed.
- Nine tests passed: five dashboard tests cover consistent summary totals, schedule boundaries/status exclusions, defensive copies/empty snapshots, CSV labeling/escaping, and currency minor-unit formatting; four existing onboarding tests also passed.
- Production HTTP smoke checks returned 200 for the dashboard overview, inventory, pending-booking and schedule destinations, plus the existing registration and pending screens.
- Test command: `node_modules/.bin/tsc.cmd tests/boutique-dashboard.test.ts tests/boutique-onboarding.test.ts --outDir .next/member3-tests --module commonjs --target ES2022 --esModuleInterop --skipLibCheck --strict`, then `node --test .next/member3-tests/tests/boutique-dashboard.test.js .next/member3-tests/tests/boutique-onboarding.test.js`.
- The Browser runtime reports no connected browsers, so visual viewport inspection and full interactive click testing are unavailable. HTTP route checks and service tests do not replace that visual/interactive verification.
- No dependencies were added for this dashboard task. Shared authentication, Prisma, database and booking logic remain untouched. No commits, pushes, merges, or branch changes were performed.

## Completed product inventory UI

- `/boutique/products`: listing with product/reference/colour/occasion search, category filters, stock/archive filters, clear filters, refresh, previews, edit links, and archive/unarchive confirmation dialogs. Includes load/error/retry, no inventory, and no matching products states. Stock status distinguishes in-stock, out-of-stock, and archived records.
- `/boutique/products/new`: validated product creation, optional image selection, description editing, draft preview, save/loading/error feedback, cancel and back navigation.
- `/boutique/products/[id]/edit`: scoped product lookup, editable fields, image management, preview, save feedback, and unavailable-product state. Missing/foreign records are rejected by the service; the route itself returns a shell with a client-rendered unavailable state. Version conflicts retain draft edits and offer a working reload-latest-product action.
- The existing sidebar/mobile navigation, dashboard active-product card and browse-inventory action now open the products route. The product workspace reuses the sidebar/top navigation with independent inventory styling and the existing Base UI button/input components. Base UI dialogs provide preview and archive confirmation with focus handling and Escape dismissal.

Fields are name, description, category, occasion tags, colours, size, fabric/style, rental price, deposit, quantity, and images. React Hook Form uses the Zod resolver; `useWatch` subscribes to image updates without a React Compiler warning. Required field validation includes trimmed names, 20–2,000 character descriptions, category membership, at least one colour, size (including `S`/`M`), fabric/style, positive rental price, nonnegative deposit, and whole stock quantity from 0 to 10,000. Comma-separated tags are deduplicated with at most 10 tokens, each up to 40 characters.

INR values are entered as rupees with at most two decimal places and converted to integer paise before service calls. Rental price/deposit are capped at INR 10,00,000. `formatINR` preserves paise on display. Quantity zero represents out-of-stock inventory; it does not change archived status. Images and occasion tags are optional; no multi-size variant or date availability model is invented.

Images support selecting up to 6 JPG/PNG/WebP files, each non-empty and at most 5 MB, thumbnail previews, editable descriptions/alt text and removal. The demo reads image files into data URLs in memory; it does not upload to Cloudinary, write local/session storage, or create credentials. New images are saved with the product only on form submission. Removing an image from an edit draft does not change the saved product until saving. Accepted file types are UI checks; a real upload service must validate actual file content and authorized asset ownership.

### Typed Product service and ownership

`src/features/boutiques/inventory/service.ts` defines `BoutiqueProductService`:

```ts
readonly mode: "demo" | "live";
readonly boutique: { id: string; name: string };
listProducts(): Promise<BoutiqueProduct[]>;
getProduct(id: string): Promise<BoutiqueProduct>;
createProduct(input: ProductInput): Promise<BoutiqueProduct>;
updateProduct(id: string, input: ProductInput, version: number): Promise<BoutiqueProduct>;
setArchived(id: string, archived: boolean, version: number): Promise<BoutiqueProduct>;
uploadImages(files: File[], options?: ProductUploadOptions): Promise<ProductImage[]>;
```

The DTO is UI-only and does not declare a Prisma schema. Prices/deposits use paise; tags/colours use arrays. Images use a discriminated `source`: demo images contain `id`, `url` (local data URL) and `alt`; Cloudinary images additionally require `publicId` and `secureUrl`, with matching HTTPS Cloudinary preview/delivery URLs. Array order is the display order and its first item is the cover. Product records also contain `id`, `boutiqueId`, `archived`, `version`, and `updatedAt`. Form validation and service-payload validation are separate, so the demo validates numeric DTOs independently of browser form values.

`src/features/boutiques/adapters/mock/products.ts` supplies the current adapter. It starts with five fictional products in `demo-boutique`; one is archived and another has zero stock. The adapter filters listing by its boutique scope, rejects missing/foreign IDs on lookup and mutation, enforces version checks to prevent stale overwrites, ignores client-supplied ownership/status fields in editable DTOs, and returns defensive copies. Creates are scoped automatically. Archive/unarchive preserves the record, stock and images; it does not implement booking changes.

`ProductProvider` lives in the root boutique layout, so inventory changes survive Next.js navigation between product routes and the dashboard. Refreshing or remounting the boutique provider resets fixtures and discards local images. Inventory is independent of the pending onboarding application and the dashboard's fixed-date reporting fixtures; editing inventory does not update that frozen dashboard report. These distinctions are intentional demo boundaries, not competing database implementations.

A replacement adapter must be configured in the client provider/wrapper and must map the shared Product APIs/models to these DTOs. No endpoint paths have been guessed and no live-error fallback exists. Errors use `ProductServiceError` with `NOT_FOUND`, `FORBIDDEN`, `CONFLICT`, `UNAVAILABLE`, or `VALIDATION`; missing and foreign products should be indistinguishable to the caller.

Before enabling a real adapter, Member 2's backend must derive the boutique from the authenticated session and verify approved status and ownership for every list, lookup, create, update, archive/unarchive and upload/asset association operation. A URL ID, client `boutiqueId`, demo scope check or hidden button is not authorization. No real authentication/RBAC or shared Prisma models were modified.

### Product integration blockers

Shared Product API handlers and models are still absent. Required coordination includes category taxonomy and size/variant semantics, product listing pagination/search filters, stock constraints for active rentals, permitted archiving transitions, version/idempotency rules, validation error DTOs, and authenticated approved-boutique scope. Cloudinary signing/upload, authorized image IDs/URLs, file-content validation, and unused asset cleanup also require backend contracts. Image removal currently only detaches an image from the product draft/record; live asset deletion must follow the agreed shared media lifecycle.

### Product verification

- Final TypeScript (`tsc.cmd --noEmit`), lint (no warnings), and production build passed. All three requested routes are in the build output; edit uses a Suspense boundary for dynamic route parameters under the existing cache-components configuration.
- All 14 tests passed: five inventory tests plus the nine existing dashboard/onboarding tests. Inventory tests cover validation/paise conversion, create/edit/archive/unarchive and session isolation, foreign/missing ID rejection, version conflicts, and image count/type/size limits.
- Production HTTP checks returned 200 for products, new product, a fixture edit URL, a missing-product edit shell, dashboard, register, and pending. Missing-product and ownership behavior are service-tested; HTTP shell responses do not establish product existence or authorization.
- Browser runtime still reports no connected browsers. Visual responsive QA, file-picker interaction, dialog focus behavior and full click-through testing could not be run; unit/service and HTTP checks do not replace that verification.
- No dependencies, authentication systems, Prisma models, database queries, booking logic, commits, pushes, merges or branch changes were added/performed for inventory.

## Secure Cloudinary integration boundary and image UI

Authentication and the shared upload/Product backend contracts are still missing. **No upload authorization/signing/finalization endpoint has been exposed.** Cloudinary credentials were not accessed. Current screens continue using clearly labeled in-memory demo images; setting environment variables alone does not activate Cloudinary.

`ProductImageManager` replaces the inline image picker in both add/edit forms. It supports multiple selection, immediate local previews, per-file queued/loading/progress/error states, individual retry/removal of failed files, saved-image removal and accessible Earlier/Later reorder buttons. The first image is the cover. Successful files are retained even if another file fails. File selection and ordering changes are disabled while a batch runs; saving is blocked until queued/failed files are resolved or removed. Removing images affects the product draft, and reordered images/alt descriptions are saved through the existing product service.

JPG/PNG/WebP, non-empty files, 5 MB per file, and six total saved/queued files are validated before calling an upload service. The demo exposes FileReader progress where the browser supports it, explicitly labeled as local reading. The signed transport exposes actual XHR transfer progress where computable; 100% transfer is followed by asset verification before the image is accepted. Unmount aborts current work and releases local object-preview URLs. Progress, previews, and browser interaction still need visual QA because no browser is connected.

`ProductUploadOptions` carries optional `productId`, abort signal and a byte-progress callback. The demo checks product scope when an edit ID is supplied. Live image results must use `source: "cloudinary"`; data URLs are not accepted as live upload results by the image manager.

### Reusable signed client workflow

`src/features/boutiques/inventory/cloudinary-upload.ts` exports `createSignedCloudinaryUploader(backend)`. Its explicit backend dependency supplies two callbacks, with no guessed URLs or default credentials:

1. `authorize({ productId?, file: { name, type, size } }, signal)` must authenticate the applicant, derive and verify approved boutique scope, verify edit ownership (or an owned product draft for new products), enforce quotas/CSRF policy, and create a tracked upload intent. It returns `intentId`, `cloudName`, public `apiKey`, `signature`, `expiresAt` (epoch milliseconds), and exact signed `parameters`: `timestamp` (epoch seconds), unique `public_id`, `overwrite: "false"`, and a restricted signed `upload_preset`. The backend must own all parameter selection, public-ID namespaces and preset configuration; it must not sign arbitrary client parameters. The Cloudinary secret stays on the server.
2. The client validates the authorization shape/expiry, sends the file and exact parameters to the fixed Cloudinary HTTPS `image/upload` host using XHR, and reports byte progress. It sends no API secret and creates no unsigned upload fallback. Signed grant configuration follows [Cloudinary's signing documentation](https://cloudinary.com/documentation/authentication_signatures) and [upload API](https://cloudinary.com/documentation/image_upload_api_reference).
3. `finalize({ intentId, response }, signal)` receives the untrusted upload response. The authenticated backend must verify the Cloudinary response signature or query trusted Cloudinary metadata, recheck intent/owner/expiry, actual resource type/format/size, exact public-ID namespace/cloud, allowed product association and replay policy, then register an owned asset. It returns a verified `ProductImage` including `source: "cloudinary"`, server asset `id`, `publicId`, `secureUrl`, identical `url` and `alt`. The client checks source/public-ID/cloud-path agreement before adding the asset to a product draft. A signed upload alone is not proof of authorized asset ownership.

Attach this returned uploader to a real product adapter's `uploadImages` method only after the callbacks are implemented. The image UI calls it one file at a time, preserving partial batch successes and enabling per-file retry. Existing `createProduct`/`updateProduct` carry the ordered verified image records, including public IDs and secure URLs, through the Product service. The actual Product backend must revalidate asset ownership/authorization and reject demo images/arbitrary client-supplied asset URLs or IDs on every save. Metadata persistence tests exercise the DTO/service path; database persistence is not implemented.

The restricted Cloudinary preset and backend validation must enforce allowed formats and byte limits. Client MIME/size checks alone are not content validation. Intents need idempotent finalization/retry behavior and orphan cleanup when users remove uploaded files, abandon drafts or lose a response. Removal/reordering does not call Cloudinary destroy from the browser. Authorized server cleanup/deletion must ensure an asset is not referenced by another product or booking before deleting it.

### Environment names and blockers

`.env.example` contains blank server-only `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, and the newly added `CLOUDINARY_SIGNED_UPLOAD_PRESET`. None require a `NEXT_PUBLIC_` prefix. The browser receives cloud name/API key/signature from an authorized grant, never the secret. The example file remains ignored by the existing `.env*` rule; `.gitignore` was not modified.

Live uploading requires credentials and a restricted signed preset, Member 2's authenticated approved-boutique ownership contract, server-generated signing, verified/idempotent finalization and owned-asset storage, Product image persistence/ownership validation, and media cleanup policy. No placeholder auth, Prisma schema, public signing route, unsigned preset, or fabricated live endpoint was added.

### Cloudinary/image verification

- TypeScript, lint (no warnings), and production build passed. All 18 tests passed: four image-upload tests plus the 14 existing inventory/dashboard/onboarding tests.
- New tests cover strict Cloudinary metadata and HTTPS validation, immutable ordering and public-ID/secure-URL product-service round trips, rejection of invalid files/authorization/expired grants before transport, exact signed request fields, progress callbacks and backend verification rejection. Transport is mocked; no credentials or real Cloudinary uploads were used.
- Full browser file-picker/progress/retry/reorder testing remains unavailable because no connected browser exists. Real Cloudinary and backend integration tests remain blocked by the contracts and credentials listed above.
- No unrelated modules, shared auth, Prisma models, commits, pushes, merges, or branch changes were modified/performed.

## Booking management and rental calendar

`/boutique/bookings` lists requests with search by reference/customer/email/product and service-side status filtering. Apply/Clear filters, refresh/retry, booking-detail links, calendar navigation, and upcoming pickup/return links work in demo mode. Detail screens at `/boutique/bookings/[id]` show permitted customer fields, products/sizes/quantities, pickup/return/request dates, service-provided INR rental charges, separate deposits, status and rejection feedback.

Confirm/reject buttons are rendered from `allowedActions` supplied by the service, rather than calculating live transitions in the browser. Actions require a confirmation dialog; rejection requires 3–500 characters of feedback. Loading disables decisions, errors retain the record with a reload action, and successful results update status/actions. Demo confirmation changes only a fictional request to confirmed; it performs no availability validation, reservation, stock mutation, payment, refund, or notification. Rejection changes only that demo record and removes it from demo calendar events.

`/boutique/calendar` includes a Sunday-first monthly grid, previous/next navigation, explicit month picker, reference/current-month button, refresh, loading/retry/empty states, rental range markers and event links to booking details. Pickup and return indicators display on their dates. Pending ranges are explicitly tentative; cancelled/rejected records are omitted by the demo service. Completed rentals can remain visible as historical events. Calendar cells include adjacent dates to complete week rows; date calculations use UTC for display-grid construction, while event dates are supplied in the boutique timezone. On narrow screens the month grid scrolls horizontally rather than hiding events.

The calendar draws service-provided intervals including the displayed return day for handover context. It does not calculate rentable quantity, conflicts, holds, or actual availability. Its date helpers are presentation utilities, not a booking engine.

### Shared booking contract status and isolated demo service

No shared Booking API handlers or canonical Member 2 status definitions were found. `src/features/bookings` remains untouched. `booking-management/service.ts` defines a UI-facing `BoutiqueBookingService` using the requested lifecycle vocabulary: `PENDING`, `CONFIRMED`, `PICKED_UP`, `RETURNED`, `COMPLETED`, `REJECTED`, `CANCELLED`. The demo maps the frozen dashboard sample's `ACTIVE` record to `PICKED_UP`; the dashboard's independent report vocabulary remains unchanged. Operational status names must map to Member 2's canonical DTOs before live integration; they are not database enum declarations.

The service exposes boutique-scoped `listBookings({ search?, status? })`, `getBooking(id)`, `decideBooking(id, decision, version, reason?)`, and `getCalendar(month)`, along with mode, boutique metadata, reference date and timezone. A booking contains customer summary, product lines, timestamps, aggregate rental/deposit amounts in paise, status, version, allowed actions and optional rejection feedback. A list supplies filtered records plus upcoming pickup/return lists independently of the search filter. Calendar events supply booking reference, labels/status, and local `YYYY-MM-DD` range/pickup/return dates. UI amounts and actions are displayed as returned by the service.

`adapters/mock/bookings.ts` seeds fictional records from the established dashboard sample, then stores independent defensive copies. Demo search/filter, permitted pending decisions, version checks and scoped lookup are isolated fixture behavior only. Foreign/missing IDs are invisible and cannot be mutated. No booking creation, pricing engine, inventory adjustment or availability engine exists. Fixtures use the seven-day window beginning 11 October 2026 in Asia/Kolkata. The demo customer email/phone fields are sample values, not real contact data.

`BookingProvider` lives in the root boutique layout, so decisions persist across list/detail/calendar navigation in the current browser session and are reflected when the calendar loads or refreshes. Refresh/remount resets the fixtures. The dashboard's fixed reporting snapshot remains independent and does not change when demo bookings are decided. The shared desktop/mobile sidebar now navigates to the dedicated booking/calendar screens.

### Required Member 2 endpoints (proposals; none implemented or called)

| Proposed endpoint / capability | Required contract |
| --- | --- |
| `GET /api/boutique/bookings` | Authenticated approved boutique scope, canonical status/search filters, pagination, permitted customer/product fields, authoritative rental/deposit amounts, version and allowed actions; provide upcoming handovers or a separate scoped endpoint |
| `GET /api/boutique/bookings/:id` | Authenticated ownership check, complete permitted booking details, canonical status, line/aggregate amounts and allowed transitions; missing/foreign references return indistinguishable not-found responses |
| `POST /api/boutique/bookings/:id/decision` | Agreed confirm/reject operation, expected version/idempotency key and rejection feedback. Member 2's backend must atomically check current state and authoritative availability/stock/holds before confirming; enforce permissions and return updated DTO or conflict |
| `GET /api/boutique/calendar?month=YYYY-MM` | Authenticated boutique scope, timezone and canonical interval semantics, visible-grid range coverage, rental/pickup/return events and statuses; apply agreed inclusion policy for pending, cancelled, rejected and completed records |

These paths are planning proposals, not existing APIs. Map the adapter to whichever endpoint names Member 2 supplies. Do not create a competing booking backend or silently replace live failures with demo results. The real backend must verify approved boutique session and ownership on every read and decision, enforce all allowed transitions and availability, and determine deposits/pricing/payment effects. Client-provided boutique IDs or service action flags are not authorization.

Remaining blockers are auth/RBAC, canonical status definitions, permitted transition semantics, atomic confirmation/conflict handling, booking/hand-over/calendar DTOs and pagination, timezone/interval policy, money/refund/deposit definitions, and notification policy. No shared auth, Prisma models, booking APIs or database logic were modified.

### Booking/calendar verification

- TypeScript, lint (no warnings), and production build passed. The build includes the requested list, dynamic detail and calendar routes. Dynamic details use the existing Next.js 16 Suspense convention.
- All 23 tests passed, including five new tests for search/filter/handovers, decision/calendar propagation and stale decisions, foreign IDs/defensive copies, leap-year/year-boundary display grids, and boutique-timezone calendar dates. Existing image/product/dashboard/onboarding tests passed unchanged.
- Production HTTP checks returned 200 for booking list, fixture details, missing-booking detail shell, calendar, products and dashboard. The missing-record shell intentionally renders a client unavailable state after lookup; its HTTP response is not proof that a booking exists.
- Browser runtime reports no connected browsers. Visual month-grid/mobile/dialog inspection and full click-through testing remain unavailable; service tests do not replace that UI verification.
- No dependencies, booking engine, availability logic, auth implementation, Prisma schema, commits, pushes, merges or branch changes were introduced.

## Rental lifecycle management

The booking detail screen now supports the complete requested `PENDING → CONFIRMED → PICKED_UP → RETURNED → COMPLETED` path, plus rejected/cancelled outcomes. `BookingLifecycle` shows the current workflow stage, actual pickup/return/completion timestamps when recorded, inspection condition/notes, deposit amount and manual refund status. Every mutation uses a Base UI confirmation dialog with loading protection and success/error feedback. Failed requests retain the entered dialog data; stale-version errors instruct the user to close the dialog and reload the booking.

`applyLifecycleAction(id, command, version)` was added to the existing service boundary. The legacy `decideBooking` method delegates to it for confirm/reject in the demo, preserving one mutation implementation. `LifecycleCommand` is a typed discriminated union with Zod validation for confirmation, rejection, cancellation, pickup, return, completion, inspection and manual refund recording. The UI renders only service-provided `allowedActions`; it does not advance real booking status locally or calculate availability.

### Explicit demo policies (not Member 2's production rules)

| Demo state | Available demo actions |
| --- | --- |
| PENDING | Confirm, reject with reason, cancel with reason |
| CONFIRMED | Mark picked up, cancel with reason |
| PICKED_UP | Mark returned |
| RETURNED | Record/edit inspection, record manual refund status; complete only once an inspection is recorded |
| COMPLETED, REJECTED, CANCELLED | Record/edit manual refund metadata only; no return to earlier lifecycle states |

The demo rejects skipped stages, unauthorized/foreign IDs, stale versions and actions absent from the record's capabilities. Every accepted action increments the record version. Pickup/return/completion and metadata timestamps are stamped by the demo adapter. These checks are isolated fixture simulation; real workflow policy, timing restrictions, availability and audit storage remain Member 2's backend responsibilities.

Inspection supports exactly `GOOD`, `MINOR_DAMAGE`, and `MAJOR_DAMAGE`, with up to 2,000 characters of notes. Damage conditions require at least three characters of descriptive notes. Recording/editing an inspection does not advance the lifecycle, change pricing, deduct a deposit, or set a refund status. The demo requires inspection before completion; this requirement and editing permissions must be agreed with the shared backend contract.

Refund status is **manually reported metadata**, with `PENDING`, `PARTIALLY_REFUNDED`, `REFUNDED`, `WITHHELD`, or `NOT_REQUIRED`, descriptive notes (3–1,000 characters), and a recorded timestamp. The UI labels these as reported/manual records and explicitly states that they are not verified payment settlement. The original deposit amount remains unchanged. No refund/payment transfers, automatic deductions, damage charges, refund amount calculations, payment-provider calls or automatic status synchronization are implemented. Completion does not imply a refund occurred, and refund recording does not complete a rental.

The demo remains browser-memory-only, resets on refresh, and explicitly states that changes are not persisted to PostgreSQL. Calendar and upcoming handover responses reflect the current demo lifecycle on refresh/navigation: pickups use `CONFIRMED`, returns use `CONFIRMED`/`PICKED_UP`; returned/completed records are no longer upcoming returns. The frozen dashboard report stays independent.

### Backend lifecycle integration requirements

Member 2 must supply a scoped action endpoint (proposed `POST /api/boutique/bookings/:id/actions`) or equivalent existing transition/inspection/manual-record endpoints. Requests carry the agreed command and expected version/idempotency key. Responses must include the updated canonical status, next `allowedActions`, version, actual timestamps, inspection metadata and manually recorded refund metadata. Endpoint paths and names are proposals only; no new API route or Prisma schema was added.

For each real action, the backend must authenticate the user, enforce approved boutique ownership and action permissions, atomically validate current state/version/availability when applicable, validate inspection/refund payloads, stamp trusted timestamps/operator IDs, and persist an auditable record. Cancellation eligibility and its booking/payment consequences must come from the shared contract, not the demo policy. Partial-refund records, zero-deposit cases, inspection edits after completion and required inspection notes also need contract agreement. Manual refund recording must remain distinct from actual payment settlement.

There is still no authentication/shared booking backend. `BookingProvider` explicitly selects the demo adapter; live errors must never fall back to it. Shared authentication, Prisma models, payment/refund systems and actual stock/availability logic remain unchanged.

### Lifecycle verification

- Final TypeScript, lint (no warnings), and production build passed. All 27 tests passed, including four new lifecycle tests and all 23 previous tests.
- The complete path is tested through inspection and completion; early completion is rejected. Tests also cover skipped/repeated/stale stages, foreign records, cancellation after pickup rejection, GOOD/MINOR_DAMAGE/MAJOR_DAMAGE behavior, rejection/cancellation reason validation, terminal outcomes, session reset, calendar propagation and unchanged deposits across all manual refund statuses.
- The test suite verifies that completion/refund metadata are independent and that no implicit refund state is created by inspection or completion. Transport/payment behavior is absent by design.
- Browser interaction and visual confirmation-dialog testing remain unavailable without a connected browser. Service tests establish demo lifecycle behavior, not backend authorization or PostgreSQL persistence.
- No dependencies, auth implementation, Prisma schema, payment/refund transfers, commits, pushes, merges or branch changes were added/performed.

## Boutique analytics implementation

`/boutique/analytics` now displays total bookings, completed rentals, completed rental revenue (INR), pending and cancelled bookings, a monthly booking chart with accessible data table, popular products, category booking bars, and conditional inventory utilization. Desktop and mobile management navigation link to this route. Refresh, loading, retry/error, and empty reporting states are implemented using existing Base UI/shadcn conventions and scoped boutique styling.

### Metric definitions

- The reporting period is an inclusive range of **booking creation months** in the service-supplied timezone. All totals and breakdowns use that cohort and statuses at `asOf`; the current month stops at that snapshot. A rental completed during the period but created outside it does not contribute. These are cohort metrics, not completion-date accounting.
- Total bookings and the zero-filled monthly trend include all seven existing booking statuses. Pending means `PENDING`; cancelled means `CANCELLED` and does not include rejected requests.
- Completed rentals count only `COMPLETED`. Completed revenue sums only their `rentalMinor` charges, stored as integer paise; deposits, cancelled/rejected requests, and every other lifecycle status are excluded. This is not a settled-payment, profit, or net-refund report.
- Popular products count unique bookings per stable product ID; requested quantities accumulate separately. Categories count once per category per booking, using category snapshots supplied with the booking lines. Both breakdowns exclude `CANCELLED` and `REJECTED`. Multi-category requests can make category totals exceed the eligible booking count. No demand forecasts or invented business insights are shown.
- Utilization is occupied unit-days divided by available unit-days. It is shown only with complete historical capacity/occupancy evidence matching the exact period, timezone and snapshot. Missing/zero capacity, incomplete evidence or impossible occupancy produces **Unavailable**, never a made-up percentage. Current product quantities and planned dates alone are insufficient. This reporting metric never determines availability.

### Service contract and blockers

`src/features/analytics/service.ts` defines `BoutiqueAnalyticsService.getDataset()` and `AnalyticsDataset`. The screen accepts a service implementation; its explicit default is `adapters/mock/analytics.ts`. Fixtures are isolated from production calculations. The demo uses nine fictional requests and is independent of other modules' mutable demo records. It is not persisted to PostgreSQL; refresh reloads the same snapshot. Live errors must not silently switch to demo mode.

Member 2 must provide an authenticated reporting endpoint or existing service that returns a complete boutique-scoped creation-cohort snapshot: boutique ID/name, trusted `asOf`, timezone, start/end months, completeness flag, and all relevant bookings with stable ID, owner boutique ID, canonical status, creation timestamp, rental/deposit minor units, and product ID/name/category/quantity snapshots. Actual endpoint paths are pending agreement; no API route was invented. Paginated list responses cannot be treated as complete until all pages are fetched with a consistent snapshot. For large datasets, agree on equivalent authoritative aggregate DTOs instead of transmitting customer records. This DTO does not need customer PII.

For optional utilization the backend must supply complete historical available and occupied unit-days (including historical stock changes, actual rental handovers, maintenance/unavailable capacity and agreed time boundaries), with matching period/timezone/asOf. The browser does not infer this from inventory or scheduled dates.

Authentication, approved boutique ownership checks, RBAC, database aggregation and source snapshot consistency remain backend responsibilities. Runtime calculation validation rejects incomplete datasets, duplicate/foreign booking IDs, unknown statuses, invalid dates/prices, future creation timestamps and unsafe financial totals, but is not authorization. The shared backend remains absent: no auth, Prisma, payment or booking engine changes were made.

### Analytics verification

Pure calculation tests cover completed-only revenue and deposit exclusion across every status, timezone boundary/cohort behavior, zero-filled months, duplicate product/category lines, cancellation/rejection exclusions, empty data, invalid/incomplete/foreign records, safe money precision and historical utilization evidence. The demo adapter is also tested for explicit mode, consistent totals and defensive copies. Final check results are recorded below after verification.

Final analytics checks: standalone TypeScript (`tsc --noEmit`), lint with no warnings, and production build all passed. All 35 Member 3 tests passed, including eight analytics tests. Production HTTP smoke test returned 200 for `/boutique/analytics` and confirmed its heading, demo label, loading state and navigation link. Client chart interaction and responsive visual checks remain unverified because no connected browser is available. No commits, pushes, merges or branch switches were performed.

## Occasion styling recommendation service

Added a reusable server-only recommendation entry and typed `POST /api/recommendations`; no conflicting route existed. `contracts.ts` exports Zod input/output schemas and adapter interfaces, `engine.ts` contains testable rule fallback and catalog selection, `gemini.ts` performs structured preference generation, and `http.ts` handles bounded JSON input and typed errors. No customer UI, shared authentication, Prisma schema or availability engine was added.

### Request and response contract

Send `Content-Type: application/json`, with an INR budget number (maximum two decimals):

```json
{
  "occasion": "wedding",
  "totalRentalBudget": 1000,
  "outfitType": "saree",
  "colourPreference": "plum",
  "jewelleryPreference": "gold",
  "lookMode": "complete-look",
  "city": "Jaipur",
  "rentalDates": { "start": "2026-10-20", "end": "2026-10-22" }
}
```

Occasions: wedding/reception/party/festive/formal/casual. Outfit types: any/saree/lehenga/gown/suit/dress. Jewellery: none/any/gold/silver. Colour uses a catalog colour or `any`, matched case-insensitively. City and rental dates are optional inputs; without dates the service returns `DATES_REQUIRED` with no products rather than claiming undated availability. Dates use the shared service's pickup/return date semantics, with end strictly after start. `lookMode` defaults to `outfit`; `complete-look` requires an outfit plus matching jewellery unless jewellery preference is `none`. Complete looks currently cover these two components, not footwear or additional accessories.

AI and rule fallback use the same `RecommendationResponse` schema: status, source (`gemini`/`rules`), fallbackReason, currency, budgetMinor, validated styling preferences, looks (real product/boutique identifiers and names, quoted rental paise, summed rental paise), and a factual message. Up to five deterministic alternatives are returned. Budgets are converted once to integer paise; deposits are separate and never presented as included in the rental budget. Checkout must revalidate quote and availability; recommendations do not reserve stock.

Valid dated requests currently return HTTP 503 with `INVENTORY_UNAVAILABLE`, empty looks and `inventory_unavailable` reason. Other business results use 200. Unsupported media types use 415, oversized bodies over 8 KB use 413, malformed/invalid requests use 400; unexpected service failures use sanitized 503 errors. All responses use `Cache-Control: no-store`. Validation errors use the separate typed `RecommendationApiError` envelope; AI and fallback business results share one schema.

### Gemini and fallback boundaries

The server reads only `GEMINI_API_KEY` and `GEMINI_MODEL`; both are private environment variables, documented without credentials in `.env.example`. Set a structured-output-capable model available to the Google account. No default model availability is assumed. Missing key or model configuration uses rules. REST structured output follows [Google's structured output documentation](https://ai.google.dev/gemini-api/docs/generate-content/structured-output?hl=en), with Zod-derived JSON schema and local validation. No Gemini SDK dependency was added.

Gemini receives occasion, outfit type, colour and jewellery preferences only, not the inventory, prices, city, rental dates, API credentials in prompts, or customer PII. Its strict output contains only allowed style tags (traditional/minimal/festive/formal/contemporary). These tags affect ranking; they cannot change user constraints, prices, products or availability. Unknown fields, product inventions, invalid tags, malformed JSON and incomplete responses trigger rule fallback. API errors and timeouts also fall back; credentials/provider error bodies are never returned. Inventory search and preference generation are each bounded to four seconds with abort signals; a timed-out provider that ignores abort cannot delay the response. Rules map occasions to fixed tags and rank by tag match, then lower rental quote, then stable product ID.

### Required shared inventory integration

Member 2 must supply a `RecommendationInventoryAdapter.search(input, signal)` backed by actual shared product and boutique models and authoritative rental availability. Wire it into `createServerRecommendationService`; its default deliberately rejects, with no demo catalog. This interface is a DTO mapping boundary, not a proposed Prisma schema or invented database API.

Each candidate must contain stable product and boutique IDs/names, approval status, archive flag, outfit/jewellery kind, outfit type, catalogue colours, jewellery type, city, occasion/style tags, and **full-period rental quote in integer paise**. Map actual canonical categories/taxonomies explicitly; do not infer them from generated prose. The availability result must supply AVAILABLE/UNAVAILABLE/UNKNOWN, available units, exact requested start/end and a trusted checkedAt timestamp. The selector requires APPROVED, unarchived, fresh verified availability (at most 60 seconds old, not future), positive available units, matching dates/city/occasion/type/colour/jewellery, and individually and jointly affordable prices. No stock count alone qualifies as availability. Quotes must include all rental-period charges that the shared pricing contract treats as rental; checkout fees/deposit semantics need agreement with Member 2.

The backend owns public catalog visibility, approval validation, canonical product ownership, date/timezone semantics, stock reservations, quote validity, server-side availability, authentication policy if required, and endpoint abuse/rate limits before live Gemini traffic is enabled. Adapter failures/timeouts fail closed with no products and no AI call. Malformed adapter data is never converted into fabricated matches. Client demo inventory and mutable demo bookings are intentionally not used. Production integration and a live Gemini credential/model smoke test remain blocked by absent shared services/configuration. No model training, vector database, payment logic or booking engine is introduced.

### Recommendation verification

Nine new tests cover combined rental budgets and paise precision; every eligibility filter; approval, archive, freshness and date-matching checks; duplicate products; jewellery requirements; Gemini-only ranking and rejected product injection; deterministic failure/invalid-output/timeout fallback; missing dates and missing inventory; input validation; credential headers/structured JSON transport; and HTTP errors. Final complete check results are recorded below.

Final recommendation checks: TypeScript (`tsc --noEmit`), lint (no warnings) and production build passed. All 44 Member 3 tests passed, including nine recommendation tests. Production endpoint smoke tests passed for dated requests returning 503/INVENTORY_UNAVAILABLE with zero products, invalid inputs returning 400, unsupported media types returning 415, and undated requests returning 200/DATES_REQUIRED; all checked responses were no-store. The production build uses the existing default runtime because explicit runtime segment configuration is incompatible with this repository's Cache Components setting. Live Gemini and real inventory integration were not tested because the shared catalog/availability backend and configured credentials/model are still required. No commits, pushes, merges or branch switches were performed.
