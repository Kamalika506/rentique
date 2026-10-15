# Rentique: project explanation and review preparation

Prepared from the working repository on **15 October 2026**. Use [REVIEW_PRESENTATION.md](REVIEW_PRESENTATION.md) for the 26-slide presentation. This guide supplies the longer explanations and answers behind it.

## 1. Opening explanation you can say aloud

“Rentique is a full stack fashion rental marketplace connecting customers with boutiques. Customers discover outfits, check date-specific availability and prices, request rentals, track their progress, and review completed rentals. Boutique owners apply for approval and then manage products, images, booking decisions, pickups, returns, and reporting. Administrators approve boutiques and moderate platform resources.

“We use Next.js App Router with React and TypeScript for the application. The same Next.js server exposes backend route handlers. Prisma accesses PostgreSQL through a private connection string; Neon can host that PostgreSQL database. Cloudinary stores product images. Gemini optionally interprets styling preferences, while our own code selects real products and enforces availability and budgets. Auth.js handles authentication, and the backend enforces roles and ownership.”

Payment collection is arranged with the boutique. There is no implemented payment gateway, and manual refund records do not transfer money.

## 2. Problem statement, objectives, and scope

**Problem statement:** Design and implement a centralized fashion rental platform that helps customers discover suitable outfits and request rentals for specific dates, while helping boutiques maintain inventory and manage the rental lifecycle under administrator oversight.

The project addresses these practical needs:

- Customers need outfit discovery, prices, size selection, date availability, and rental tracking in one place.
- Boutiques need structured inventory, booking requests, pickup/return scheduling, and rental history.
- Administrators need control over boutique approval, user activation, categories, and moderation.
- Different users must see only the information and operations they are authorized to access.

These are design motivations, not measured findings from a user study. Do not claim proven cost savings, sustainability impact, or increased revenue without separate evidence.

Implemented scope includes customer discovery, boutique storefronts, wishlist, rentals, reviews, boutique onboarding, image upload, inventory, lifecycle management, calendar, reporting, admin management, authentication, and recovery. Online payments, actual automated refunds, delivery logistics, and a native mobile application are outside the current implementation.

## 3. How to explain the three-member work split

The older `docs/MEMBER3_IMPLEMENTATION.md` associates Member 1 with customer/admin integration, Member 2 with shared backend/auth/database, and Member 3 with boutique features and styling/reporting work. Much of that document describes an earlier scaffold and is no longer accurate about the live application. It is evidence of an intended division, not proof of individual authorship.

Use this allocation as a proposal and correct it to match your real contributions:

| Member | Responsibilities to present | Representative files |
| --- | --- | --- |
| Member 1 — customer/admin interface | Landing and catalog pages, product detail, storefronts, wishlist and rental views; admin screens and approval/moderation interface | `src/app/page.tsx`, `src/app/marketplace/`, `src/app/boutiques/`, `src/app/my-rentals/`, `src/app/admin/`, `src/features/marketplace/`, `src/features/admin/` |
| Member 2 — shared backend and persistence | Prisma schema/migrations, Auth.js, account registration/recovery, role and ownership checks, shared APIs, authoritative rental and database rules | `prisma/`, `src/auth.ts`, `src/lib/`, `src/app/api/`, `src/features/rentals/`, `src/features/auth/` |
| Member 3 — boutique workspace and recommendations | Onboarding UI, dashboard, product editor/image manager, booking screens, calendar, analytics, recommendation contracts/engine and provider boundary | `src/features/boutiques/`, `src/features/analytics/`, `src/features/recommendations/`, `src/app/boutique/`, `src/app/styling/` |

The overlap is intentional: a screen owner and API owner must agree on request/response types, validation, lifecycle vocabulary, and errors. Integration, testing, documentation, and bug fixing are shared responsibilities. Do not claim this table proves who wrote every file.

## 4. Application workflows

### Customer workflow

1. Open `/` or `/marketplace`; browsing is public.
2. Filter products by search, category, occasion, colour, size, price, boutique, and sorting.
3. Open `/marketplace/[productId]` to view images, boutique details, sizes, price, deposit, and reviews.
4. Sign in to check availability and submit a rental request.
5. Choose a variant/size, quantity, pickup time, and return time.
6. The page calls `GET /api/availability`; the server returns available quantity and a price quote.
7. Submit `POST /api/bookings`. The server checks everything again and creates a PENDING booking.
8. Track the request in `/my-rentals` as the boutique confirms, hands over, receives, inspects, and completes it.
9. Submit an eligible review after completion. Wishlist entries are stored for the signed-in customer.

The detail page treats a quote as fresh for one minute. That is a UI freshness rule, not a guarantee that stock is reserved by the quote. The booking transaction is authoritative.

### Boutique onboarding and management

1. A visitor can start the boutique form at `/boutique/register`.
2. In the current working form, an unauthenticated visitor's valid draft is kept in `sessionStorage` while they create an account or sign in with boutique intent.
3. Public `POST /api/register` always creates a CUSTOMER. It does not accept a privileged role from the browser.
4. Submitting `POST /api/boutique/application` validates the application, creates or resubmits a PENDING boutique, and changes the user's role to BOUTIQUE_OWNER in one database transaction. Administrators cannot apply through this service.
5. The current form clears its draft, signs out, and redirects to boutique sign-in after successful submission.
6. After sign-in, management guards send unapproved owners to `/boutique/pending`. An owner without a boutique is sent to `/boutique/register`.
7. An administrator approves or rejects the application. Rejection has a reason; rejected applications can be resubmitted.
8. Approved owners manage `/boutique/dashboard`, `/boutique/products`, `/boutique/bookings`, `/boutique/calendar`, and `/boutique/analytics`.
9. `/boutique/settings` implements editable profile settings. Older notes describing it as a redirect are outdated.

`intent=boutique` controls navigation and user experience. It does not grant the owner role or bypass approval.

### Administrator workflow

The trusted provisioning script creates/promotes a separate admin account. After sign-in, `/admin` and its nested screens provide dashboard data, boutique decisions, user activation/deactivation, category management, product archiving/restoration, review visibility controls, bookings, and audit/activity views. Backend admin services require `currentUser("ADMIN")` independently of the page layout.

### Rental lifecycle

