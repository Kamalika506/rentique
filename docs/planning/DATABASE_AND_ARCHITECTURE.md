# Database and full-stack architecture

This is a logical target design, not a migration to apply to the existing database. Implement reviewed migrations incrementally, including SQL constraints that an ORM may not express directly.

## 1. Architecture choice

Use a **modular monolith**: one Next.js/React/TypeScript application, server-side domain modules, and one PostgreSQL database accessed through Prisma. Keep the current technology family where it remains supportable. Do not add a separate Express service, microservices, or a second database merely to describe the application as full stack.

~~~mermaid
flowchart TD
    Customer[Customer browser] --> App[Next.js pages and API boundary]
    Owner[Boutique owner browser] --> App
    Admin[Administrator browser] --> App
    App --> Auth[Authentication and authorization]
    Auth --> Services[Domain services]
    Services --> DB[(PostgreSQL)]
    Services --> Media[Managed image storage]
    Services --> AI[Optional AI provider]
    DB --> Worker[Durable job and outbox worker]
    Worker --> Mail[Email and in-app notifications]
    Worker --> DB
~~~

### Suggested technologies and responsibilities

| Layer | Choice | Responsibility |
| --- | --- | --- |
| UI | Next.js App Router, React, TypeScript | Public/customer/owner/admin experiences |
| Forms | Existing form library plus shared Zod schemas | Input feedback; server validates again |
| Styling | Existing Tailwind/Base UI system | Consistent accessible controls |
| Authentication | Supported authentication library with JWT cookie sessions | Login, verification, recovery, session invalidation |
| Authorization | Explicit server policies and scoped queries | Roles, ownership, boutique state, resource state |
| Backend | Route handlers calling domain services | Stable APIs and typed errors |
| Persistence | PostgreSQL and Prisma | Relational data, constraints, transactions |
| Media | Existing Cloudinary integration or equivalent | Owned public product images and separately private evidence |
| Jobs | Database-backed work records plus scheduled worker | Expiry, reminders, overdue cases, delivery retries |
| AI | Provider adapter with text/image structured output | Attribute interpretation only; actual retrieval controlled by Rentique |
| Testing | Unit tests, real PostgreSQL integration tests, browser tests | Rules, races, permissions, and full journeys |

Select supported package versions during implementation and pin the lockfile. The repository's installed Next.js guides govern its framework-specific behavior. In particular, authentication with Cache Components requires request-aware session reads and appropriate Suspense boundaries. Proxy checks supplement authorization; they do not replace it. [Next.js authentication guidance](https://nextjs.org/docs/app/guides/authentication).

## 2. Module boundaries and source organization

~~~text
src/
  app/
    (public)/             public pages
    (auth)/               login, registration, recovery
    account/              shared account and customer pages
    boutique/             applicant and owner workspace
    admin/                administrator workspace
    api/v1/               application APIs
  features/
    identity/
    boutiques/
    catalog/
    inventory/
    bookings/
    recommendations/
    reviews/
    support/
    analytics/
    notifications/
  lib/
    database/
    auth/
    validation/
    observability/
    media/
  jobs/
tests/
  unit/
  integration/
  e2e/
prisma/
  migrations/
docs/
~~~

Route groups organize files without adding URL segments. Choose one canonical URL per screen. Do not create multiple home pages or duplicate booking services.

Within a domain, separate contracts/validation, policies, service commands, queries, persistence, and UI when their responsibilities justify it. A three-person team does not need an abstract repository for every small database call.

Rules that affect stock belong to the inventory/booking service and its transactions. Reporting reads history and cannot decide availability. AI calls a read-only search/quote boundary and cannot create reservations.

## 3. Data conventions

