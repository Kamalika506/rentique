# Rentique — Full Stack Development Review

Slide-by-slide presentation with speaker notes. Prepared from the current repository on 15 October 2026. Replace Member 1/2/3 with your names after confirming the proposed allocation. Detailed technical answers and setup instructions are in [REVIEW_STUDY_GUIDE.md](REVIEW_STUDY_GUIDE.md).

---

## Slide 1 — Rentique

**A fashion rental marketplace connecting customers and boutiques**

Full stack development review · Team: [Member 1], [Member 2], [Member 3]

**Speaker notes:** “Rentique brings outfit discovery, date-based rental requests, boutique operations, and platform administration into one application. We built the interface and APIs with Next.js and persist business data in PostgreSQL using Prisma.”

---

## Slide 2 — Occasion wear needs a practical rental workflow

- Customers need outfits for specific occasions without purchasing every item.
- Boutiques need visibility into inventory, availability, pickups, and returns.
- Both need reliable prices, booking status, and accountability.

**Speaker notes:** “Our problem statement is to build a centralized fashion rental platform where customers can discover and request available outfits, while boutiques manage stock and the rental lifecycle. Administrators oversee participation and moderation. These are the needs our design addresses; we have not measured market impact.”

---

## Slide 3 — Three roles share one platform

| Customer | Boutique owner | Administrator |
| --- | --- | --- |
| Browse and filter outfits | Apply for approval | Approve or reject boutiques |
| Save wishlist and request rentals | Manage products and images | Manage users and categories |
| Get styling suggestions | Process pickups and returns | Moderate products and reviews |
| Track rentals and review | View calendar and analytics | Monitor bookings and activity |

**Speaker notes:** “Roles control actions. Boutique approval is an additional condition: having the boutique-owner role does not automatically grant access to inventory management.”

---

## Slide 4 — Work can be divided by feature ownership

| Member | Primary responsibility | Shared integration |
| --- | --- | --- |
| 1 | Customer marketplace and admin interface | Discovery, approval UI, styling placement |
| 2 | Shared backend, authentication, and database | API contracts, authorization, persistence |
| 3 | Boutique workspace, rental UI, analytics, styling engine | Live adapters, booking contracts, provider integration |

**Speaker notes:** “This allocation follows the broad responsibilities described in the historical handoff, with a proposed ownership split for the integrated result. It is not a verified contribution record. We should replace it with our actual work before presenting. All three members share integration testing and review.”

---

## Slide 5 — A customer moves from discovery to a completed rental

Browse → Select outfit and size → Choose dates → Check price and stock → Request rental → Boutique confirms → Pickup → Return and inspection → Complete → Review

- Sign-in is required for availability checks and rental requests.
- The server recalculates price and rechecks capacity at submission.
- Customer and boutique views read the same persisted bookings.

**Speaker notes:** “Checking availability is only a quote. Another customer may reserve stock before submission, so the booking request performs its own authoritative check. Payment and pickup are arranged with the boutique.”

---

## Slide 6 — Boutique access starts with administrator approval

Application form → Account creation/sign-in → Submit application → PENDING → Administrator decision → APPROVED workspace or REJECTED feedback

- Submission creates or updates the boutique and sets the account role to `BOUTIQUE_OWNER`.
- Current form signs out after submission and asks the owner to sign in again.
- Rejected applications can be resubmitted.

**Speaker notes:** “Public account registration initially creates a CUSTOMER. The application service changes that role transactionally. Until approval, management guards direct owners to the application-status page.”

---

## Slide 7 — Next.js hosts both the interface and the backend

Browser → Next.js pages and React components → `/api/*` route handlers → Domain services → Prisma → PostgreSQL

Server integrations: Cloudinary for images · Gemini for styling tags · SMTP for email

**Speaker notes:** “This is a feature-oriented modular monolith. Frontend and backend are organized separately within one deployable application. We do not run a separate Express server. The external providers remain behind server-side boundaries.”

---

## Slide 8 — The stack matches the application’s needs

