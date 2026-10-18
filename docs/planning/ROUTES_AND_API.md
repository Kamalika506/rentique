# Canonical routes and API contracts

The route list is a proposed contract. It does not claim these endpoints already exist. Implement each route only with its documented service, authorization, errors, and acceptance tests.

## 1. Navigation principles

- The landing page remains a public page for all visitors. Account type must not turn the same link into unpredictable redirect chains.
- Use /boutiques for public storefronts and /boutique for the owner's workspace.
- Use one login and one underlying user identity; a workspace selector changes navigation, not permissions.
- Approved owners retain customer pages for reservations at other shops.
- Applicant/status pages must be reachable before approval. Do not wrap all /boutique routes in an approved-owner guard.
- Suspended shops receive a limited fulfilment workspace; they do not gain publishing or new-booking access.
- Page guards improve navigation; every API/data operation independently checks authorization.
- Redirect old aliases once to the canonical destination; do not retain duplicate implementations.
- Preserve a safe internal returnTo destination after login. Reject external URLs, protocol-relative URLs, and forbidden destinations.

## 2. Page map

| URL | Access | Purpose |
| --- | --- | --- |
| / | Public | Traditional occasion fashion proposition and discovery |
| /marketplace | Public | Search/filter including sizes, shop/city, dates, and prices |
| /marketplace/[productId] | Public | Listing, variants, available-date summary, price information |
| /boutiques | Public | Approved shops and location/category filters |
| /boutiques/[slug] | Public | Approved shop profile, hours, policies, and collection |
| /styling | Public form; sign-in to generate | Occasion styling and image-assisted discovery |
| /how-it-works | Public | Requests, confirmation, counter pickup, and return |
| /policies | Public | Platform booking/cancellation/privacy/support guidance |
| /login | Public | Login; no client-selectable privileged role |
| /register | Public | Customer signup |
| /verify-email | Token flow | Email verification |
| /forgot-password | Public | Recovery request |
| /reset-password | Token flow | Single-use password reset |
| /account | Active user | Profile, contact verification, password, sessions |
| /account/wishlist | Customer capability | Saved styles |
| /account/basket | Customer capability | Same-shop, same-interval review; no stock reservation |
| /account/bookings | Customer capability | Own upcoming/history bookings |
| /account/bookings/[id] | Owning customer | Timeline, cancellation, handover code, returned items |
| /account/notifications | Active user | Own notification inbox |
| /account/support | Active user | Own cases |
| /account/support/[id] | Participant | Case messages and outcome |
| /boutique/application | Customer applicant/owner | Own draft, revisions, decision, resubmission |
| /boutique/dashboard | Approved owner; limited suspended view | Tasks, queues, incidents |
| /boutique/profile | Own shop | Ordinary shop profile changes; reviewed material changes |
| /boutique/policies | Own shop | Hours, closures, policy versions |
| /boutique/products | Approved owner | Own listing inventory |
| /boutique/products/new | Approved owner | Create style and variants |
| /boutique/products/[id]/edit | Owning approved owner | Versioned listing editor |
| /boutique/units | Owning owner | Physical pieces and readiness |
| /boutique/bookings | Owning owner | Requests and operational queues |
| /boutique/bookings/[id] | Owning owner | Allowed lifecycle actions, partial returns, inspection |
| /boutique/walk-ins/new | Approved owner | Record a counter reservation through the allocator |
| /boutique/calendar | Owning owner | Commitments, pickups, returns, downtime |
| /boutique/analytics | Owning owner | Defined operational metrics |
| /boutique/support | Owning owner | Participating cases |
| /admin | Admin | Oversight and work queues |
| /admin/applications | Admin | Application review and evidence |
| /admin/boutiques | Admin | Shop status and managed wind-down |
| /admin/users | Admin | Account status, abuse evidence, session revocation |
| /admin/products | Admin | Catalogue moderation |
| /admin/categories | Admin | Category/occasion governance |
| /admin/bookings | Admin | Operational oversight; case-bound corrections |
| /admin/reviews | Admin | Moderation |
| /admin/support | Admin | Case assignment and resolution |
| /admin/audit | Admin | Sensitive-action history |
| /admin/operations | Admin | Failed jobs, incident and delivery health |