- Generated IDs as stable internal keys; human booking references are separate unique identifiers.
- UTC timestamp-with-time-zone columns; boutique timezone retained for display and rule interpretation.
- Money is informational integer paise plus currency; decimal arithmetic is never used to store currency.
- Database enums for stable state machines; tables for editable categories and occasions.
- Human contact details are normalized and bounded; normalize email before uniqueness checks.
- Public IDs are identifiers, not authorization tokens.
- Mutable resources carry version and updatedAt for conflict detection.
- Restricted deletion for rental, unit, inspection, and audit history. Archive instead of hard delete.
- Booking snapshots are intentional historical denormalization, not duplicate live sources of truth.
- JSON is appropriate for versioned snapshots, attribute extraction, and event details; not for replacing relational ownership, stock, or booking items.
- API DTOs convert bigint values safely into bounded integer values or documented strings.

## 4. Identity and boutique entities

| Entity | Important fields | Relationships and constraints |
| --- | --- | --- |
| User | id, normalizedEmail, passwordHash, name, phone, emailVerifiedAt, phoneVerifiedAt, status, sessionVersion, timestamps | Unique email; status ACTIVE/SUSPENDED/DEACTIVATED; password hash nullable only for configured external auth |
| UserRole | userId, role, grantedAt, grantedBy | Unique userId+role; CUSTOMER/BOUTIQUE_OWNER/ADMIN; public signup cannot write privileged roles |
| AuthToken | id, userId, purpose, tokenHash, expiresAt, usedAt | Purpose-bound single-use verification/recovery tokens; unique hash |
| RateLimitBucket | key, count, resetAt | Persistent or shared-store limits; no in-memory-only production limiter |
| Boutique | id, ownerId, slug, name, description, contactEmail, phone, address, cityCode, stateCode, postalCode, socialUrl?, status, timezone, currentPolicyVersion, version, timestamps | Public columns hold the approved profile; unique ownerId for first release; unique slug; lifecycle DRAFT/PENDING/APPROVED/REJECTED/SUSPENDED/CLOSED |
| BoutiqueApplication | id, boutiqueId, revision, submittedProfile, submittedAt, outcome, decidedBy, decidedAt, reason | Unique boutiqueId+revision; at most one pending revision per shop; submitted revisions immutable |
| BoutiqueReviewEvent | id, boutiqueId, applicationId, adminId, action, reason, createdAt | Records approval, rejection, suspension, reopening and closure decisions |
| BoutiqueHours | boutiqueId, weekday, opensAtLocal, closesAtLocal, isClosed | Unique boutiqueId+weekday for simple hours; expand for split sessions only if needed |
| BoutiqueClosure | id, boutiqueId, startDate, endDate, reason, emergency, createdBy | Inclusive local dates documented consistently; affected appointments checked |
| PolicyVersion | id, scope, boutiqueId?, version, effectiveAt, policyData | Versioned platform/shop limits and visible terms; booking stores applied version and content |

An applicant may own a DRAFT/PENDING boutique without BOUTIQUE_OWNER publishing privileges. Approval requires an active account, verified contact, complete evidence, and the current pending revision; approval and role grant are atomic. Rejection does not delete the application. A material profile change is a new application revision; the last approved public columns remain unchanged until a decision.

If ownership/branches become more complex, introduce BoutiqueMembership and Branch in a later migration. Do not pretend a single owner field already implements staff access.

## 5. Catalogue and physical stock entities

