# Rentique: end-to-end review handbook

Prepared by inspecting the working source on 23 October 2026 for the review on 24 October. Start with this handbook: older review documents describe an earlier reservation flow. File paths are relative to the repository root. This is a code explanation, not evidence that any particular person authored a file or that configured cloud services were tested live today.

## 1. Your opening explanation

“Rentique is a fashion rental marketplace with three roles: customer, boutique owner, and administrator. Customers discover outfits, choose sizes and rental dates, review an estimate, and request a reservation. Approved boutiques maintain inventory and handle confirmation, pickup, return, and inspection. Administrators approve boutiques and manage platform resources.

“The frontend uses React and TypeScript inside the Next.js App Router. Next.js also runs our backend HTTP route handlers. Prisma maps application operations to a PostgreSQL database, which can be hosted on Neon. Cloudinary stores uploaded images. Auth.js manages sign-in and sessions. Optional Gemini integration interprets styling preferences, while application rules select actual inventory.”

The current customer flow collects no payment. A reservation request still needs boutique confirmation. A refund record is bookkeeping; it does not transfer funds.

Be accurate about AI assistance if asked. Understanding and demonstrating the implementation is achievable; this handbook does not establish manual authorship. Each teammate should be able to explain and make a small change to every layer.

## 2. Stack: what each technology does and why

Declared versions come from `package.json`, rather than a fresh dependency audit.

| Technology | Role in this project | Reason and tradeoff |
|---|---|---|
| Next.js 16.4.0 | URL routing, layouts, server rendering infrastructure, backend handlers, build/runtime | Keeps UI and backend in one repository and deployable application. Requires understanding server/client boundaries and caching. |
| React 19.3.0 | Components, events, state, hooks, context | Reusable interfaces with updates driven by state. React alone does not provide this project's complete backend and routing structure. |
| TypeScript 5 | Types for components, service contracts, requests and records | Helps catch incompatible code during development. Types disappear at runtime, so incoming requests still need validation. |
| Tailwind CSS 4 and CSS Modules | Utility styles and feature styles | Fast consistent styling plus local module class names. See `globals.css` and feature `.module.css` files. |
| Prisma 6.19.3 dependency range | ORM, generated typed client, schema and migrations | Easier relational queries and transactions. Developers still need SQL, constraints, and concurrency knowledge. |
| PostgreSQL / Neon | Relational persistent storage / managed hosting | Foreign keys, uniqueness and transactions suit interconnected rentals. Neon is a hosting choice, PostgreSQL is the database engine. |
| Auth.js / next-auth 5 beta | Credential sign-in, optional Google OAuth, JWT session integration | Central authentication integration; authorization still belongs in application code. Beta dependency status is a maintenance consideration. |
| bcryptjs | Password hashing and comparison | Password verification without storing plaintext passwords. Hashing differs from reversible encryption. |
| Zod 4 | Runtime request and form validation | Protects the server against malformed input regardless of browser controls. |
| React Hook Form and resolvers | Form handling where used in features | Coordinates fields, errors, and schema validation. Not every form uses this library. |
| Cloudinary REST API | Image storage and delivery | Avoids storing large image binaries in business tables; introduces an external provider dependency. |
| Gemini REST integration | Optional styling preference interpretation | Helps interpret user intent; deterministic code retains inventory and eligibility control. |
| Nodemailer | SMTP email delivery | Verification and recovery email integration requires working mail configuration. |
| Node.js, npm, tsx, ESLint | Runtime, dependencies, TypeScript scripts/tests, linting | Development and execution tools, rather than end-user features. |

### How is Next.js better than React for Rentique?

Say: “Next.js is a framework built on React, so we use both. Rentique needs public catalog routes, nested account workspaces, authenticated backend endpoints, and server-only database credentials. Next.js supplies conventions for those concerns in one application. With a standalone React setup we would assemble a router and a separate backend or equivalent server infrastructure.”

Do not say React cannot support a full stack system, or that Next.js automatically makes every page faster or secure. This project's marketplace and product detail screens are client components that fetch data through HTTP APIs. Although Next.js supports server data fetching and SEO-friendly rendering, these particular screens do not demonstrate a fully server-rendered product catalog.

### Browser, server and cloud

```text
Browser: React UI, events, state, URL navigation
    | same-origin HTTP requests and JSON / multipart files
Next.js server: route handlers, authentication, validation, business rules
    | Prisma queries / transactions          | signed HTTP upload
PostgreSQL hosted on Neon                   Cloudinary image service
    | relational records                    | image bytes and delivery URL
    +---------------- JSON results ----------+
Browser updates its React state and renders the result
```