```text
PENDING ----confirm----> CONFIRMED ----pickup----> PICKED_UP
   |                        |                        |
 reject/cancel            cancel                   return
   |                        |                        |
REJECTED/CANCELLED       CANCELLED                 RETURNED
                                                     |
                                                 inspection
                                                     |
                                                  complete
                                                     |
                                                  COMPLETED
```

`src/features/rentals/rules.ts` defines permitted actions. RETURNED bookings require an inspection before COMPLETE becomes allowed. The server writes lifecycle timestamps, increments the version, and appends a `BookingEvent`. Inspection and manual refund metadata have dedicated tables. A cancellation or rejection is not a payment reversal.

## 5. Technology stack and why it was chosen

Versions below come from `package.json`; ranges describe declared dependencies rather than a claim that every dependency is pinned.

| Technology | Actual use | Justification and practical tradeoff |
| --- | --- | --- |
| Next.js `16.4.0` App Router | Pages, layouts, metadata, API handlers, server guards | One application can deliver UI and HTTP APIs; developers must understand server/client and caching boundaries. |
| React `19.3.0` | Component composition, state, context, effects | Reusable screens and interactive forms; client state still needs explicit synchronization with APIs. |
| TypeScript `^5` | Types and interfaces across layers | Helps catch mismatched contracts at development time; runtime input still needs validation. |
| Tailwind CSS `^4`, CSS Modules | Shared utilities and feature-scoped styles | Supports rapid layout work and local style isolation. The Tailwind Turbopack rule is restricted to `globals.css`. |
| Base UI, Lucide, shared button | Input/dialog primitives, icons, shared control styles | Reduces repeated interface work; application accessibility still requires testing. |
| React Hook Form, Zod, resolver | Form state and schemas | Gives consistent field validation and a separate backend validation boundary. |
| Prisma `^6.19.3` | ORM, generated client, migrations | Typed queries and relational transactions; generated code must be refreshed after schema changes. |
| PostgreSQL; Neon when configured | Persistent relational storage | Foreign keys, uniqueness, indexes, and transactions fit bookings and ownership. Neon is a host, not a different database engine. |
| Auth.js / `next-auth` `^5.0.0-beta.32` | Credentials, optional Google, JWT sessions | Avoids building a session system from scratch; this repo uses a beta package version. |
| bcryptjs `^3.0.3` | Password hashing and comparison | Passwords are stored as hashes rather than recoverable plaintext. |
| Cloudinary REST API | Image upload and CDN delivery | Keeps image bytes outside relational tables; account configuration and asset lifecycle need management. |
| Gemini REST API | Optional preference classification | Adds styling tags without giving AI authority over catalog facts; network failures have a rules fallback. |
| Nodemailer `^8.0.11` | SMTP notifications and account emails | Supports existing SMTP accounts; configuring credentials alone does not prove delivery. |
| ESLint, TypeScript, `tsx`, Node test runner | Static checks and tests | Covers code quality, contracts, rules, transport behavior, and optional HTTP integration. |

The code does not use a dedicated Gemini SDK, Cloudinary SDK, Neon SDK, separate Express backend, or Redux store for these integrations.

## 6. Architecture and boundaries

The best description is **a feature-oriented modular monolith with layered responsibilities and adapter-based service boundaries**.

```mermaid
flowchart TD
  UI[React pages and feature screens] --> P[Providers and live API adapters]
  P --> API[Next.js API route handlers]
  API --> S[Authorization and domain services]
  S --> ORM[Prisma client]
  ORM --> DB[(PostgreSQL / Neon)]
  API --> IMG[Cloudinary image API]
  S --> REC[Recommendation engine]
  REC --> AI[Gemini preference provider]
  S --> MAIL[SMTP email service]
```

Not every request uses every layer. For example, server layouts call guards directly, and some route handlers contain their own service logic. The diagram describes the principal client-driven business flow.

| Layer | Purpose | Examples |
| --- | --- | --- |
| Route and composition | Map URLs, compose UI, wrap access guards | `src/app/**/page.tsx`, `layout.tsx` |
| Presentation | Render forms, lists, editors, and interactions | `src/features/boutiques/inventory/product-editor.tsx` |
| Client service boundary | Turn UI operations into API requests | `src/features/boutiques/adapters/live.ts`, `src/lib/api-client.ts` |
| HTTP entry | Map methods, parse requests, construct responses | `src/app/api/**/route.ts` |
| Domain/application logic | Enforce scope, lifecycle, prices, persistence | `src/features/rentals/server.ts`, `workspace-server.ts`, `src/features/admin/server.ts` |
| Rules/contracts | Pure calculations, validation, interfaces | `rentals/rules.ts`, `recommendations/contracts.ts` |
| Infrastructure | Database, email, external APIs | `src/lib/prisma.ts`, `src/lib/mail.ts`, `recommendations/gemini.ts` |

The services often call Prisma directly, so this is not a strict repository-pattern implementation or fully isolated Clean Architecture. It also is not a microservice deployment. The interface-first adapters and factories still provide useful dependency inversion and test seams.

## 7. Next.js frontend, backend, and routing explained

### File routing

Next.js creates routes from folders under `src/app`. A folder needs a route-defining file; an arbitrary folder or README does not create a URL.

| Convention | Meaning in this project |
| --- | --- |
| `page.tsx` | UI available at that folder's URL |
| `layout.tsx` | Wraps child pages with shared composition/providers/guards |
| `route.ts` | HTTP endpoint with method exports such as GET/POST |
| `[productId]` or `[id]` | One dynamic URL segment |
| `[...nextauth]` | Catch-all Auth.js route segments |
| `?id=...`, `?month=...` | Query parameters handled by the same route |
| `@/` in imports | TypeScript path alias for `src/`; not a browser URL |

For instance, `/marketplace/abc` matches `src/app/marketplace/[productId]/page.tsx`. The backend product read is currently `/api/products?id=abc`; it is not automatically `/api/products/abc`. Boutique booking detail pages use `/boutique/bookings/[id]`, while the live adapter reads `/api/boutique/bookings?id=...`.

### Server and Client Components

Pages/layouts are Server Components by default, but a file can declare `"use client"`. The project uses Client Components for forms, session hooks, state, effects, browser storage, and API-driven screens. A Client Component may receive initial server-rendered HTML and then hydrate; it is incorrect to say the directive guarantees browser-only rendering.