| Entity | Important fields | Relationships and constraints |
| --- | --- | --- |
| Category | id, slug, name, parentId?, active | Unique slug; controlled hierarchy; disabled category stops new requests |
| Occasion | id, slug, name, active | Controlled vocabulary for search/recommendations |
| Product | id, boutiqueId, categoryId, slug, name, description, productKind, garmentType?, fabric, colours, styleTags, typedAttributes, includedPieces, rentalPriceMinor, pricingUnit, turnaroundMinutes, status, moderationStatus, version | Kind OUTFIT/JEWELLERY/ACCESSORY; DRAFT/PUBLISHED/ARCHIVED; moderation CLEAR/HIDDEN; published listing requires required fields and stock |
| ProductOccasion | productId, occasionId | Unique pair; avoids inconsistent wedding/Wedding/weddings tags |
| MediaAsset | id, ownerId, boutiqueId?, purpose, providerKey, visibility, mimeType, bytes, verifiedAt, expiresAt? | Verified ownership and delivery location; product images public, evidence/inspiration private |
| ProductImage | id, productId, assetId, position, alt | Unique productId+position; asset must be verified and shop-owned |
| ProductVariant | id, productId, boutiqueId, sizeLabel, measurements, configurationKey, optionalPriceOverrideMinor, archived, version | Unique productId+configurationKey; composite FK enforces product/shop; measurements use explicit units |
| InventoryUnit | id, variantId, boutiqueId, shopStockCode, lifecycle, readiness, activeFrom, retiredAt?, version | Unique boutiqueId+shopStockCode; composite FK enforces variant/shop; one row per physical piece/set |
| InventoryBlock | id, unitId, allocationId?, kind, startsAt, endsAt?, expiresAt?, releasedAt?, releaseReason | Active range exclusion prevents same-unit overlap; kinds REQUEST_HOLD/RENTAL/MAINTENANCE |
| UnitEvent | id, unitId, actorId?, allocationId?, type, fromState, toState, reason, occurredAt | Append history for readiness, repair, custody, retirement, and correction |

For MVP, store controlled colour/style tags as validated arrays; do not create a table for every adjective. ProductOccasion is relational because it drives an administratively maintained catalogue.

Lifecycle/condition changes use UnitEvent so historical capacity and custody can be reconstructed. A current-state field alone cannot produce historical utilization.

## 6. Quote, booking, and return entities

| Entity | Important fields | Relationships and constraints |
| --- | --- | --- |
| Quote | id, customerId, boutiqueId, interval, canonicalLines, estimatedRentalMinor, versionsHash, policySnapshot, expiresAt | Server-created short-lived review record; no stock hold; bound to requesting user |
| Booking | id, reference, boutiqueId, customerId?, source, customerContactSnapshot, status, pickupAt, returnAt, requestExpiresAt?, pickedUpAt?, returnedAt?, completedAt?, closedAt?, policySnapshot, estimatedRentalMinor, currency, version, createdAt | ONLINE/WALK_IN; online requires customerId; one shop and interval; no financial status fields |
| BookingItem | id, bookingId, boutiqueId, productId, variantId, quantity, productSnapshot, sizeSnapshot, measurementSnapshot, includedPiecesSnapshot, estimatedUnitPriceMinor, estimatedLineRentalMinor, turnaroundSnapshot | Unique bookingId+variantId; quantity positive; shop/variant relationships enforced |
| BookingAllocation | id, bookingItemId, variantId, unitId, slotNumber, status, isCurrent, replacesAllocationId?, issuedAt?, returnedAt?, lostAt? | One current allocation per line slot; composite FKs enforce line/unit variant; RESERVED/ISSUED/RETURNED/RELEASED/REPLACED/LOST |
| BookingEvent | id, bookingId, actorId?, action, fromStatus?, toStatus?, details, caseId?, createdAt | Append-only lifecycle, substitution, correction, and communication references |
| Inspection | id, allocationId, revision, condition, checklist, notes, evidenceAssetIds, finalizedAt, actorId | Unique allocationId+revision; one latest finalized revision; notes required for damage/incomplete set |

The line quantity is how many pieces the customer requested. Allocation rows identify those exact pieces. Replacing a reserved unit creates a successor allocation for the same slot, marks the old one non-current/replaced, releases its block, and inserts the replacement block in one transaction. Issued units cannot be silently replaced.

If there is an unresolved fulfilment incident, record it on the booking/case and prevent handover. Do not hide insufficient allocations under a successful status.

After all current allocations return and inspections finalize, a service completes the booking. Cleaning may continue independently. Repairs do not keep unrelated customer bookings open indefinitely. Exceptional CLOSED_WITH_LOSS requires an administrative case; lost allocations have lostAt and no fabricated returnedAt.