An import connects modules within a program. `fetch` crosses an HTTP boundary. A Prisma call crosses the database boundary. These are three different kinds of connection.

## 3. Folder and file map

| Location | What belongs here |
|---|---|
| `src/app/` | Next.js page routes, nested layouts, API routes, global CSS and favicon. Folder names determine URLs when the appropriate special file exists. |
| `src/app/api/` | Server HTTP entry points. A `route.ts` exports methods such as `GET` and `POST`. |
| `src/features/marketplace/` | Product cards/detail, customer home, wishlist context, rental list, reservation review, review form and catalog types. |
| `src/features/rentals/` | Shared rental backend: catalog queries, product persistence, booking lifecycle, quotes, reservation creation, stock calculations and record serializers. |
| `src/features/boutiques/` | Owner UI, onboarding, product editing, booking management, calendar, storefront settings and transport adapters. |
| `src/features/admin/` | Administrator screens, server operations, categories and notifications support. |
| `src/features/auth/` | Account guards, account navigation, validation contracts and recovery logic. |
| `src/features/recommendations/` | Styling contracts, HTTP boundary, optional Gemini provider, database inventory and recommendation engine. |
| `src/features/analytics/` | Analytics interface, calculations and service contracts. |
| `src/features/notifications/` | Server notification and reservation-job support. |
| `src/components/` | Shared layout components, session provider and UI building blocks. |
| `src/lib/api-client.ts` | Browser HTTP helper: fetch, JSON parsing and typed HTTP errors. |
| `src/lib/api.ts` | Server endpoint wrapper, API errors, signed-in user and boutique authorization helpers. |
| `src/lib/prisma.ts` | Shared Prisma client instance, reused during development hot reload. |
| `src/lib/mail.ts`, `rate-limit.ts` | Email and request throttling utilities. |
| `src/auth.ts` | Central Auth.js configuration and credential/session callbacks. |
| `src/types/next-auth.d.ts` | Type augmentation for session fields. Types do not grant permissions. |
| `src/generated/prisma/` | Generated database access code; regenerate from schema rather than manually editing it. |
| `prisma/schema.prisma` | Database models, enums, relationships, indexes and constraints. |
| `prisma/migrations/` | Versioned SQL changes to the database. |
| `prisma/seed.ts`, `scripts/` | Sample data, admin provisioning, readiness checks and maintenance jobs. |
| `tests/` | Unit/service tests; `tests/integration/` contains HTTP integration suites. |
| `public/` | Static publicly served assets. Never put secrets here. |
| `docs/` | Planning, API explanations and study material; source is authoritative when documents differ. |
| `package.json` | Scripts and declared dependencies. Lockfile records dependency resolution. |
| `tsconfig.json` | TypeScript configuration, including import-path aliases. `@/` refers into `src/`. |
| `next.config.ts` | Enables cache components and partial prefetching, allows Cloudinary remote images, configures CSS tooling. |
| `prisma.config.ts` | Prisma CLI schema/migration paths and environment loading. |
| `.env.example` | Configuration template. Actual environment files contain private values and should not be shown during the review. |

`.next` and `node_modules` are build output and installed dependencies. They are not where you implement project features. Installed Next.js documentation lives under `node_modules/next/dist/docs/`; this project's agent instructions require consulting it before code changes.

## 4. Routing from first principles

| URL | File |
|---|---|
| `/` | `src/app/page.tsx` |
| `/marketplace` | `src/app/marketplace/page.tsx` |
| `/marketplace/abc123` | `src/app/marketplace/[productId]/page.tsx` |
| `/boutiques/abc123` | `src/app/boutiques/[id]/page.tsx` |
| `/basket` | `src/app/basket/page.tsx` |
| `/my-rentals` | `src/app/my-rentals/page.tsx` |
| `/boutique/products/new` | `src/app/boutique/products/new/page.tsx` |
| `/boutique/products/abc123/edit` | `src/app/boutique/products/[id]/edit/page.tsx` |
| `/boutique/bookings/abc123` | `src/app/boutique/bookings/[id]/page.tsx` |
| `/admin/boutiques` | `src/app/admin/boutiques/page.tsx` |
| `/api/products` | `src/app/api/products/route.ts` |
| `/api/auth/...` | `src/app/api/auth/[...nextauth]/route.ts` |

`[productId]` is a dynamic segment: many product URLs use one page implementation. `[...nextauth]` catches multiple remaining path segments. `?city=Pune&page=2` is a query string, read with search parameter APIs; it does not create a different page file.