Suspended owners can process existing returns, inspections, incidents, and support; per-action server policies restrict other commands. An applicant gets an application link and status, not an unusable owner dashboard.

Use real 404, forbidden, unavailable, empty, loading, validation, and conflict states. A backend failure must not silently display demo inventory.

## 3. Layout and guard design

~~~text
app/
  (public)/
  (auth)/
  account/
    layout                  authenticated account shell
  boutique/
    layout                  account shell; does not require approval globally
    application/
    (workspace)/
      layout                resolves shop and permitted workspace
      dashboard/
      products/
      bookings/
  admin/
    layout                  admin shell and account verification
~~~

Sensitive reads/commands still authorize at the data boundary, even when the layout already checked a session. Return only role-appropriate data. Authenticated content and quote APIs are request-specific; follow the installed framework's cache/auth guidance.

## 4. API conventions

Application routes use /api/v1. Authentication-library endpoints retain their required /api/auth namespace. Auth-library CSRF/session conventions apply to that boundary.

All state-changing application requests:

- Validate session, account status, role/capability, resource ownership, boutique policy, and current resource state.
- Validate origin/CSRF protections for cookie authentication.
- Parse strict shared schemas and reject unknown privilege-bearing fields.
- Require version for mutable aggregates and Idempotency-Key for booking/walk-in creation.
- Write domain events and notification outbox records in the transaction.
- Return no-store responses for private/live data.

Use consistent request IDs and a stable error envelope:

~~~json
{
  "error": {
    "code": "STOCK_UNAVAILABLE",
    "message": "One selected size is no longer available for these dates.",
    "fieldErrors": {},
    "requestId": "request-reference"
  }
}
~~~

| HTTP | Use |
| --- | --- |
| 200 / 201 | Successful read/update or creation |
| 400 | Invalid input or malformed interval |
| 401 | Missing/expired authentication |
| 403 | Known account lacks an operation capability |
| 404 | Missing resource or another user's private resource |
| 409 | Version conflict, stock conflict, expired/changed quote, invalid current state |
| 413 / 415 | Oversized or unsupported upload |
| 429 | Request or domain rate limit |
| 503 | Required dependency unavailable; no fabricated success |

Paginate lists with a documented cursor or page contract and maximum 50 rows, validate filters, and use stable sorting. Bookings, product edits, and support responses have explicit DTOs; never serialize full ORM User or Boutique objects.

## 5. Endpoint groups

### Identity and public discovery

| Method and path | Access / behavior |
| --- | --- |
| POST /api/v1/auth/register | Public; grants CUSTOMER only |
| POST /api/v1/auth/verification-request | Rate limited; safe response |
| POST /api/v1/auth/verify-email | Purpose-bound token consumption |
| POST /api/v1/auth/recovery-request | Rate limited; avoid account enumeration |
| POST /api/v1/auth/reset-password | Token consumption and session revocation |
| GET, PATCH /api/v1/me | Own active account profile |
| POST /api/v1/me/change-password | Verify current credential; revoke previous sessions |
| POST /api/v1/me/revoke-sessions | Own session invalidation |
| GET /api/v1/categories | Active public categories/occasions |
| GET /api/v1/products | Public visible catalogue; optional dated availability filter |
| GET /api/v1/products/[id] | Public listing DTO |
| GET /api/v1/boutiques | Approved public profiles |
| GET /api/v1/boutiques/[slug] | Approved public profile/hours/terms |
| GET /api/v1/availability | Rate-limited public count/estimate; no customer schedules or identities |

### Customer and shared account