## 7. Engagement and operational entities

| Entity | Important fields | Rules |
| --- | --- | --- |
| Wishlist | customerId, productId, createdAt | Unique pair |
| Review | id, bookingItemId, customerId, rating, comment, moderationStatus, moderationReason, timestamps | Unique bookingItemId; verified ownership/actual handover and operational closure; 1-5 rating |
| SupportTicket | id, customerId?, boutiqueId?, bookingId?, category, status, priority, assignedAdminId?, resolution, timestamps | Role-scoped participants; operational issue and risk records |
| SupportMessage | id, ticketId, actorId, visibility, body, attachmentAssetIds, createdAt | Explicit CUSTOMER_VISIBLE/SHOP_VISIBLE/INTERNAL visibility |
| Notification | id, recipientId, type, reference, content, readAt, createdAt | User-scoped in-app inbox |
| OutboxEvent | id, type, aggregateId, dedupeKey, payload, state, attempts, nextAttemptAt, leaseUntil, createdAt | Unique dedupeKey; transactionally created; retryable delivery |
| AuditLog | id, actorId?, action, entityType, entityId, reason, caseId?, requestId, createdAt | Sensitive administrative changes; no secrets or unnecessary personal data in payload |
| IdempotencyRecord | actorId, operation, key, requestHash, state, resourceId?, responseSummary, expiresAt | Unique actorId+operation+key; same key/different body is conflict |
| RecommendationRequest | id, customerId, consentFlags, confirmedPreferences, resultIds, source, fallbackReason, modelVersion?, latencyMs, createdAt | Minimal metadata; optional later persistence; no permanent inspiration image by default |

These are full target logical entities. Add tables in functional increments; support/AI telemetry can follow the first working booking slice. Authentication-library adapter tables are additional when required by the chosen library; do not create redundant JWT session tables without a reason.

## 8. Relationship overview