`page.tsx` returns interface elements. `route.ts` handles HTTP requests and responses. `layout.tsx` wraps nested pages through its `children` prop. The root layout imports global CSS and provides session and wishlist context. A deeper layout adds guards or workspace providers.

`Link` links to another URL. `router.push(...)` navigates programmatically, such as when filters change. A component import only makes another component/function available; it does not itself perform navigation.

Pages/layouts default to Server Components. A `"use client"` boundary enables hooks, event handlers and browser APIs in its client module tree. Client Components can participate in initial server rendering; the directive does not mean they execute exclusively in the browser. `useEffect` runs on the client, which is where these catalog requests start.

## 5. Demonstration A: trace the marketplace

Open `/marketplace?city=Pune` and show these files in order:

1. `src/app/marketplace/page.tsx`: `MarketplacePage` places `Marketplace` inside `Suspense`. `useSearchParams()` reads filters. `useEffect` builds `/api/products?...&paged=1&pageSize=12` and calls `api<CatalogPage>(...)`.
2. `src/lib/api-client.ts`: `api<T>` uses `fetch`, parses response JSON and throws `HttpError` for unsuccessful status codes. `T` describes the expected TypeScript shape; it does not validate response JSON at runtime.
3. `src/app/api/products/route.ts`: the entire route is essentially:

   ```ts
   import { endpoint } from "@/lib/api";
   import { catalog } from "@/features/rentals/server";
   export const GET = endpoint(catalog);
   ```

4. `src/lib/api.ts`: `endpoint` returns an async HTTP handler. It waits for a live connection, runs the supplied function, serializes success with `Response.json`, and converts known failures to JSON errors.
5. `src/features/rentals/server.ts`: `catalog(request)` reads URL filters, builds Prisma conditions, excludes archived products and unapproved boutiques, queries records and returns serialized catalog data. Pagination uses `skip`, `take`, and a count query. Date filtering also checks stock and has a search-size limit.
6. `src/lib/prisma.ts`: the shared `PrismaClient` sends database operations using configured PostgreSQL connectivity.
7. `prisma/schema.prisma`: show `Product`, `ProductVariant`, `ProductImage`, and `Boutique` relationships.
8. Return to the page: `setResponse` stores the result; React renders `ProductCard` for each item. Loading and error states are explicit. An `AbortController` cancels obsolete requests when filters change or the effect is cleaned up.

Say: “The browser does not read Neon directly. It requests our API, which applies visibility rules before querying the database.”

## 6. Demonstration B: product URL to a real reservation

This is the most valuable flow to rehearse. Use an existing product ID and future dates.

### Product loading

`src/app/marketplace/[productId]/page.tsx` contains:

```tsx
export { default } from "@/features/marketplace/product-details";
```

It exposes the feature component as the page's default export. Open `src/features/marketplace/product-details.tsx`: it reads the product route parameter and requests `/api/products?id=...`, plus product reviews. The API uses the same `catalog` function, whose ID branch returns one product or 404.

### Quote request

The customer selects variant, quantity, pickup, and return. The product screen calls `POST /api/quotes`; the basket page uses the same quote endpoint for multiple items.

Illustrative payload; use actual IDs and future timestamps in a live demonstration:

```json
{
  "items": [{ "variantId": "actual-variant-id", "quantity": 1 }],
  "pickupAt": "2026-10-27T04:30:00.000Z",
  "returnAt": "2026-10-29T04:30:00.000Z"
}
```

`src/app/api/quotes/route.ts` exports `POST = endpoint(createQuote, 201)`. Open `src/features/rentals/customer-server.ts` and explain:

- `currentUser("CUSTOMER")` requires a permitted signed-in user. This helper also permits boutique owners in the customer role context; owners still cannot rent their own stock.
- Zod selection contracts validate the input.
- Current quote rules require pickup at least 24 hours ahead, within 180 days, and a rental duration no longer than 14 days.
- Every selected variant must be public and available; all items must come from one boutique.
- Stock checking includes a 24-hour turnaround after return.
- Prices come from database product/variant records. The browser cannot choose its own total.
- The server computes a fingerprint covering lines, versions, dates and shop terms/hours, and stores a `BookingQuote` with a five-minute expiry in a Repeatable Read transaction.
- A quote does not reserve stock.

The response supplies a quote ID, line prices, total, dates, shop details, terms and expiry. `ReservationReview` displays these and asks the customer to accept the terms.

### Booking request

In `src/features/marketplace/reservation-review.tsx`, show the actual request:

```ts
api("/api/bookings", {
  ...jsonRequest("POST", { quoteId: quote.quoteId, acceptedTerms: true }),
  headers: {
    "Content-Type": "application/json",
    "Idempotency-Key": key
  }
});
```

The component generates `key` with `crypto.randomUUID()`. Reusing the same key for retries lets the backend recognize the same logical submission.

`src/app/api/bookings/route.ts` imports `createBooking` from `rentals/server.ts`. Follow that import: `server.ts` re-exports `createReviewedBooking` from `customer-server.ts` under the name `createBooking`. This is a useful example of why you must follow exports rather than guess from function names.

`createReviewedBooking` performs these operations:

1. Requires verified email, valid contact phone, accepted terms and a valid idempotency key.
2. Starts a Serializable transaction with a 15-second timeout.
3. Locks the customer row and checks the current account again.
4. Looks for a previous booking with this customer and request key. It returns that booking for the same quote, or rejects key reuse with a different quote.
5. Loads an unexpired quote belonging to that customer.
6. Locks selected variant rows in sorted order, helping avoid inconsistent lock ordering.
7. Enforces a maximum of three currently pending requests.
8. Recalculates stock and the quote fingerprint. A changed price, item detail or term requires a new review.
9. Creates `Booking`, nested `BookingItem` snapshots and the initial `BookingEvent`. It stores the policy snapshot, a 12-hour request expiry and 1,440-minute turnaround. The current customer flow writes zero deposit.
10. Removes matching basket entries and writes booking notifications within the transaction.
11. Serializes the booking for JSON. The UI receives its ID and shows the result.

The transaction commits related writes together or rolls them back. Row locks plus serializable isolation address competing submissions; conflict handling can return an existing idempotent result or a 409 requiring refresh/retry. They are not a promise that every request will succeed.

The raw locking queries use SQL placeholders with separately supplied IDs. Despite the method name `$queryRawUnsafe`, these particular calls do not concatenate user input into SQL. Explain the actual parameterized usage.

## 7. REST and HTTP: how your APIs are created

A REST-style API exposes resources through URLs and uses HTTP methods/statuses to communicate operations. This application has resource endpoints plus action-oriented operations, so describe it as REST-style HTTP APIs rather than claiming perfect REST uniformity.

| Operation | Current endpoint and method | Handler / source |
|---|---|---|
| Browse or read product by query ID | `GET /api/products` | `catalog`, `rentals/server.ts` |
| Read owner products | `GET /api/boutique/products` | `boutiqueProducts`, same module |
| Create product | `POST /api/boutique/products` | `saveProduct`, status 201 |
| Save edited product | `PUT /api/boutique/products` | `saveProduct` |
| Archive/restore product | `PATCH /api/boutique/products` | `archiveProduct` |
| Upload files | `POST /api/boutique/images` | Upload implementation directly in route file |
| Read/add/remove basket items | `GET`, `POST`, `DELETE /api/basket` | `basket`, `rentals/customer-server.ts` |
| Create estimate | `POST /api/quotes` | `createQuote`, same module |
| Read/request/cancel customer rentals | `GET`, `POST`, `PATCH /api/bookings` | Customer booking handlers |
| Read/action owner bookings | `GET`, `PATCH /api/boutique/bookings` | `boutiqueBookings`, `updateBooking` |
| Submit/read application | `/api/boutique/application` | Route delegates to onboarding backend |
| Administrator resources | `/api/admin/...` | Corresponding route and admin server functions |

The application often passes IDs in query parameters or bodies rather than exposing every resource at `/resource/:id`. State the URLs that actually exist.

Important status codes: 200 success, 201 created, 400 invalid input, 401 sign-in required, 403 forbidden, 404 unavailable resource, 409 conflicting state, 413 oversized upload, 429 throttled, 503 service unavailable.

`endpoint` maps Zod/JSON parse failures to 400, known API errors to their declared status, Prisma P2034/P2002 conflicts to 409, and unexpected failures to a generic 503. It checks supplied Origin headers on mutations and returns successful responses with `Cache-Control: no-store`. Registration and Auth.js have their own handlers; do not claim all routes use this wrapper.

`GET` reads data. `POST` creates/submits. `PUT` saves the product representation used here. `PATCH` changes selected state. `DELETE` removes a basket entry. Deleting a basket entry is different from deleting a historical booking or product.

## 8. Neon, PostgreSQL and Prisma

Say: “Neon hosts PostgreSQL. Prisma is our server-side ORM. `DATABASE_URL` configures the connection. We do not call a Neon browser API to save each record.”