| Technology | Reason |
| --- | --- |
| Next.js 16.4, React 19.3, TypeScript | Shared application, file routing, reusable UI, typed contracts |
| Tailwind 4, CSS Modules, Base UI | Styling and reusable accessible UI primitives |
| Prisma 6 and PostgreSQL / Neon | Relations, transactions, migrations, typed database access |
| Auth.js and bcryptjs | Sessions, optional Google sign-in, password hashing |
| Zod and React Hook Form | Runtime validation and form state |

**Speaker notes:** “TypeScript improves development-time safety; Zod validates untrusted runtime input. PostgreSQL fits relationships such as customer–booking–product and the need for transactional stock checks. Neon is the hosting service for PostgreSQL when its connection string is configured.”

---

## Slide 9 — Files and folders define page routes

| File | URL or responsibility |
| --- | --- |
| `src/app/page.tsx` | `/` |
| `src/app/login/page.tsx` | `/login` |
| `src/app/marketplace/[productId]/page.tsx` | `/marketplace/<productId>` |
| `src/app/boutique/dashboard/page.tsx` | `/boutique/dashboard` |
| `src/app/admin/layout.tsx` | Shared admin authorization and shell |

**Speaker notes:** “`page.tsx` is a page entry point. `layout.tsx` wraps nested pages. Brackets define dynamic parameters. A README in a route folder does not create a page, and a query string does not change a user’s permissions.”

---

## Slide 10 — Rendering and interactivity have distinct boundaries

- Pages and layouts are Server Components by default.
- Files with `"use client"` support state, events, context, and browser APIs.
- Page entries often compose larger screens from `src/features`.
- Protected layouts use server guards and `Suspense` boundaries.

**Speaker notes:** “For example, the dashboard page imports `BoutiqueDashboard`, while its layout uses `AccountGuard boutique approved`. Client Components can also have initial HTML rendered on the server. The directive defines the client boundary; it does not mean the component only ever renders in a browser.”

---

## Slide 11 — API files route requests to domain services

`src/app/api/boutique/products/route.ts`

| HTTP method | Operation | Service |
| --- | --- | --- |
| GET | List or read inventory | `boutiqueProducts` |
| POST | Create product | `saveProduct` |
| PUT | Edit product | `saveProduct` |
| PATCH | Archive or restore | `archiveProduct` |

**Speaker notes:** “These functions live in `src/features/rentals/server.ts`. The shared `endpoint` wrapper handles request-time execution, common errors, no-store responses, and origin checking for writes. Services enforce role, approval, ownership, and business rules.”

---

## Slide 12 — One product edit crosses the complete stack

Product editor → Product provider → Live service adapter → `PUT /api/boutique/products` → Validation and ownership → Version-checked transaction → PostgreSQL → Updated UI

- Request contains `{id, version, input}`.
- Server derives the boutique from the authenticated user.
- A stale version returns `409 Conflict`.

**Speaker notes:** “The request is serialized as JSON by `src/lib/api-client.ts`. Prisma updates product fields, the supported size variant, and image metadata atomically. The database stores prices as integer paise. Archiving preserves history.”

---

## Slide 13 — Authentication identifies the user; authorization controls access

Email/password → Auth.js credentials handler → User lookup → bcrypt comparison → JWT session → Role-based navigation

- `src/auth.ts` configures providers and callbacks.
- `src/app/api/auth/[...nextauth]/route.ts` exposes GET and POST.
- Services recheck the active account and permitted role.
- `sessionVersion` supports revoking existing sessions.

**Speaker notes:** “The password is hashed with bcrypt cost 12 at registration. Auth.js manages the JWT session in cookies. Although the Prisma schema has a Session model, the configured session strategy is JWT. Google sign-in is enabled only when both Google credentials exist.”

---

## Slide 14 — Password recovery uses expiring, single-use tokens

Request email → Generate random token → Store SHA-256 token hash → Email link → Validate purpose and expiry → Consume token → Update account

- Password-reset expiry: 30 minutes.
- Email-verification expiry: 24 hours.
- Password changes increment `sessionVersion`.