Server-rendered UI is still frontend presentation. The filename `.tsx` does not prove code executes in the browser, and `.ts` does not prove code is backend. Imports, directives, and execution context establish that boundary.

`src/app/layout.tsx` defines the root document, fonts, metadata, the session provider, and wishlist provider. `src/app/boutique/layout.tsx` composes onboarding, product, and booking providers. `src/app/boutique/dashboard/layout.tsx` adds `AccountGuard boutique approved`; its `page.tsx` composes `BoutiqueDashboard` inside `Suspense`.

`next.config.ts` enables `cacheComponents` and `partialPrefetching`. The common API wrapper calls `connection()` for request-time execution and returns `Cache-Control: no-store` for its successful live responses. This does not mean all pages are statically generated or that authenticated business data is cached. The current installed guides explain how runtime work interacts with Cache Components.

### Which files contain frontend code?

| Screen | Page entry | Main related UI |
| --- | --- | --- |
| Home | `src/app/page.tsx` | Customer header/footer and marketplace components |
| Login/register | `src/app/login/page.tsx`, `src/app/register/page.tsx` | Auth.js client calls and form interaction |
| Catalog/detail | `src/app/marketplace/page.tsx`, `src/app/marketplace/[productId]/page.tsx` | `src/features/marketplace/` |
| Boutiques/storefront | `src/app/boutiques/page.tsx`, `src/app/boutiques/[id]/page.tsx` | `src/features/boutiques/storefront/boutique-storefront.tsx` |
| Wishlist/rentals/profile | `src/app/wishlist/page.tsx`, `src/app/my-rentals/page.tsx`, `src/app/profile/page.tsx` | Feature and shared components |
| Styling | `src/app/styling/page.tsx` | Recommendation input/result interface |
| Boutique registration/status | `src/app/boutique/register/page.tsx`, `src/app/boutique/pending/page.tsx` | `onboarding/registration-form.tsx`, `application-status.tsx` |
| Boutique dashboard | `src/app/boutique/dashboard/page.tsx` | `dashboard/boutique-dashboard.tsx` |
| Product list/create/edit | `src/app/boutique/products/**/page.tsx` | `inventory/product-listing.tsx`, `product-editor.tsx`, `product-image-manager.tsx` |
| Booking list/detail | `src/app/boutique/bookings/**/page.tsx` | `booking-management/booking-listing.tsx`, `booking-details.tsx`, `booking-lifecycle.tsx` |
| Calendar | `src/app/boutique/calendar/page.tsx` | `rental-calendar/rental-calendar.tsx` |
| Analytics | `src/app/boutique/analytics/page.tsx` | `src/features/analytics/analytics-screen.tsx` |
| Settings | `src/app/boutique/settings/page.tsx` | `storefront/boutique-settings.tsx` |
| Admin | `src/app/admin/**/page.tsx` | `src/features/admin/{shell,dashboard,resource-screen}.tsx` |

Paths such as `inventory/` in the UI column are relative to `src/features/boutiques/` unless written in full.

### Which files contain backend code?

| File | Responsibility |
| --- | --- |
| `src/app/api/**/route.ts` | HTTP handlers; some implement inline database logic |
| `src/auth.ts` | Providers, credential verification, JWT/session callbacks |
| `src/lib/api.ts` | `ApiError`, endpoint wrapper, current user and boutique authorization |
| `src/lib/prisma.ts` | Shared Prisma client |
| `src/features/rentals/server.ts` | Catalog, booking creation/cancellation/lifecycle, inventory persistence |
| `src/features/rentals/workspace-server.ts` | Boutique application, calendar, dashboard, analytics |
| `src/features/rentals/availability.ts` | Availability query and peak reservations |
| `src/features/rentals/rules.ts` | Pricing, durations, lifecycle permissions |
| `src/features/rentals/records.ts` | Database includes and response projections/snapshots |
| `src/features/admin/server.ts` | Current routed admin management, decisions, audits |
| `src/features/auth/recovery.ts` | Recovery/verification token creation and consumption |
| `src/features/recommendations/server.ts`, `inventory.ts`, `gemini.ts` | Provider configuration, database candidates, Gemini transport |
| `src/lib/mail.ts`, `src/lib/rate-limit.ts` | SMTP and database-backed request limits |

`features/boutiques/**/service.ts` often defines UI-facing interfaces rather than the persistent backend. Follow imports instead of identifying backend files by the word “service.” For admin approvals, the current API routes to `features/admin/server.ts`; do not mistake the older `reviewApplications` helper in `workspace-server.ts` for the current admin endpoint implementation.

### API route map

Each path below maps directly to `src/app` plus the URL path plus `/route.ts`. Example: `/api/bookings` → `src/app/api/bookings/route.ts`.

| API path | Methods | Purpose |
| --- | --- | --- |
| `/api/register` | POST | Create CUSTOMER account with hashed password |
| `/api/auth/[...nextauth]` | GET, POST | Auth.js credentials, sessions, providers, callbacks |
| `/api/auth/forgot-password` | POST | Request password reset |
| `/api/auth/reset-password` | POST | Consume reset token |
| `/api/auth/verification-email` | POST | Request verification email |
| `/api/auth/verify-email` | POST | Consume verification token |
| `/api/profile` | GET, PATCH | Read/update own profile |
| `/api/profile/password` | PATCH | Verify current password and replace it |
| `/api/categories` | GET | Active shared categories |
| `/api/products` | GET | Public catalog or product by query ID |
| `/api/boutiques` | GET | Public approved boutique discovery |
| `/api/boutiques/[id]` | GET | Public storefront |
| `/api/availability` | GET | Authenticated date-based stock and price quote |
| `/api/bookings` | GET, POST, PATCH | Customer rentals, creation, cancellation |
| `/api/wishlist` | GET, POST, DELETE | Customer saved products |
| `/api/reviews` | GET, POST | Visible reviews and eligible submission |
| `/api/recommendations` | POST | Authenticated styling request |
| `/api/boutique/application` | GET, POST | Own application and submission/resubmission |
| `/api/boutique/settings` | GET, PATCH | Owner settings; approval is not required by its service guard |
| `/api/boutique/products` | GET, POST, PUT, PATCH | Approved-owner inventory management |
| `/api/boutique/images` | POST | Approved-owner image upload |
| `/api/boutique/bookings` | GET, PATCH | Approved-owner bookings and lifecycle |
| `/api/boutique/calendar` | GET | Booking calendar by month |
| `/api/boutique/dashboard` | GET | Boutique operational totals |
| `/api/boutique/analytics` | GET | Boutique reporting dataset |
| `/api/admin/dashboard` | GET | Platform dashboard |
| `/api/admin/users` | GET, PATCH | User listing and activation control |
| `/api/admin/boutiques` | GET, PATCH | Boutique list and decisions |
| `/api/admin/products` | GET, PATCH | Product moderation |
| `/api/admin/bookings` | GET | Booking monitoring |
| `/api/admin/categories` | GET, POST, PATCH | Category administration |
| `/api/admin/reviews` | GET, PATCH | Review moderation |
| `/api/admin/activity` | GET | Activity/audit monitoring |
| `/api/health` | GET | Request-time `SELECT 1` database check |