Follow this chain:

```text
schema.prisma: models + PostgreSQL datasource + DATABASE_URL
    -> prisma generate: typed access code in src/generated/prisma
    -> lib/prisma.ts: shared PrismaClient
    -> feature server function: prisma.product.findMany / booking.create
    -> PostgreSQL queries and transactions
```

The environment string generally contains host, database, credentials and connection options. Do not display it. The database host is configurable; source alone does not prove that a particular live deployment currently uses Neon.

### Tables and relationships

| Model group | What is stored |
|---|---|
| `User` | Account identity, email, password hash, role, active flag, phone, verification and session version. |
| `Account`, `Session`, `VerificationToken` | Auth adapter models. The active configured session strategy is JWT, so a Session model does not mean sign-ins use database sessions. |
| `Boutique`, `BoutiqueReviewEvent` | Owner-linked shop profile, approval decision and review history. `ownerId` is unique: one boutique per owner in this schema. |
| `Product`, `ProductVariant`, `ProductImage` | Listing details, per-size stock/SKU/price overrides, and image metadata. |
| `Booking`, `BookingItem` | Reservation header, dates/status/totals and selected quantities with snapshots. |
| `BookingEvent`, `BookingInspection`, `ManualRefundRecord` | Lifecycle history, condition inspection and manual refund bookkeeping. |
| `Wishlist`, `BasketItem` | Persistent user-product favourites and user-variant selections. Neither is a stock reservation. |
| `BookingQuote` | User-linked temporary estimate payload and expiry. |
| `Review` | Customer/product/booking relationship, rating, comment and moderation state. |
| `Category`, `AuditLog` | Catalog classification and administrative action records. |
| `AuthToken`, `RateLimitBucket` | Hashed recovery/verification tokens and persistent throttling counters. |
| `Notification`, `SupportRequest` | User messages/reminders and support requests. |

```text
User --optional one-to-one--> Boutique --one-to-many--> Product
Product --one-to-many--> ProductVariant
Product --one-to-many--> ProductImage
User --one-to-many--> Booking --one-to-many--> BookingItem
BookingItem --many-to-one--> ProductVariant
Booking --one-to-many--> BookingEvent
```

Foreign keys associate rows and prevent invalid references. `@unique` and `@@unique` enforce uniqueness, such as email or customer/request key. `@@index` helps relevant lookups; indexes consume storage and write work. `onDelete` rules determine whether removal cascades, is restricted, or clears a reference.

Product information is separated from size stock because one listing can have multiple variants. Booking items preserve name/size/category and price snapshots so later edits do not rewrite rental history.

Prices are integer paise in PostgreSQL BigInt columns: 150000 paise represents Rs 1,500. `lineAmounts` multiplies daily price by rounded-up rental days and quantity; per-rental rates do not multiply by days. The current reviewed customer flow uses zero deposit even though deposit fields and manual refund support remain in the wider schema.

Native JavaScript BigInt cannot be passed directly to `JSON.stringify`. Inspect `rentals/records.ts` for response mapping. Conversion to Number must respect safe-integer limits; quote calculation explicitly checks its total.

`prisma generate` generates client code; it does not create database tables. Migrations change the database. `npm.cmd run db:migrate` runs `prisma migrate deploy` to apply committed migrations. A newly designed schema change normally needs a new development migration before deployment. Seeding inserts sample records and is separate from both operations.

## 9. Cloudinary: exact upload path

Read these files: `inventory/product-image-manager.tsx`, `inventory/provider.tsx`, `boutiques/adapters/live.ts`, `src/app/api/boutique/images/route.ts`, then `rentals/server.ts` and `ProductImage` in the schema.

1. The editor's image manager collects browser File objects.
2. The live product service sends multipart FormData to our `POST /api/boutique/images` endpoint.
3. `ownedBoutique()` requires an approved shop. A supplied product ID must belong to that shop.
4. The server validates file count, nonzero size, declared media type and size limit: up to six JPG/PNG/WebP files, each at most 5 MiB. Declared MIME validation should not be described as full content scanning.
5. Private server configuration supplies Cloudinary cloud name, API key and API secret.
6. The server makes a boutique-scoped random public ID and timestamp. It signs the upload parameters using the provider's SHA-1 signature scheme with the secret.
7. The server sends the file to `https://api.cloudinary.com/v1_1/<cloud>/image/upload` with a 60-second timeout.
8. It checks the returned public ID and secure URL prefix and returns image metadata to the editor.
9. Product saving persists public ID, secure URL, alt text and position in `ProductImage` records.
10. The interface uses the image delivery URL. `next.config.ts` allows `res.cloudinary.com` for Next image handling.