| Method and path | Access / behavior |
| --- | --- |
| GET, POST, DELETE /api/v1/me/wishlist | Own wishlist; item IDs only |
| POST /api/v1/quotes | Customer; validated same-shop review estimate, no hold |
| POST /api/v1/bookings | Verified customer; quote ID; atomic allocation |
| GET /api/v1/me/bookings | Own history |
| GET /api/v1/me/bookings/[id] | Own booking with public shop contact and own events |
| POST /api/v1/me/bookings/[id]/cancel | Own pre-pickup cancellation with reason/version |
| POST /api/v1/me/bookings/[id]/handover-code | Own confirmed booking; short-lived single-use code |
| POST /api/v1/reviews | Eligible own actually handed-over booking line after operational closure |
| GET /api/v1/products/[id]/reviews | Public visible reviews and aggregate |
| POST /api/v1/recommendations | Customer capability; real catalogue results |
| POST /api/v1/inspiration-uploads | Customer; private temporary upload |
| GET /api/v1/me/notifications | Own inbox |
| PATCH /api/v1/me/notifications/[id] | Own read status |
| GET, POST /api/v1/support | Own list/create case |
| GET /api/v1/support/[id] | Participant-scoped case |
| POST /api/v1/support/[id]/messages | Participant; server-enforced visibility |

### Boutique

| Method and path | Access / behavior |
| --- | --- |
| GET, PUT /api/v1/boutique/application | Own draft/current status |
| POST /api/v1/boutique/application/submit | Submit/resubmit immutable revision |
| GET, PATCH /api/v1/boutique/profile | Own shop; material changes create review revision |
| GET, PUT /api/v1/boutique/hours | Own shop; validate against commitments |
| GET, POST /api/v1/boutique/closures | Own shop; identify affected appointments |
| GET, PATCH /api/v1/boutique/policies | Own versioned settings within platform bounds |
| GET, POST /api/v1/boutique/products | Own inventory/create |
| GET, PATCH /api/v1/boutique/products/[id] | Own versioned edit |
| POST /api/v1/boutique/products/[id]/publish | Validate completeness/approval/stock |
| POST /api/v1/boutique/products/[id]/archive | Preserve existing commitments/history |
| POST /api/v1/boutique/media | Verified owned image upload |
| GET, POST /api/v1/boutique/units | Own pieces/register new physical stock |
| POST /api/v1/boutique/units/[id]/commands | Readiness, cleaning, repair, retirement commands with guards |
| POST /api/v1/boutique/units/[id]/blocks | Planned downtime; conflict checked |
| GET /api/v1/boutique/bookings | Own queues and filters |
| GET /api/v1/boutique/bookings/[id] | Own booking DTO |
| POST /api/v1/boutique/bookings/[id]/confirm | Own valid request, version/deadline checked |
| POST /api/v1/boutique/bookings/[id]/reject | Own pending request, reason required |
| POST /api/v1/boutique/bookings/[id]/cancel | Own pre-pickup shop-caused cancellation |
| POST /api/v1/boutique/bookings/[id]/pickup | Ready assigned units and handover check |
| POST /api/v1/boutique/bookings/[id]/returns | Acknowledge specified issued allocations |
| POST /api/v1/boutique/bookings/[id]/inspections | Finalize specified returned allocations |
| POST /api/v1/boutique/bookings/[id]/no-show | Explicit shop decision after threshold |
| POST /api/v1/boutique/bookings/[id]/reassign | Equivalent unit before pickup, checked atomically |
| POST /api/v1/boutique/walk-ins | Own shop; same allocator; guest identity rules |
| GET /api/v1/boutique/calendar | Own date-scoped commitments; no public customer detail |
| GET /api/v1/boutique/dashboard | Own tasks and incidents |
| GET /api/v1/boutique/analytics | Own defined metrics and data coverage |

Use explicit commands instead of PATCH status=COMPLETED. State transition validation belongs to domain services.

### Administrator and internal operations