HTTP methods describe different operations at one URL. GET reads, POST creates/submits, PUT edits the product input, PATCH changes selected fields/status, and DELETE removes a wishlist relation. Product removal uses archiving rather than permanent deletion.

## 8. Follow one complete frontend-to-database request

Use editing a product as the easiest code walkthrough:

1. Open `src/features/boutiques/inventory/product-editor.tsx`: the form collects and validates product input.
2. The screen obtains its `BoutiqueProductService` through `ProductProvider` and `useProductService()`.
3. `inventory/provider.tsx` defaults to `createLiveProductService()` from `adapters/live.ts`; a test can inject another implementation.
4. `updateProduct(id, input, version)` calls `productApi('/api/boutique/products', jsonRequest('PUT', ...))`.
5. `src/lib/api-client.ts` performs `fetch`, parses JSON, and throws `HttpError` for non-success responses. Same-origin browser requests carry the applicable session cookies through normal fetch behavior.
6. `src/app/api/boutique/products/route.ts` exports `PUT = endpoint(saveProduct)`.
7. `endpoint` performs common request/error handling. `saveProduct` calls `ownedBoutique()` and validates the body with Zod.
8. The server checks that submitted image references match the owner's boutique prefix and configured Cloudinary delivery origin.
9. A Serializable transaction reads the owner's product, checks editor constraints, updates by ID/owner/version, updates the supported variant, and replaces image metadata.
10. Prisma sends queries to the PostgreSQL connection configured by `DATABASE_URL`. On success the service returns a response projection for the UI.

Illustrative request shape; IDs and image data must come from actual application records:

```json
{
  "id": "actual-product-id",
  "version": 2,
  "input": {
    "name": "Festive silk saree",
    "description": "A silk saree suitable for festive occasions.",
    "category": "Ethnic wear",
    "rentalPriceUnit": "PER_DAY",
    "occasionTags": ["wedding", "festive"],
    "colours": ["red"],
    "size": "M",
    "fabricStyle": "Traditional silk",
    "rentalPriceMinor": 150000,
    "depositMinor": 200000,
    "quantity": 3,
    "images": []
  }
}
```

The category shown is illustrative; use the exact category value supplied by the current category selector/API. The service resolves platform categories and legacy category labels. An empty image list illustrates the shape rather than a recommended listing.

Common responses are 400 for invalid input, 401 for sign-in required, 403 for forbidden access, 404 for unavailable records, 409 for conflicts, and 503 for unavailable dependencies. The common endpoint wrapper maps Prisma uniqueness/serialization codes P2002/P2034 to 409. Registration and recommendations have specialized handlers, so do not assume every endpoint uses the wrapper or has identical error shapes.

## 9. Login, sessions, roles, and recovery in detail

### Registration and credential sign-in

`POST /api/register` validates name/email/password, lowercases the email, rate-limits attempts, hashes the password with `hash(password, 12)`, and creates a CUSTOMER. The password schema requires at least eight characters and at most 72 UTF-8 bytes. Database uniqueness prevents duplicate emails. Verification email is attempted when mail is configured.

`src/app/login/page.tsx` calls `signIn('credentials', {email, password, redirect: false})`. Auth.js routes through `src/app/api/auth/[...nextauth]/route.ts`, whose GET/POST exports come from `src/auth.ts`.

The credentials `authorize` function validates the input, applies a limit of ten attempts per email per ten-minute window, finds the user, checks an active account and password hash, optionally requires verified email, and calls `bcrypt.compare`. Failure returns no authenticated user.

The configured session strategy is `jwt`. During JWT callbacks, the database supplies the current role, active status, and `sessionVersion`. A disabled account or version mismatch invalidates the token. The session callback exposes the user ID and role to application code. Auth.js manages the session cookie; the application does not put its authentication token in localStorage.

The Prisma adapter supports persistent user/provider account records. A `Session` table exists in the schema, but that does not change the selected JWT strategy or mean normal credentials logins use database sessions.

### Navigation versus access control

After credential login, the UI reads account information and routes ADMIN to `/admin`, BOUTIQUE_OWNER to `/boutique/dashboard`, and customers to a safe allowed callback/profile or boutique registration according to intent. Google continuation uses `/auth/continue` for comparable role-aware routing.

`AccountGuard` and the admin layout protect page access, but backend authorization is essential even if someone bypasses the UI. `currentUser()` checks the session and active database user. `currentUser('CUSTOMER')` or `currentUser('ADMIN')` checks the required role. `ownedBoutique()` derives the boutique by `ownerId`, checks BOUTIQUE_OWNER, and by default requires APPROVED status. Owner-scoped queries prevent access to another boutique's data.

Google OAuth is optional: both `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` must exist. Register the matching application origin and `/api/auth/callback/google` callback in the provider configuration. The OAuth provider handles its own sign-in flow; Google users need not have a password hash.

### Password changes and recovery

`PATCH /api/profile/password` verifies the current password, hashes the replacement, increments `sessionVersion`, removes reset tokens, and records an audit event transactionally. Existing JWT sessions become invalid.

`src/features/auth/recovery.ts` generates 32 random bytes encoded as a token, stores a SHA-256 hash, and emails the raw token in a purpose-specific link. Reset tokens last 30 minutes and email-verification tokens last 24 hours. Consumption checks type, expiry, active user, and single-use deletion in a transaction. Resetting a password also increments `sessionVersion`.