Image bytes live in Cloudinary; PostgreSQL holds metadata. Uploading and saving a product are separate operations: a successful upload followed by failed product saving can leave an orphaned asset. Database transactions cannot roll back a remote Cloudinary upload.

There is also a `cloudinary-upload.ts` abstraction in inventory. Follow the live provider/adapter to explain the active server-proxy upload path; do not assume every similarly named helper is used by the live interface.

## 10. Authentication and authorization

Registration: `src/app/register/page.tsx` -> `POST /api/register` -> Zod validation -> normalized email -> rate limit -> `bcryptjs.hash(password, 12)` -> Prisma User creation with CUSTOMER role. Registration cannot assign ADMIN through a submitted role field.

Sign-in: login UI -> Auth.js handler at `src/app/api/auth/[...nextauth]/route.ts` -> credentials `authorize` in `src/auth.ts` -> validate input -> throttle -> fetch user -> reject inactive/missing password account -> optional verification policy -> bcrypt comparison -> session token callbacks.

Google OAuth is included only when both Google credential environment variables exist. The application uses a Prisma adapter and JWT session strategy. On token processing it checks current role, active state and `sessionVersion` from the database. Password changes increment sessionVersion so old tokens fail that check.

Authentication answers who the user is. Authorization answers whether that user can perform this action on this record. `AccountGuard` redirects users away from inaccessible pages. API functions must independently enforce permissions using `currentUser`, `ownedBoutique`, admin role checks and ownership filters. Hiding a button does not protect an endpoint.

Boutique onboarding uses `rentals/workspace-server.ts`: submitting an application creates/resubmits a pending boutique and updates the user's role transactionally. An administrator reviews it. The query flag `intent=boutique` guides navigation; it grants no role. Admin accounts are provisioned through the trusted script, not public registration.

Recovery/verification: `features/auth/recovery.ts` generates expiring tokens, stores hashes, sends email through mail infrastructure, validates purpose/expiry and consumes tokens transactionally. Read the exact functions before explaining their expiry constants. Sign-in verification policy is configurable, but the current reservation creation function separately requires verified email.

Secrets belong on the server. A `NEXT_PUBLIC_` environment value is eligible for browser exposure; it must not contain a database password or provider secret.

## 11. Boutique inventory and booking lifecycle

For `/boutique/products/new`, start at its page and the products layout. Follow `ProductProvider` -> `createLiveProductService` in `boutiques/adapters/live.ts` -> `inventory/product-editor.tsx` and service calls -> `/api/boutique/products` -> `saveProduct` in `rentals/server.ts` -> schema and nested writes.

The context provider supplies a service implementation. Service interfaces describe operations; live adapters call HTTP APIs, while mock adapters support isolated demonstrations/tests. A file named `service.ts` can define a browser-facing contract; it is not automatically backend execution. Follow its imports and usage.

For `/boutique/bookings/<id>`, follow the dynamic page into booking-management components/provider and the live adapter, then `PATCH /api/boutique/bookings` to `updateBooking` in `rentals/server.ts`.

```text
PENDING -> CONFIRMED -> PICKED_UP -> RETURNED -> inspected -> COMPLETED
   |           |
 reject/     cancel
 cancel
```

Request expiry is another supported terminal outcome. See `rules.ts`, `stock.ts` and reservation jobs for its handling. `allowedActions` defines permitted UI/domain actions, and the backend validates transitions. Completion requires inspection. Version fields help reject stale updates rather than silently overwriting another operator's change. Booking events record what happened and who acted.

Availability is date-dependent capacity, not simply `quantity > 0`. `stock.ts` calculates overlapping reservation windows and peak reserved units, including request expiry, stock-ready timestamps and turnaround considerations. Basket and quote creation do not hold stock. Pending reservation requests do count according to reservation-window rules until released/expired.

`scripts/run-reservation-jobs.ts` supports scheduled reservation processing. Having a script is not proof that a production scheduler is configured; demonstrate scheduling separately if asked.

## 12. Styling, analytics, administration and supporting features

Styling: `/styling` -> `/api/recommendations` -> recommendation HTTP/server modules -> database inventory -> optional Gemini preference provider -> engine eligibility/ranking -> real products. `server.ts` injects private configuration. Both `GEMINI_API_KEY` and `GEMINI_MODEL` are needed for the optional provider. The engine can fall back to deterministic preference handling. Gemini does not own product prices or create authoritative stock. Reservation submission still rechecks inventory.