~~~mermaid
erDiagram
    USER ||--o{ USER_ROLE : has
    USER ||--o| BOUTIQUE : owns
    BOUTIQUE ||--o{ BOUTIQUE_APPLICATION : submits
    BOUTIQUE ||--o{ PRODUCT : lists
    CATEGORY ||--o{ PRODUCT : classifies
    PRODUCT ||--o{ PRODUCT_VARIANT : offers
    PRODUCT_VARIANT ||--o{ INVENTORY_UNIT : contains
    INVENTORY_UNIT ||--o{ INVENTORY_BLOCK : schedules
    INVENTORY_UNIT ||--o{ UNIT_EVENT : records
    BOUTIQUE ||--o{ BOOKING : fulfils
    USER |o--o{ BOOKING : requests
    BOOKING ||--|{ BOOKING_ITEM : includes
    PRODUCT_VARIANT ||--o{ BOOKING_ITEM : references
    BOOKING_ITEM ||--|{ BOOKING_ALLOCATION : assigns
    INVENTORY_UNIT ||--o{ BOOKING_ALLOCATION : used_by
    BOOKING_ALLOCATION ||--o{ INSPECTION : inspected_in
    BOOKING ||--o{ BOOKING_EVENT : records
    BOOKING_ITEM ||--o| REVIEW : reviewed_in
    BOOKING ||--o{ SUPPORT_TICKET : concerns
~~~

The diagram is a subset for comprehension; the entity tables define the other relationships. Guest walk-ins explain the optional User relationship.

### Reservation sequence

~~~mermaid
sequenceDiagram
    actor Customer
    participant UI as Customer screen
    participant API as Quote/booking API
    participant Rules as Booking service
    participant DB as PostgreSQL
    participant Jobs as Outbox worker
    actor Owner
    Customer->>UI: Choose items, sizes, and interval
    UI->>API: Create quote
    API->>Rules: Validate and estimate
    Rules->>DB: Read approved inventory and commitments
    API-->>UI: Reviewed estimate, terms, expiry; no hold
    Customer->>UI: Submit request
    UI->>API: Quote ID and idempotency key
    API->>Rules: Authenticate, authorize, validate
    Rules->>DB: Lock units; recheck; create request and blocks
    Note over Rules,DB: Booking, allocations, event, and outbox commit together
    API-->>UI: REQUESTED and decision deadline
    Jobs->>DB: Read committed outbox
    Jobs-->>Owner: New request
    Owner->>API: Confirm with expected version
    API->>Rules: Check owner, shop, state, deadline
    Rules->>DB: Confirm, retain blocks, append event/outbox
    API-->>Owner: CONFIRMED
    Jobs-->>Customer: Confirmation notification
~~~

## 9. Database constraints and concurrency

Required constraints:

- Unique normalized email, boutique slug/first-release owner, stock code, variant configuration, booking reference, wishlist pair, review booking line, event dedupe key, and idempotency key scope.
- CHECK returnAt > pickupAt, quantity > 0, informational amounts >= 0, valid ratings, and valid bounded intervals.
- Online bookings require a registered customer; walk-ins require a shop actor/contact snapshot.
- Composite foreign keys or equivalent database-enforced design ensure that booking items belong to their booking's boutique and allocations reference the same variant as their booking item.
- Where boutiqueId or variantId is repeated to enforce these relationships, composite foreign keys tie the values together. They are not independently editable copies. For example, BookingItem references Booking(id, boutiqueId) and ProductVariant(id, productId, boutiqueId); BookingAllocation references both BookingItem(id, variantId) and InventoryUnit(id, variantId), backed by corresponding unique keys.
- Partial uniqueness ensures one current allocation per booking-item slot.
- Restrictive foreign keys prevent deleting an item, unit, or customer identity out from under retained rental history; account anonymization uses an explicit policy.
- Database range exclusion prevents overlaps on one physical unit.

Illustrative PostgreSQL constraint, to be adapted to actual mapped table names during implementation:

~~~sql
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE inventory_block
  ADD CONSTRAINT no_overlapping_active_unit_blocks
  EXCLUDE USING gist (
    unit_id WITH =,
    tstzrange(starts_at, ends_at, '[)') WITH &&
  )
  WHERE (released_at IS NULL);
~~~

A null ends_at represents an indefinite maintenance block. Adding it must resolve existing conflicts through the incident workflow. Released historical blocks remain as evidence. Expiry is an explicit state change; do not use now() in the partial predicate. PostgreSQL documents range overlap and exclusion constraints for this scheduling pattern. [PostgreSQL range types](https://www.postgresql.org/docs/current/rangetypes.html).

Use transactions with deterministic row locking for stock allocation and related changes. On a conflict, retry a small bounded number of times or return STOCK_UNAVAILABLE/CONFLICT, never bypass the constraint. Row locks remain until the transaction ends. [PostgreSQL locking](https://www.postgresql.org/docs/current/explicit-locking.html).

Use atomic version-checked updates for ordinary editing. Cross-row rules such as all allocations returned require a locked service transaction; a client-supplied flag is never enough.

Index public catalogue filters, boutique/date booking queues, unit ranges, customer booking history, unread notifications, due outbox jobs, request expiry, and audit entity/time. Add query-specific indexes from measured plans; avoid an index on every field.

## 10. AI and image-assisted discovery

### Text flow

Customer provides occasion, dates, size/measurements, city, budget, outfit type, colour, and jewellery preferences. Optional natural-language text is interpreted into a strict attribute schema. The customer confirms inferred hard preferences before search.

The inventory query restricts results to approved active boutiques, published visible items, compatible variants, available units, and the customer's chosen area. The quote service calculates the entire rental interval.

AI may rank or explain eligible items; it cannot invent IDs, change prices, claim availability without the allocator, approve shops, or reserve stock. Missing AI yields labelled deterministic rules. Missing inventory yields an unavailable/empty response, never fictional products.

### Image flow

1. Obtain permission to process the inspiration image and explain the provider/retention.
2. Validate file type, decoded content, dimensions, and size; remove unnecessary metadata.
3. Store privately with short expiry, suggested 24 hours or less; do not publish it as a product photo.
4. Ask a suitable model for garment attributes such as type, main colours, pattern, style, and visible jewellery.
5. Return uncertain attributes for user correction. Do not infer identity, body measurements, or sensitive traits from a photograph.
6. Retrieve actual catalogue variants using confirmed attributes and ordinary hard constraints.
7. Show matched attributes and real photos; label results as similar styles, not exact matches.
8. Clean up transient uploads and retain only necessary consent/request metadata.

Provider image input and schema-constrained output capabilities must be verified for the selected model. [Gemini image understanding](https://ai.google.dev/gemini-api/docs/image-understanding), [structured output](https://ai.google.dev/gemini-api/docs/structured-output).

Embedding similarity is a later improvement, with an evaluation dataset and an index updated when listings change. Do not add it before a reliable metadata-based image discovery flow.

For complete looks, first search within one shop. Enforce the combined full-period rental budget for outfit plus jewellery, compatible style/occasion, and each relevant size. Explain if results require different shops and independent bookings.

## 11. Analytics definitions

| Metric | Definition |
| --- | --- |
| Requests | Online requests created in the selected period |
| Confirmation rate | Confirmed online requests / decided online requests, with the cohort and cutoff disclosed |
| Fulfilled rentals | Bookings with actual handover; separately show completed bookings |
| Shop cancellations | Pre-pickup cancellations initiated by the shop, with reasons |
| No-shows | Explicitly recorded NO_SHOW bookings; do not equate with owner inactivity |
| Overdue units | Issued physical units past agreed return, with no actual return |
| Popular styles | Fulfilled units/bookings by product, excluding cancelled/rejected/expired requests |
| Customer-custody utilization | Actual unit-hours with customers intersected with eligible capacity / eligible active unit-hours |
| Estimated listed rental value | Sum of snapshotted informational rental estimates for a labelled booking cohort; not receipts or collected revenue |

Capacity is reconstructed from unit lifecycle and downtime history. Cleaning/repair time is separately reported with a documented denominator policy. Shop opening hours do not remove overnight rental capacity. If imported stock lacks historical capacity evidence, show utilization only after the reliable-data start date or show unavailable.

## 12. Security, privacy, and operations

- Store JWT sessions in secure HttpOnly cookies, with appropriate SameSite settings; no authentication token in localStorage.
- Re-read role/account/shop status for protected operations; sessionVersion supports revocation.
- Verify origin/CSRF protection for cookie-authenticated mutations and validate all input server-side.
- Enforce both role and per-object ownership; knowing a booking ID is insufficient. [OWASP object-level authorization](https://api-security.owasp.org/editions/2023/en/0xa1-broken-object-level-authorization/).
- Filter output DTOs, avoid mass assignment, and bound pagination/file uploads/request bodies.
- Product uploads are shop-owned; private evidence uses access-controlled delivery. Do not trust a client-supplied media URL.
- Rate-limit sign-in, verification, recovery, handover-code checks, recommendations, uploads, and booking requests.
- Keep credentials server-side, redact logs, and use separate development/test/staging/production secrets and databases.
- Use managed database backups and rehearse restore; track failed jobs, open incidents, error rate, and allocator conflicts.
- Define a data retention schedule and access/deletion procedure before launch; validate jurisdiction-specific requirements with appropriate review rather than inventing compliance claims.
- Configure a real scheduler and worker leases; no browser timer controls stock expiry.

Initial deployment: web application, managed PostgreSQL, media storage, mail delivery, and authenticated scheduled jobs. Cache public catalogue data selectively; do not share-cache personal bookings, live quotes, or availability decisions. Use request IDs and structured logs for support.