`REQUIRE_EMAIL_VERIFICATION=false` is the example default. Configure and test SMTP plus `APP_URL` before enabling it. Rate-limit buckets are persisted in PostgreSQL, so the implementation does not rely on a single process's memory.

## 10. Neon PostgreSQL and data changes

### What exactly is integrated?

There is no Neon-specific SDK or route. `prisma/schema.prisma` declares `provider = "postgresql"` and `url = env("DATABASE_URL")`. With a Neon connection URL in that environment variable, Prisma talks to Neon-hosted PostgreSQL. The repository is provider-compatible; source files alone do not prove which live database is currently connected.

`src/lib/prisma.ts` creates one shared `PrismaClient`, reusing it through `globalThis` in development to avoid recreating a client during module reloads. Generated code is placed in `src/generated/prisma`. `prisma.config.ts` loads `.env.local` before `.env`, preserving explicit shell values, and configures migrations.

```text
Browser request
  -> application API and server authorization
  -> Prisma query or transaction
  -> private DATABASE_URL
  -> PostgreSQL hosted on Neon
  -> database result
  -> JSON projection
  -> UI state/render
```

The browser never needs the database password. API routes are the application's public interface; PostgreSQL is a private dependency behind the server.

### Important models and relationships

| Models | Data stored |
| --- | --- |
| `User`, `Account` | Identity, role, active state, password hash where applicable, provider account data |
| `Session`, `VerificationToken` | Auth adapter schema support; JWT remains the configured session strategy |
| `AuthToken`, `RateLimitBucket` | Recovery/verification hashes and request-limit counters |
| `Boutique`, `BoutiqueReviewEvent` | Owner profile, approval state, decision history |
| `Category` | Editable catalog taxonomy with optional legacy mapping |
| `Product`, `ProductVariant` | Catalog details, prices, size/SKU, quantity, archive/version fields |
| `ProductImage` | Cloudinary public ID, secure URL, alt text, display position |
| `Booking`, `BookingItem` | Rental interval, customer/boutique, status, quantities, financial and catalog snapshots |
| `BookingEvent` | Actor, action, previous/next status, details and timestamp |
| `BookingInspection`, `ManualRefundRecord` | Return condition and manually recorded refund metadata |
| `Wishlist`, `Review` | Customer saves and eligible product reviews/moderation state |
| `AuditLog` | Administrative/security activity |

Examples of cardinality: one user may own one boutique; a boutique has many products and bookings; a product has variants and images; a customer has bookings; a booking has items/events and optional inspection/refund/review. Foreign-key and deletion rules differ by relation to preserve required history.

### Create, read, update, and remove

- **Create:** Prisma `create` inserts records. Product creation nests variant and image creation; booking creation nests items and a CREATED event.
- **Read:** `findMany`, `findUnique`, and `findFirst` apply visibility, ownership, pagination, and included relations.
- **Update:** `update`/`updateMany` change fields. Many management writes include an expected `version`, then increment it.
- **Remove:** product management sets `archived = true`; it preserves related rental history. Wishlist removal uses `deleteMany`. Product edit replaces image metadata inside a transaction; removing metadata is not the same as deleting a Cloudinary asset.

Conceptual SQL equivalent of the version check, for explanation only:

```sql
UPDATE "Product"
SET "name" = 'Updated name', "version" = "version" + 1
WHERE "id" = :id AND "boutiqueId" = :ownedBoutiqueId AND "version" = :expectedVersion;
```

If no row changes, the service returns a conflict rather than silently overwriting a newer edit. Prisma generates the actual database operations; the placeholders above are explanatory, not a ready-to-run migration.

### Currency and history

Prices use integer paise in PostgreSQL `BigInt` fields. INR 1,500 is 150000 paise. This avoids floating-point currency arithmetic. Response mappers convert to JSON-compatible numeric representations within the application's validated ranges. Native JavaScript `bigint` cannot simply be JSON-stringified.

`BookingItem` stores product name, size, category, rental amount, and deposit snapshots. Editing catalog prices later does not rewrite the agreed booking's history.

### Availability and concurrency

`availability.ts` loads booking items whose active reservations overlap the requested interval. A booking overlaps if its pickup is before the requested return and its return is after the requested pickup. The half-open interval `[pickup, return)` allows a booking to start exactly when another ends.

`peakReserved` clips reservation boundaries to the requested window, sorts quantity changes, and finds the maximum simultaneous reserved units. It does not add all bookings across non-overlapping times. PENDING, CONFIRMED, and PICKED_UP reserve inventory.

`createBooking` performs a Serializable transaction: load the variant/product and trusted price, compute reserved stock, reject excessive quantity, calculate amounts, and insert the booking/items/event. Concurrent contention can produce 409 and require retry; the code does not promise that all concurrent requests succeed or automatically retry them.

Daily rental = unit price × rounded-up rental days × quantity. Per-rental pricing charges the unit price once per unit. Deposit = deposit per unit × quantity. Pickup must be future, return must follow pickup, and duration must not exceed 90 days.

The total stock number is a capacity value. A booking does not permanently subtract it as a sale would; time-based reservations determine available capacity. This implementation should not be described as automatically extending a late rental's reservation indefinitely.

### Migrations versus generated client

`npm.cmd run db:generate` generates TypeScript database access code; it does not create tables. `npm.cmd run db:migrate` is `prisma migrate deploy`; it applies committed migrations and does not create a new migration from an edited schema. Existing migrations include the initial schema and the later complete-modules migration. Development schema changes should be accompanied by reviewed migrations before deployment.

## 11. Cloudinary integration and route flow

The current live flow is:

```text
product-image-manager.tsx
  -> ProductProvider / createLiveProductService().uploadImages
  -> multipart POST /api/boutique/images
  -> authenticated approved-owner check and validation
  -> signed server-side request to Cloudinary image/upload
  -> verified public ID and HTTPS URL returned to the editor
  -> POST/PUT /api/boutique/products
  -> ProductImage metadata stored in PostgreSQL
```

The API accepts up to six JPG/PNG/WebP files of up to 5 MiB each and checks ownership when a product ID is supplied. It generates `rentique/<boutiqueId>/<uuid>` public IDs. The SHA-1 upload signature is calculated using the signed parameter string and private API secret, with `overwrite=false`. The server posts multipart data to `https://api.cloudinary.com/v1_1/<cloud>/image/upload` and validates the response's public ID and delivery URL prefix.