Inspiration support has separate image/HTTP modules under recommendations and `/api/inspiration`; inspect that path separately if demonstrating image-based styling.

Analytics and dashboard: feature screens call live services, which call `/api/boutique/dashboard` and `/api/boutique/analytics`; backend calculations draw on stored operational records. A rental revenue metric is not proof of payments collected. Distinguish rental charges from deposits and inspect the calculation before describing its date grouping.

Admin: `/admin/...` -> admin screens -> `/api/admin/...` -> admin server operations. Approval, user activation, category changes, review moderation and audit history belong here. Admin API checks protect operations independently of layout navigation.

Wishlist: provider/UI -> `/api/wishlist` -> per-user relational rows. Reviews: form -> `/api/reviews` -> booking/customer eligibility checks -> Review. Notifications: UI -> `/api/notifications`, with server creation/job handling. Profile and support similarly have their own route handlers. For an unfamiliar feature, use the tracing method below rather than memorize an invented path.

## 13. Where would you type a new feature?

Use this implementation order when asked to explain development from scratch:

1. Define the user action, permissions, data and failure cases.
2. If persistence changes, edit `prisma/schema.prisma`, create/review a migration, apply it to a development database and regenerate the client.
3. Define runtime validation and TypeScript contracts near the owning feature.
4. Implement server business logic, authorization, queries and necessary transactions in the owning server module.
5. Add or extend a `src/app/api/.../route.ts` handler with appropriate methods/statuses.
6. Add the browser API call or extend the existing service/live adapter contract.
7. Build the interactive component and expose it through an appropriate `page.tsx`; add layout guards/providers when required.
8. Verify authorized success, invalid input, forbidden access and relevant conflicts. Add meaningful tests for important behavior.

Example: adding a new product filter normally changes marketplace form/search parameters and `catalog` query validation/conditions. It does not require a new database table unless you introduce new stored data. Adding a new stored product attribute can require schema, migration, product validation, persistence, serialization, editor and display changes.

Architecture is a modular full stack application, broadly a modular monolith. It uses components, functional TypeScript, service interfaces and adapters. Do not call it microservices merely because it calls cloud providers, or strict MVC just because it has separate folders.

## 14. Code-reading vocabulary

| Syntax / concept | Meaning in your code |
|---|---|
| `.ts` / `.tsx` | TypeScript module / TypeScript that can contain JSX interface markup. |
| `export default` | Primary export used by Next page conventions and component imports. |
| `export const GET` | Named HTTP method export recognized by Next route handling. |
| `async`, `await` | Promise-based operations; allows waiting for I/O without turning it into synchronous computation. |
| `useState` | Retains component state; setter triggers React rendering. |
| `useEffect` | Synchronizes a component with external work such as a browser request; cleanup aborts/tidies up. |
| Props | Inputs passed to a component, including callbacks such as `onBooked`. |
| Context/provider | Makes a shared value, session or service available to descendant components. |
| `interface` / `type` | Compile-time shape description, not database creation or runtime validation. |
| `z.object(...).parse(...)` | Runtime validation; invalid data throws a validation error. |
| `api<T>(...)` | Generic helper with an expected response type. The actual HTTP operation is fetch. |
| `endpoint(catalog)` | Higher-order function returning a standardized request handler. |
| `prisma.product.findMany` | ORM read operation mapping to database queries. |
| `$transaction` | Groups database work under transaction semantics. External HTTP side effects are not automatically included. |
| `...value` | Spread syntax, combining object properties/array items; later object properties override earlier ones. |
| `?.` / `??` | Optional chaining / fallback only for null or undefined. |

## 15. Review questions to answer without guessing

**Where is the backend?** In `src/app/api` entry points plus feature server modules, shared auth/utilities and database access. Next.js runs it on the server.

**Where is the API created?** A `route.ts` exports an HTTP method handler; Next maps its folder to the URL. The handler can delegate business logic through `endpoint`.

**Why both TypeScript and Zod?** TypeScript checks code during development; Zod validates data at runtime, including untrusted HTTP input.

**Why is client validation insufficient?** A caller can send HTTP requests without using our form. The server must validate data and enforce permissions independently.

**Why doesn't changing a UI total reduce the price?** The server loads prices from database records and recalculates the quote and booking.

**Why not hold stock when adding to basket?** A basket represents intent and can be abandoned. The current reservation workflow holds capacity through booking rules instead.