| Method and path | Access / behavior |
| --- | --- |
| GET /api/v1/admin/dashboard | Administrative summary |
| GET /api/v1/admin/applications | Review queue |
| POST /api/v1/admin/applications/[id]/decision | Approve/reject with expected version, reason, and role grant as appropriate |
| GET /api/v1/admin/boutiques | Status and operational workload |
| POST /api/v1/admin/boutiques/[id]/commands | Suspend/reinstate/close with wind-down rules |
| GET /api/v1/admin/users | Minimal account information |
| POST /api/v1/admin/users/[id]/status | Suspend/reactivate with reason and session invalidation |
| GET /api/v1/admin/products | Moderation queue |
| POST /api/v1/admin/products/[id]/moderation | Hide/restore with reason |
| GET, POST, PATCH /api/v1/admin/categories | Controlled catalogue management |
| GET /api/v1/admin/bookings | Oversight, minimal necessary private details |
| POST /api/v1/admin/bookings/[id]/corrections | Case-bound exceptional command; never arbitrary field edit |
| POST /api/v1/admin/bookings/[id]/loss-resolution | Case-bound missing-unit decision; no fabricated return or financial assessment |
| GET /api/v1/admin/reviews | Moderation list |
| POST /api/v1/admin/reviews/[id]/moderation | Hide/restore without rewriting original |
| GET /api/v1/admin/support | Case queue |
| POST /api/v1/admin/support/[id]/commands | Assignment/resolution/reopening |
| GET /api/v1/admin/audit | Sensitive-operation history |
| GET /api/v1/admin/operations | Failed jobs and incident indicators |
| POST /api/internal/jobs/run | Scheduler authentication; bounded idempotent batches |
| GET /api/health | Minimal health status; no connection strings/secrets |

Administrative role provisioning is a trusted deployment procedure, not an ordinary public endpoint.

## 6. Central request contracts

### Create a reviewed estimate

~~~json
{
  "boutiqueId": "shop-id",
  "pickupAt": "2026-12-05T10:00:00+05:30",
  "returnAt": "2026-12-07T10:00:00+05:30",
  "items": [
    { "variantId": "lehenga-medium-id", "quantity": 1 },
    { "variantId": "jewellery-free-size-id", "quantity": 1 }
  ]
}
~~~

Server response includes quoteId, canonical items, availability summary, unit/line/full-period estimates, pricing units, policy version, checkedAt, expiresAt, and shop timezone/hours guidance. It never says the units are held.

### Create the request

~~~text
POST /api/v1/bookings
Idempotency-Key: client-generated-unique-key
~~~

~~~json
{
  "quoteId": "reviewed-quote-id",
  "acceptedPolicyVersion": "policy-version-id",
  "contactPhone": "+91-example",
  "note": "Optional bounded occasion note"
}
~~~

The phone value above is illustrative; validation requires an actual valid number. The server loads the quote and account, verifies prices/terms, locks eligible stock, allocates, and creates REQUESTED. The customer never supplies customerId, booking status, unit IDs, or calculated totals.

### Acknowledge a partial return

~~~json
{
  "expectedVersion": 7,
  "allocationIds": ["actual-issued-allocation-id"],
  "notes": "Received at the shop counter"
}
~~~

The server verifies that these are current issued allocations in this shop's booking. Repeating an acknowledgement does not produce duplicate returns. Remaining issued units keep the booking PICKED_UP.

### Mutation response

Return the updated DTO, current version, allowedActions, and request reference. allowedActions assists the UI but is not a permission token; the next command revalidates everything.

## 7. Query and cache behavior

Public filters: search, category, occasion, city, boutiqueId, size, colour, minRentalPrice, maxRentalPrice, pickupAt, returnAt, sort, pagination. Clearly distinguish a listed per-day price filter from a full-period rental-budget filter.

Private booking filters: status, operational flag, interval, source, and bounded customer/reference search within the authorized shop.

Public catalogue pages may cache descriptive data with invalidation after edits. Quote and reservation responses are live; customer/owner/admin private data must not leak through shared cache keys.

No payment, refund, deposit, or payout routes exist in this contract.