The editor receives metadata; product save associates it with the product. Image bytes live in Cloudinary, while `ProductImage` stores references and ordering. Next configuration allows `res.cloudinary.com` as a remote image host. Several screens use ordinary `<img>` rendering, so do not claim every image automatically passes through `next/image` optimization.

`inventory/cloudinary-upload.ts` also implements a separate signed browser-upload abstraction using authorize/finalize callbacks. Tests exercise that abstraction. The current `adapters/live.ts` does not call it: it uses the server-proxied route above. Similarly, `.env.example` includes `CLOUDINARY_SIGNED_UPLOAD_PRESET`, but the live route currently signs explicit parameters and does not read that variable.

No live asset deletion/cleanup workflow is established by this path. An upload may succeed before a later product save fails, leaving an unassociated asset. Namespace and URL validation are implemented; a dedicated persisted upload-intent ownership registry and cleanup process would strengthen the asset lifecycle.

## 12. Gemini integration and route flow

```text
src/app/styling/page.tsx
  -> POST /api/recommendations
  -> currentUser() authentication
  -> recommendations/http.ts input/size validation
  -> server.ts creates service with databaseInventory and optional Gemini provider
  -> inventory.ts loads actual approved/unarchived inventory and availability
  -> gemini.ts interprets preference tags, if configured
  -> engine.ts filters/ranks actual candidates and combines affordable looks
  -> validated response rendered by styling page
```

`server.ts` is explicitly `server-only`. It reads `GEMINI_API_KEY` and `GEMINI_MODEL` and passes them to the provider factory. `gemini.ts` calls the REST `generateContent` endpoint with the key in an `x-goog-api-key` header. The request uses structured output and the response is parsed/validated against the styling-preferences schema.

The model receives occasion, outfit type, colour preference, and jewellery preference. It is instructed not to generate products, identifiers, prices, boutique names, or availability. Its validated style tags influence ranking. The engine determines which products qualify, regardless of the AI's output.

Rules enforce approved boutique, active/unarchived inventory, date-matching availability, fresh availability evidence, positive available units, user constraints, and rental budget. Complete looks must satisfy the combined outfit-plus-accessory budget. Deposits are separate from the recommendation rental budget. The engine returns at most five looks.

Missing keys, provider failure, invalid output, or timeout lead to deterministic preference rules. Missing dates produce DATES_REQUIRED. An unavailable/malformed inventory source produces INVENTORY_UNAVAILABLE with no fabricated products. A valid empty eligible inventory can produce NO_MATCHES. The transport limits JSON bodies to 8 KiB; provider/inventory operations have bounded timeouts.

The current inventory adapter considers up to 200 recent products, derives some outfit/jewellery/style classification from category and catalog text, and checks stock through reservation data. It is a practical rules-assisted recommender, not a trained in-house recommendation model or proof of global optimality across the entire catalog. Checkout always revalidates price and availability.

There is no `/api/gemini` URL and no live results page at `/boutique/recommendations`; `/styling` is the customer-facing entry.

## 13. OOP concepts and design principles

**Is OOP used?** Selected concepts are used, but most application code is functions, React components, plain objects, and TypeScript interfaces.

| Concept | Actual example | Explanation |
| --- | --- | --- |
| Abstraction | `BoutiqueProductService`, `BoutiqueBookingService`, `RecommendationInventoryAdapter`, `StylingPreferenceProvider` | Callers use a contract without knowing HTTP/database/provider details. |
| Encapsulation | Inventory service boundary, recommendation transport, shared auth helpers | Logic and access to dependencies are kept behind focused functions/modules. |
| Polymorphism | Live and mock services injected into providers | Screens can call the same contract with different implementations. |
| Inheritance | `ApiError`, `HttpError`, `ProductServiceError`, `PreferenceError` extend `Error` | Specialized errors carry domain-specific status/reason information. |
| Composition | Layouts, providers, and reusable feature screens | Components and services are combined to build behavior. |
| Dependency injection | Provider `service` prop, recommendation factory, injectable fetch | Tests substitute controlled dependencies without changing consumers. |

Prisma models are schema definitions, not evidence that the application is built from custom domain classes. TypeScript interfaces are compile-time contracts and do not validate runtime input. Zod provides that validation.

The project shows separation of concerns and some SOLID-compatible choices, especially substitutable service contracts and injected dependencies. Do not claim all SOLID principles are comprehensively enforced: the rental server module combines multiple related operations and directly uses Prisma. “MVC-like responsibilities” is acceptable as an analogy, but strict MVC is not the actual Next.js structure.

## 14. SDLC: what can honestly be claimed

The repository supports an **iterative and incremental SDLC**. Formal Scrum, a specific sprint schedule, TDD, CI/CD, and production acceptance require separate evidence.

| SDLC phase | Evidence in the repository |
| --- | --- |
| Requirements | README capabilities, feature contracts, role workflows, module documentation |
| Design | Prisma relations, schemas, service interfaces, API contracts, lifecycle rules |
| Implementation | Feature modules, page/route composition, live adapters, integrations |
| Testing | Unit/service tests, mock adapters, transport tests, HTTP integration suites |
| Deployment preparation | Migrations, build/start commands, provisioning and readiness scripts |
| Maintenance | Versioned migrations, documentation updates, fixes, audit/health facilities |

Suggested answer: “We developed incrementally by module, used contracts and mock services for isolated development, then integrated authentication, APIs, database persistence, and external services. We verified business rules and integration scenarios. The code supports that iterative process; formal sprint ceremonies are a team-process claim we would substantiate separately.”

## 15. Testing and present-day verification

For this preparation, `npm.cmd test` was freshly executed: **56 tests passed, 0 failed, 0 skipped**. This suite covers business rules, recommendation behavior, adapter contracts, image transport, mail/configuration behavior, and reporting. Many boutique tests intentionally exercise fixture adapters; they do not prove live persistence.

Two additional suites exist in `tests/integration/`: `customer-boutique.test.ts` and `modules.test.ts`. They cover cross-role HTTP workflows against a running application and matching disposable database. They create/delete fixtures and must not be pointed at production data.

The existing API guide reports earlier successful integration, typecheck, lint, production build, Cloudinary, and Gemini checks. Those are historical reports. They were not rerun for this documentation task. No new live SMTP delivery or browser interaction result is claimed here.