**What if a quote becomes outdated?** It expires after five minutes; submission also checks its fingerprint and current inventory, returning a conflict when necessary.

**What prevents repeated submission?** A customer-scoped unique request key plus transaction checks returns the existing booking for the same request. Disabling the button is only a UI convenience.

**What if Cloudinary fails?** The upload route returns a service error. Do not claim the image was saved successfully or substitute a fake URL.

**Can the owner edit another owner's product?** Server ownership checks must match the signed-in owner's boutique rather than trust a submitted boutique ID.

**Does a valid login guarantee permission?** No. Role, active account, shop approval and record ownership are checked according to the operation.

**Does this use SQL?** PostgreSQL executes SQL; Prisma generates much of it. Explicit parameterized row-lock SQL is also used in reservation transactions.

**Can this be rebuilt with React and Express?** Yes. Next.js is an architectural choice that combines routing/rendering/backend conventions, not the only possible implementation.

**What would you improve?** Choose things you understand: real payment integration if required, orphaned media cleanup, stronger deployment/scheduler observability, improved public catalog server rendering, or broader live end-to-end verification. Explain the concrete need and tradeoff.

## 16. Three-person preparation and presentation

Split explanation responsibilities, not knowledge. Use these as study leads, not invented authorship claims:

| Member | Lead explanation | Must also demonstrate |
|---|---|---|
| 1 | Problem, stack, customer routing and React UI | Follow a request into server and schema. |
| 2 | APIs, auth, database, quotes and concurrency | Show where the browser request originates and how UI handles errors. |
| 3 | Boutique product upload/lifecycle, admin and recommendations | Explain ownership, related tables and one complete customer reservation. |

Suggested 12-minute talk: 1 minute problem/scope; 2 minutes stack/architecture; 3 minutes product-to-reservation trace; 2 minutes database/auth; 2 minutes owner upload/lifecycle; 2 minutes limitations and live questions. Adjust to the professor's allotted time.

Tonight, each member should complete one full trace while another asks “which file next?” Rotate so everyone explains the same reservation flow. Then practice finding a different URL without help. Make one small reversible change in a local branch only if useful for learning, and be able to explain why it works.

Before presenting, prepare real product/variant IDs, three separate role accounts, a verified customer with a valid phone, and dates satisfying current rules. Confirm email/upload providers work if you intend to demonstrate them. Use separate browser profiles or sign out between roles.

For the live trace, open browser Network tools, perform the action, show request URL/method/body/status/response, open the corresponding route, follow its imports, show validation/authorization, then the Prisma query and schema. Show relevant record IDs through an appropriate database viewer without revealing credentials or unrelated personal data.

### Useful local commands

```powershell
npm.cmd run dev
npm.cmd test
npm.cmd run lint
npm.cmd run build
npm.cmd run check:local
```

These are available commands, not a claim they passed during preparation of this handbook. Integration suites need appropriate running-app and isolated database configuration; inspect their setup before running them against any database.

### How to find code when the professor picks any URL

1. Remove the hostname/query string and map path segments to `src/app`.
2. Replace record IDs with the matching bracket folder.
3. Read `page.tsx`, its imports and applicable parent layouts.
4. Find `api(...)`, `fetch(...)`, or the component's service hook.
5. If a service is used, follow its provider to the live adapter and actual URL.
6. Open the matching API `route.ts`, then follow named imports/re-exports.
7. Identify runtime validation, account/ownership checks, business rules and Prisma operations.
8. Match the queried models to the schema and explain the response serializer and UI state update.

If you do not recall a function name, say “I will trace the import to the implementation” and do it. That is a normal developer skill.

## 17. Corrections to older review notes

The older `REVIEW_STUDY_GUIDE.md` and `REVIEW_PRESENTATION.md` remain useful for broad background, but their direct availability-to-booking description and some limits predate the current source. For the review, use these current facts:

- Product detail and basket call `POST /api/quotes`; submission sends a quote ID and accepted terms to `POST /api/bookings` with an idempotency header.
- Quotes expire in five minutes and do not hold stock.
- Current customer quote rules: 24-hour minimum lead time, 180-day booking horizon, 14-day maximum rental.
- Booking creation requires verified email and valid phone; pending requests expire after 12 hours and there is a three-pending-request limit.
- The reservation flow includes a 24-hour turnaround buffer and writes zero deposit.
- Older test counts are historical. No fresh test, build, live database or provider success is asserted by this handbook.

All implementation claims above were checked against local source. Next routing/component explanations were checked against the installed Next.js guides for layouts/pages, server/client components and route handlers.
