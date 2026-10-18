# Customer feature implementation

Implementation update: 16 October 2026. This describes the customer feature increment in the existing application, not completion of every item in the broader planning blueprint.

## Feature audit and resulting behavior

| Requested capability | Earlier implementation | Current implementation |
| --- | --- | --- |
| Approved boutiques and real collections | Present | Retained; active owners and active categories remain required |
| Occasion/type/city/size/colour/date/price filters | Category/occasion/size/colour/price only | Added city, explicit garment type and dated stock filtering, including cleaning/known overdue stock |
| Photos, measurements, included pieces, hours, policies, reviews | Photos and reviews present | Added editable garment type, size measurements, included pieces, shop hours and public policies |
| Favourites and same-shop basket | Favourites present | Added persistent private basket; mixed-shop writes rejected |
| Outfit and jewellery suggestions | Occasion/budget preferences present | Added hard size filtering and same-shop outfit/jewellery combinations |
| Inspiration image | Missing | Consented, bounded JPEG/PNG/WebP upload; decoded and normalized; Gemini attributes reviewed before actual inventory search |
| Full-period review before request | Single-item availability quote | Added server-stored five-minute multi-item estimates and explicit terms acknowledgement |
| Requested/confirmed/collected/partial-return/completion tracking | Full-booking states only | Added returned quantities per booking line, partial return display and event timeline |
| Cancellation, reminders, problems, reviews | Cancellation and one review per booking | Added in-app notifications, scheduled email/expiry jobs, private reports/admin responses, and one review per product per booking |
| Active verified contact | Verification optional | Reservation creation always requires active account, verified email, and contact phone; phone possession is not represented as verified |
| Shop-only physical return | Owner-only whole return | Owner-only partial acknowledgements; customers cannot submit return lifecycle commands |
| No platform payment | Deposit/refund UI existed | Removed payment/deposit/refund UI from these flows; new reservations use zero legacy deposit fields and reject refund actions |

Older inventory defaults are deliberately empty rather than fabricated measurements or hours. Owners fill them through product editing and boutique settings. Product details clearly say when information has not been provided.

## Customer routes

- /marketplace: public browsing and filters; dated filters show inventory that can cover the requested interval and turnaround.
- /marketplace/[productId]: public details, selected variant/measurements, basket action, and reviewed single-item request.
- /basket: persisted same-shop items with one shared rental interval and full-period review.
- /my-rentals: requests/history, partial returns, timeline, cancellation, terms snapshot, reviews, and report links.
- /styling: size-aware occasion styling and optional inspiration image.
- /notifications: private updates and due reminders.
- /support: private problem reports and administrative responses.
- /admin/support: admin-only report queue and versioned customer-visible responses.

Approved boutique owners retain customer capabilities at other shops; they cannot reserve their own stock. Existing owner/admin workspace routes remain in use.

## Reservation API contract

First POST /api/quotes with:

~~~json
{
  "items": [
    { "variantId": "outfit-size-id", "quantity": 1 },
    { "variantId": "jewellery-size-id", "quantity": 1 }
  ],
  "pickupAt": "2026-12-05T10:00:00+05:30",
  "returnAt": "2026-12-07T10:00:00+05:30"
}
~~~

The response includes quoteId, expiresAt, line estimates, full-period rental estimate, shop hours/policy, and dates. It does not reserve stock.

Then POST /api/bookings with Idempotency-Key containing a stable client-generated UUID and:

~~~json
{
  "quoteId": "reviewed-quote-id",
  "acceptedTerms": true
}
~~~

The server derives customer, boutique, items, quantities, snapshots, and estimates from the authenticated account and stored quote. It locks the customer and variants, rechecks all inventory and prices inside a serializable transaction, enforces the pending-request cap, and creates all booking lines atomically. A changed price/policy, unavailable item, or expired quote requires another review. Duplicate submissions with the same key and quote return the same reservation.