Useful commands for a developer:

```powershell
npm.cmd run lint
npx.cmd tsc --noEmit --incremental false
npm.cmd test
npm.cmd run build
npm.cmd run check:local
```

The review preparation adds documentation only and preserves pre-existing source edits. It does not change business logic, migrate the database, seed records, provision accounts, or upload assets.

## 16. Setup and run as a new developer

### Prerequisites

- Git, Node.js **20.9 or newer**, and npm.
- Repository access and a terminal opened in its root directory.
- A development PostgreSQL database, such as a Neon development database/branch, with permission to apply migrations.
- Cloudinary account credentials for image upload and required readiness checks.
- Optional Gemini credentials/model, Google OAuth credentials, and SMTP configuration for those features.

The following commands use Windows PowerShell and `npm.cmd`/`npx.cmd`. On macOS/Linux use `npm`/`npx`; copy the environment file using your shell's normal copy command.

### Step 1: obtain and install

```powershell
# Clone using your team's actual repository URL, then enter its folder.
git clone <your-repository-url>
cd rentique
node --version
npm.cmd ci
Copy-Item .env.example .env.local
```

The angle-bracket repository URL is a placeholder to replace, not a literal command argument. If you already have this checkout, start in `D:\Rentique\rentique` and skip cloning. Keep an existing configured `.env.local`; do not overwrite it with the blank template.

### Step 2: configure the environment

Example values below are placeholders and must be replaced. Never commit actual credentials.

```dotenv
DATABASE_URL="postgresql://USER:PASSWORD@YOUR_NEON_HOST/DATABASE?sslmode=require"
AUTH_SECRET="REPLACE_WITH_A_RANDOM_SECRET_AT_LEAST_32_CHARACTERS"
APP_URL="http://localhost:3000"
ADMIN_EMAIL="your-separate-admin@example.com"
REQUIRE_EMAIL_VERIFICATION=false

CLOUDINARY_CLOUD_NAME="YOUR_CLOUD_NAME"
CLOUDINARY_API_KEY="YOUR_API_KEY"
CLOUDINARY_API_SECRET="YOUR_PRIVATE_API_SECRET"

# Optional styling preference interpretation; configure both together.
GEMINI_API_KEY="YOUR_PRIVATE_GEMINI_KEY"
GEMINI_MODEL="YOUR_ACCOUNT_SUPPORTED_MODEL_ID"

# Optional Google OAuth; configure both together.
AUTH_GOOGLE_ID="YOUR_GOOGLE_CLIENT_ID"
AUTH_GOOGLE_SECRET="YOUR_GOOGLE_CLIENT_SECRET"

# Optional recovery and notification delivery.
SMTP_HOST="YOUR_SMTP_HOST"
SMTP_PORT=587
SMTP_USER="YOUR_SMTP_USER"
SMTP_PASSWORD="YOUR_SMTP_PASSWORD_OR_APP_PASSWORD"
EMAIL_FROM="YOUR_SENDER_ADDRESS"
```

Leave unused optional entries blank instead of copying placeholder credentials into a real `.env.local`. For Neon, copy the full PostgreSQL connection string supplied for the intended development database; preserve its required TLS parameters. The code does not use a separate `DIRECT_URL` variable. Never paste the connection URL into chat or frontend code.

Generate a random local authentication secret with:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Copy that output privately into `AUTH_SECRET`. Configure `AUTH_TRUST_HOST` only when the application's host/proxy headers are trusted; the isolated local integration recipe explicitly enables it. Follow local readiness output for the intended hosting arrangement.

Cloudinary's live route needs its cloud name, API key, and secret. The template's signed-upload-preset setting belongs to the separate browser-signing design, not the currently used live route. Gemini is optional; without a configured key/model the rules-based recommender can still select from actual inventory. SMTP is optional, but recovery/email features need it. Gmail requires an app password rather than the normal account password. Restart the development server after changing environment values.

### Step 3: generate and migrate

```powershell
npm.cmd run db:generate
npm.cmd run db:migrate
```

Check the selected development database before migrating: this command writes schema changes to the database in `DATABASE_URL`. No database migration was run while preparing this guide.

### Step 4: provision an administrator

Set `ADMIN_EMAIL` first. Choose one option:

```powershell
# If that email already has an account:
npm.cmd run admin:provision

# Or create a new administrator with a generated initial password:
npm.cmd run admin:provision -- --create
```

For a new administrator the script writes credentials to ignored `.tmp/admin-credentials.txt`; it does not print the password. Sign in at `/login?intent=admin`, then change the password at `/change-password`. Use a separate account from the boutique owner. The script avoids overwriting an existing credential file. Public registration cannot choose ADMIN.

### Step 5: readiness and startup

```powershell
npm.cmd run check:local
npm.cmd run dev
```

Open `http://localhost:3000`. The checker is read-only and helps identify configuration, migration, database, provider, or admin problems. The development server stays running until stopped with Ctrl+C.

### Step 6: create data for a demo

Use a customer account, submit a separate boutique account's application, approve it through the admin interface, then add products and images. Alternatively, optional `db:seed` and `db:seed:tifara` commands create sample data and upload images. Run those only intentionally against a development database and image account; they are not read-only setup checks.

For a clean demonstration, keep separate customer, boutique, and admin sessions using separate browser profiles or sign out between roles. Confirm that the boutique is approved and products are active. Choose future rental dates with sufficient stock. Styling results require matching occasion/preferences and available inventory; empty results can be legitimate.

### Production-style run

```powershell
npm.cmd run build
npm.cmd start
```

`start` serves an existing production build; it does not compile your latest edits. A deployment also needs correct host environment values, HTTPS `APP_URL`, matching OAuth callbacks, applied migrations, an admin account, provider checks, backups, and monitoring. Use `npm.cmd run check:deployment` for production readiness. A local HTTP origin is intentionally unsuitable for its production URL check. Hosting is a separate operational step; these commands do not publish a website by themselves.

### HTTP integration testing

Follow `docs/CUSTOMER_BOUTIQUE_API.md` for the full isolated setup. Point both the test application and test runner at the same disposable migrated database, disable real SMTP and Google sign-in, start the application, and set `RENTIQUE_TEST_URL` to that origin. `npm.cmd run test:integration` is meaningful only with the intended test environment; a skipped suite is not a pass against the live project.