**Speaker notes:** “The database holds a hash rather than the emailed raw token. Consumption and account modification happen transactionally. Email verification is configurable, and SMTP must be configured and tested before requiring it.”

---

## Slide 15 — Neon stores relational business data through Prisma

`DATABASE_URL` → Prisma PostgreSQL datasource → Shared Prisma client → Queries and transactions → Neon-hosted PostgreSQL

- Schema: `prisma/schema.prisma`
- Connection/client: `src/lib/prisma.ts`
- CLI configuration: `prisma.config.ts`
- Schema history: `prisma/migrations/`

**Speaker notes:** “Neon is the database host, PostgreSQL is the database engine, and Prisma is the ORM. There is no Neon browser SDK or `/api/neon` route. The same application can use another compatible PostgreSQL host by changing configuration.”

---

## Slide 16 — Relationships preserve ownership and rental history

User → Boutique → Product → ProductVariant

User → Booking → BookingItem → ProductVariant

Booking → Events, Inspection, ManualRefundRecord, Review

- Unique emails and foreign keys support consistency.
- Product images store Cloudinary identifiers and URLs.
- Booking items preserve product and price snapshots.

**Speaker notes:** “The owner relation is one boutique per owner. Products can have multiple variants in the schema, although the current inventory editor supports one size per listing. Snapshots preserve what was booked even after catalog edits.”

---

## Slide 17 — Booking creation protects stock and prices

- Reservation window: `[pickupAt, returnAt)`.
- Reserving statuses: PENDING, CONFIRMED, PICKED_UP.
- Capacity uses peak simultaneous reserved quantity.
- Booking creation uses a Serializable transaction.
- Price comes from the database, never the client total.

**Speaker notes:** “If a size has three units and two are already reserved at peak overlap, only one remains. A conflict or serialization failure produces a 409 response for refresh/retry. Rental days round partial days upward; requests are limited to a future period of at most 90 days.”

---

## Slide 18 — Cloudinary holds images; PostgreSQL holds metadata

Image manager → Live adapter → `POST /api/boutique/images` → Server authorization and signature → Cloudinary upload → Verified asset metadata → Product save

- Up to six JPG, PNG, or WebP files, each up to 5 MiB.
- Server generates a boutique-scoped public ID.
- Product save stores public ID, secure URL, alt text, and position.

**Speaker notes:** “The live implementation proxies uploads through the server. A separate signed browser-upload abstraction exists, but it is not the live provider path. The API secret stays on the server. Cloudinary returns the CDN URL used by the interface.”

---

## Slide 19 — Gemini influences ranking while rules enforce constraints

`/styling` → `POST /api/recommendations` → Database inventory → Gemini preference tags or rules fallback → Eligibility and ranking → Real product results

- AI receives occasion and preference fields.
- AI does not create product IDs, prices, or availability.
- Dates, budget, approval, and stock are enforced by code.
- Provider failure falls back to deterministic rules.

**Speaker notes:** “`gemini.ts` makes the REST request; `server.ts` injects private configuration; `inventory.ts` loads actual products; `engine.ts` validates and selects looks. Missing or broken inventory does not become fictional recommendations. Availability is checked again at booking.”

---

## Slide 20 — The booking lifecycle drives operations and reporting

PENDING → CONFIRMED → PICKED_UP → RETURNED → Inspection → COMPLETED

- Rejection and cancellation follow allowed transitions.
- Actions use record versions and append booking events.
- Completed rental charges count as revenue; deposits do not.
- Manual refund records describe status without transferring funds.

**Speaker notes:** “`allowedActions` in `rentals/rules.ts` defines lifecycle permissions. Completion requires inspection. Dashboard and analytics read persisted records; the analytics trend groups bookings by creation month in the reporting timezone.”

---

## Slide 21 — Architecture uses interfaces, adapters, and focused services

- Feature modules group interface, contracts, and related logic.
- Service interfaces separate screens from transport.
- Live and mock adapters implement common contracts.
- Factories inject inventory and preference providers for tests.
- Error classes extend JavaScript `Error`.