New requests expire after 12 hours. Online pickup must be at least 24 hours ahead and within 180 days; the rental can last up to 14 days. A 24-hour stock-turnaround buffer is reserved without adding chargeable rental days. These are implemented defaults for this increment; validate them with participating shops before changing policy.

Other new endpoints:

| Endpoint | Purpose |
| --- | --- |
| GET/POST/DELETE /api/basket | Own same-shop basket |
| POST /api/quotes | Reviewed estimate |
| POST /api/inspiration | Private in-memory image interpretation with consent |
| GET/PATCH /api/notifications | Own due notifications and read acknowledgement |
| GET/POST /api/support | Own problem reports |
| GET/PATCH /api/admin/support | Administrative responses with version checks |
| POST /api/internal/notifications | Authenticated scheduled expiry/reminder delivery |

GET /api/availability is public and returns stock counts and informational rental estimates without exposing customers' schedules or identities. Public catalogue filters accept city, garmentType, pickupAt and returnAt alongside the existing filters.

## Physical return and stock readiness

An owner can submit RETURN with items containing itemId and quantity through the existing boutique booking lifecycle API. Omitting items returns all outstanding quantities for compatibility with the owner interface.

Partial returns retain PICKED_UP with partiallyReturned=true until every line is acknowledged. Full return is followed by inspection and completion. For new reservations, returned stock remains unavailable until the owner explicitly confirms cleaning with MARK_READY after the turnaround buffer. Known overdue collected stock blocks new future promises until resolved.

Stock remains pooled per size in this increment. Return readiness is conservative for the entire booking; it does not implement the planning blueprint's individual physical-unit allocations, per-unit cleaning, walk-in import, or loss-case engine. Those are separate future migrations/features. Historical completed reservations retain their earlier stock-release behavior.

## Provider and scheduler setup

1. Generate the Prisma client and apply migrations with npm.cmd run db:generate and npm.cmd run db:migrate. The migration is additive and preserves legacy history; it replaces booking-only review uniqueness with booking/product uniqueness.
2. Configure working SMTP and APP_URL. Reservation verification is mandatory even when REQUIRE_EMAIL_VERIFICATION=false permits unverified users to sign in. The profile and reservation screens provide a resend-verification action.
3. Configure GEMINI_API_KEY and GEMINI_MODEL for AI preferences. Optional GEMINI_VISION_MODEL can select a separate image-capable model. Without image configuration, the upload flow reports unavailable and manual preference styling remains usable.
4. Schedule npm.cmd run jobs:reservations every five minutes in a trusted worker, or POST to /api/internal/notifications with Authorization: Bearer followed by JOBS_SECRET (at least 32 random characters).
5. Jobs expire pending requests, create overdue reminders, send due notifications, and clean old quotes. Database notification records deduplicate domain events; SMTP uses bounded retries and leases. Delivery is at least once across a crash between SMTP success and recording that success.

In-app notices work independently of SMTP. Future reminders become visible when due. Delayed expiry jobs cannot make expired holds reserve stock or permit expired requests to be confirmed.

Inspiration files are processed in memory, metadata removed, normalized to bounded JPEG, and sent to the configured Gemini model after explicit consent. Rentique stores no inspiration image or public upload URL. Extraction is not exact-image retrieval; users review outfit/colour/jewellery attributes before catalogue matching. The provider's own handling remains subject to its configured account terms.

## Verification and limits

Automated verification includes unit/service tests, real PostgreSQL HTTP integration suites, TypeScript, lint, and production build. Coverage includes same-shop enforcement, verified contact, atomic multi-item allocation, stock races, idempotency, partial returns, review eligibility, notification expiry, and report permissions.

Integration testing must use a disposable migrated PostgreSQL database and the same database in the test application. Disable SMTP, Google sign-in, and Gemini on that application to avoid external side effects. Set JOBS_SECRET in both the test application and runner to exercise scheduled-job authentication and expiry.

Visual browser testing requires a connected browser. Live email delivery and live inspiration-image interpretation require configured providers and are separate from mocked provider/transport tests.