### Common setup issues

| Symptom | Check or fix |
| --- | --- |
| PowerShell blocks npm scripts | Use `npm.cmd` and `npx.cmd` as shown. |
| Generated Prisma module missing | Run `db:generate`. |
| Tables missing or schema mismatch | Verify the intended `DATABASE_URL`, then apply committed migrations. |
| Cannot connect to Neon | Check the copied URL, database credentials, TLS parameters, and network access. |
| Login fails | Check account activation, password, rate limit, verification setting, auth secret, and host configuration. |
| Boutique dashboard redirects | Sign in as the right owner and confirm approval. |
| Upload fails | Check Cloudinary credentials, image type/size/count, owner role, and approval. |
| Styling uses rules | Check whether both Gemini key and supported model are configured; this can also be expected fallback. |
| No styling matches | Check inventory, dates, tags, preferences, city, and combined rental budget. |
| Recovery email unavailable | Configure SMTP and valid `APP_URL`; test actual delivery. |
| Product/booking edit returns 409 | Reload the record and retry with its current version or choose available dates/quantity. |
| Environment changes have no effect | Restart Next.js; check that explicit shell values are not overriding the file. |

## 17. Likely review questions and direct answers

**Why Next.js instead of React alone?** React builds components. Next.js adds file-based routing, server rendering/composition, backend HTTP handlers, metadata, and a shared deployment model. Rentique uses these features together.

**Where is the backend?** HTTP entry points are under `src/app/api`; most shared business logic is under `src/features/rentals`, `src/features/admin`, and `src/features/auth`, supported by `src/lib`. There is no separate Express service.

**What is the difference between a page route and an API route?** `/boutique/products` returns the product interface through `page.tsx`. `/api/boutique/products` accepts HTTP methods and returns JSON through `route.ts`.

**How does the frontend talk to the backend?** Mostly same-origin fetch, through `api-client.ts` and live adapters. JSON carries normal business input; FormData carries image files. Server layouts also call authorization helpers directly.

**Does the browser connect to Neon?** No. The server's Prisma client uses `DATABASE_URL`; the browser calls application APIs.

**Is Neon the ORM?** No. Neon hosts PostgreSQL. Prisma is the ORM. Migrations manage schema history.

**How are passwords protected?** bcrypt hashes with cost 12 are stored. Login compares against the hash. Password-reset tokens are separately hashed with SHA-256 and expire after use/time limits.

**How can JWT sessions be revoked?** The user has a `sessionVersion`. Password changes/resets and administrative changes increment it. JWT callbacks compare the stored version with the current database version and invalidate mismatches.

**Can someone change their role in the browser?** A query parameter or modified UI is insufficient. Registration fixes the initial role to CUSTOMER, application submission controls the owner-role transition, and services check database identity/role/ownership.

**Why validate in the backend if the form already validates?** Browser checks help the user, but direct HTTP requests can bypass them. Backend Zod validation and authorization are authoritative.

**How do you prevent double booking?** Compute peak reservations for the requested interval and validate capacity inside a Serializable booking transaction. Conflicting concurrent requests can return 409.

**Why not decrement product quantity when a request is made?** Rentals use time-bound reservations. The total variant quantity is capacity, while overlapping active bookings determine availability for a date range.

**Why integer paise?** Exact integer arithmetic avoids floating-point currency rounding. Prices and booking snapshots retain minor units throughout calculations.

**Does Gemini decide whether an outfit is available?** No. Database reservation checks determine availability. Gemini supplies validated style tags for ranking real candidates.

**What happens if Gemini fails?** Preference selection falls back to deterministic rules. Database/inventory failure is handled separately and does not generate fictional products.

**Are product images stored in PostgreSQL?** Image bytes are in Cloudinary. PostgreSQL stores public IDs, secure URLs, alt text, and order.

**What OOP is present?** Interfaces, interchangeable adapters, encapsulated service logic, injected dependencies, and error inheritance. The codebase is predominantly functional React/TypeScript.

**Is this MVC?** It has presentation, HTTP handling, domain logic, and persistence responsibilities, but the accurate description is a feature-oriented modular monolith rather than strict MVC.

**Was Agile followed?** The repository supports incremental development and verification. Formal Scrum practices should be claimed only with team records.

**Are refunds automatic?** No. Refund status is manually recorded. There is no financial transfer integration.

**Does revenue mean money collected?** No. The implemented boutique reporting counts completed rental charges and excludes deposits. It is operational rental reporting, not a reconciled payment ledger.

**Is every feature production verified?** No such broad claim is established. The fresh unit/service run passed 56 tests. Historical documents report additional checks; current deployment, browser behavior, and actual provider delivery require their own verification.

## 18. Final preparation and code demonstration

For a short review, rehearse slides 1–13, 15, 17–19, and 23–26; keep the others for follow-up questions. For a longer review, present all slides and demonstrate one complete rental.

Open these files in order during a code walkthrough:

1. `package.json`: framework versions and scripts.
2. `src/app/boutique/dashboard/page.tsx` and `layout.tsx`: page composition and access guard.
3. `src/features/boutiques/inventory/provider.tsx` and `adapters/live.ts`: UI service boundary and network calls.
4. `src/app/api/boutique/products/route.ts`: HTTP-method routing.
5. `src/features/rentals/server.ts`: product persistence and booking transaction.
6. `src/auth.ts` and `src/lib/api.ts`: authentication versus authorization.
7. `prisma/schema.prisma` and `src/lib/prisma.ts`: models and client connection.
8. `src/app/api/boutique/images/route.ts`: actual Cloudinary path.
9. `src/features/recommendations/server.ts`, `gemini.ts`, `inventory.ts`, `engine.ts`: AI boundary and real inventory selection.

Avoid presenting these inaccurate statements: “all pages are client-side,” “the database Session table means database sessions are enabled,” “registration directly creates an owner,” “Gemini generates our catalog,” “Cloudinary uploads currently go directly from browser to provider,” “all tests exercise live APIs,” “refund status transfers money,” or “the historical Member 3 scaffold is the current application.”

Source priority for the review is current executable source, current root/setup documentation, and then historical handoff notes. The explanations of this Next.js version were checked against its installed layouts/pages, server/client components, and route-handler guides under `node_modules/next/dist/docs/`.