**Speaker notes:** “This is primarily functional TypeScript and React, with selected object-oriented techniques. Encapsulation appears in service boundaries, abstraction in interfaces, polymorphism in interchangeable adapters, and inheritance in error classes. We should not describe the entire project as classical OOP or strict MVC.”

---

## Slide 22 — The repository supports an iterative SDLC

Requirements → Contracts and schema → Feature implementation → Integration → Verification → Deployment preparation → Maintenance

- Module documentation and migrations record design changes.
- Mock adapters allow isolated feature development.
- Unit/service tests and HTTP integration suites cover behavior.
- Readiness scripts support configuration checks.

**Speaker notes:** “An iterative, incremental process is supported by the repository evidence. Formal Scrum ceremonies, sprint velocity, production deployment, and user acceptance sign-off are not established by the code. Only claim those if our team has separate records.”

---

## Slide 23 — Current verification has a clear evidence boundary

- Freshly run for this review: **56 unit/service tests passed**.
- Repository includes two HTTP integration suites.
- Integration tests require an isolated, migrated test database.
- Earlier documentation reports build, lint, typecheck, and provider checks.

**Speaker notes:** “The fresh test result covers the existing unit/service suite, including mock adapter and transport tests. It does not by itself prove live database, provider delivery, or browser behavior. The earlier integration and provider results are historical documentation, not tests rerun for this presentation.”

---

## Slide 24 — A new developer can start from the repository

1. Install Node.js 20.9+ and run `npm.cmd ci`.
2. Copy `.env.example` to `.env.local` and configure providers.
3. Run `db:generate`, then `db:migrate` against a development database.
4. Set `ADMIN_EMAIL` and provision a separate admin account.
5. Run `check:local`, then `dev`; open `http://localhost:3000`.

**Speaker notes:** “The detailed guide includes commands, environment variables, optional seeds, production startup, and troubleshooting. Migrations apply existing SQL to the database; client generation only generates access code. Never copy over a teammate’s configured environment file.”

---

## Slide 25 — Demonstrate one rental across the three roles

Customer discovery → Boutique application and approval → Product upload → Availability quote and request → Boutique lifecycle → Customer review → Admin moderation

**Speaker notes:** “Use separate browser profiles or sign out between accounts. Use future dates and known inventory. Show one API request in the network panel, the matching route and service files, and the resulting database record. If a provider is unavailable, explain the actual error or fallback; avoid presenting fixture data as live behavior.”

---

## Slide 26 — Rentique connects discovery with rental operations

- One role-aware application serves customers, boutiques, and administrators.
- Server-side rules protect stock, ownership, and historical prices.
- External providers handle media, optional AI interpretation, and email.
- Next steps: payment integration, richer variant editing, media cleanup, and stronger operational verification.

**Speaker notes:** “The central engineering result is an integrated rental workflow with shared persistence and explicit authorization. Our next improvements build on that foundation. We can now demonstrate the workflow and explain any layer from page routing to database transaction.”

---

## Source map for preparation

All implementation claims derive from repository source, principally:

- `package.json`, `README.md`, `.env.example`, `next.config.ts`
- `src/app`, `src/auth.ts`, `src/lib/api.ts`, `src/lib/api-client.ts`
- `src/features/rentals/{server,workspace-server,rules,availability,records}.ts`
- `src/features/boutiques/adapters/live.ts` and boutique providers/screens
- `src/features/recommendations/{server,http,gemini,inventory,engine}.ts`
- `src/features/admin/server.ts`, `src/features/auth/recovery.ts`
- `prisma/schema.prisma`, `prisma.config.ts`, `src/lib/prisma.ts`
- `docs/CUSTOMER_BOUTIQUE_API.md`, `docs/MEMBER3_IMPLEMENTATION.md` (historical ownership clues only)
- Installed Next.js guides under `node_modules/next/dist/docs/01-app/01-getting-started/`: layouts/pages, server/client components, and route handlers.

This is a Markdown presentation manuscript, not an exported PowerPoint file. Speaker notes are for rehearsal and can be placed in the notes area when transferring slides.
