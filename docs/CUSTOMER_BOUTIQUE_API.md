# Customer and boutique integration

The customer marketplace, product details, rental orders, profile, wishlist, and boutique management now use PostgreSQL records through API routes. Production providers use the live adapters; the mock adapters remain available for fixture tests.

## Local setup

Set `DATABASE_URL` and `AUTH_SECRET` in `.env.local`. Both are currently empty in this checkout. Use a PostgreSQL connection URL for your development database and generate a secret with:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Then run:

```powershell
npm.cmd install
npm.cmd run db:generate
npm.cmd run db:migrate
npm.cmd run dev
```

Prisma commands read `.env.local` before `.env`; shell variables take precedence. `db:migrate` applies the existing migration, so use a development database you intend to initialize. No new migration is needed for this integration.

Image uploads require `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET`. Uploads go through the authenticated server and use boutique-specific asset paths. The live upload endpoint does not require a signed upload preset. Recommendations use database availability and full-period quotes; Gemini is optional and requires both `GEMINI_API_KEY` and `GEMINI_MODEL`.

## Try the complete flow

1. Register a customer at `/register`, then sign in at `/login`.
2. Start with **Boutique registration** on the home page and use a separate owner account. New owners create an account and continue to `/boutique/register`; existing accounts can sign in to continue. Submitting the boutique application opens the login page. Owner login then opens `/boutique/dashboard`. Its application starts as `PENDING`, so management remains unavailable until approval.
3. A trusted operator must provision an existing account with `User.role = ADMIN` in the database. Admin role cannot be requested during public registration. Sign in as that admin and review `/admin/boutiques`.
4. After approval, the owner can add products at `/boutique/products/new`. The current inventory form creates one size per listing, with quantity and daily INR pricing. Images are optional.
5. The published product appears in `/marketplace` and on the home page. As the customer, select its size, quantity, pickup and return times, then place the order.
6. The request appears as `PENDING` at `/boutique/bookings`. The owner can confirm or reject it, record pickup and return, inspect it, then complete it. Inspection is required before completion.
7. `/my-rentals` reads the same booking records and refreshes every 30 seconds, on window focus, or with the refresh button. Customer cancellation is available while the booking is pending or confirmed.

Payment collection is outside this implementation. Customers arrange payment and pickup with the boutique. The boutique can record manual deposit-refund status; that operation does not move money.

## API routes

| Route | Methods | Access and behavior |
| --- | --- | --- |
| `/api/products` | GET | Public catalog of approved boutiques with active owners and unarchived products. `?id=...` reads one listing. |
| `/api/bookings` | GET, POST, PATCH | Customer's rental history, create a request, or cancel their pending/confirmed request. |
| `/api/profile` | GET, PATCH | Authenticated account details; update name and phone. |
| `/api/wishlist` | GET, POST, DELETE | Customer's saved product IDs; add/remove with `{ productId }`. |
| `/api/boutique/application` | GET, POST | Read or submit the signed-in account's application. Rejected applications can be resubmitted. |
| `/api/admin/boutiques` | GET, PATCH | Admin-only pending applications and approval/rejection. |
| `/api/boutique/products` | GET, POST, PUT, PATCH | Approved owner's inventory, create/edit, or archive/unarchive. `?id=...` reads one product. |
| `/api/boutique/images` | POST | Approved owner's multipart image upload (`files`, optional `productId`). |
| `/api/boutique/bookings` | GET, PATCH | Approved owner's bookings and lifecycle updates. Supports `id`, `search`, and `status` query parameters. |
| `/api/boutique/calendar` | GET | Owner's rental calendar; `?month=YYYY-MM`. |
| `/api/boutique/dashboard` | GET | Owner's inventory, booking totals, upcoming handovers, and completed rental revenue. |
| `/api/boutique/analytics` | GET | Owner's reporting dataset from persisted bookings. |
| `/api/recommendations` | POST | Existing recommendation contract, now backed by approved inventory and reservation checks. |

Create an order with:

```json
{
  "variantId": "variant-id-from-product-response",
  "quantity": 1,
  "pickupAt": "2027-01-10T10:00:00+05:30",
  "returnAt": "2027-01-13T10:00:00+05:30"
}
```

The server derives the customer, boutique, prices and product snapshots. Money responses use integer paise for `rentalMinor` and `depositMinor`. The catalog's `price` field is rupees for display. Per-day rates round partial days up; per-rental rates are charged once per unit. Pickup must be in the future, return must follow pickup, and rentals may span up to 90 days. Intervals are pickup-inclusive and return-exclusive.

Pending and confirmed requests, plus picked-up rentals, reserve stock for their intervals. Serializable booking transactions prevent simultaneous requests from claiming the final unit. Rejected/cancelled requests release their reservations. Responses return `409` when stock or the submitted record version conflicts; clients should reload before retrying.

Boutique lifecycle requests use `{ id, version, command }`, for example `command: { action: "CONFIRM" }`. Rejection/cancellation require a reason. Inspection and manual refund commands use the schemas in `booking-management/lifecycle.ts`. Product mutations use `{ input }` for creation, `{ id, version, input }` for editing, and `{ id, version, archived }` for archiving. Ownership is checked on the server, and archived products retain their booking history.

The existing `/admin`, `/admin/products`, `/admin/bookings`, `/admin/customers`, and `/admin/analytics` overview screens still contain sample data; use `/admin/boutiques` for the implemented approval workflow. They are separate from the connected boutique workspace. The existing boutique settings placeholder is also unchanged.

## Verification

```powershell
npm.cmd test
npm.cmd run lint
npx.cmd tsc --noEmit --incremental false
npm.cmd run build
```

The integration test creates and removes its own accounts, boutiques, products and orders. Run it only against a disposable migrated local database, with an app pointed at the same database:

```powershell
$env:DATABASE_URL='postgresql://test-user:test-password@127.0.0.1:5432/rentique_test'
$env:RENTIQUE_TEST_URL='http://127.0.0.1:3100'
npm.cmd run test:integration
```

The local app also needs a valid `AUTH_SECRET`; start it on port 3100 with `AUTH_TRUST_HOST=true` when testing locally. The test checks actual credential sessions, role/ownership checks, approval, inventory publishing, persistent wishlist changes, authoritative prices, simultaneous stock claims, recommendations, lifecycle transitions, dashboard totals, customer history, cancellation, and archiving.

Validation performed: 48 service/rule tests passed; database-backed HTTP integration passed against both development and production servers; production build, TypeScript, and diff checks passed. Lint has one pre-existing unused-import warning in `/admin/page.tsx`. HTTP smoke checks returned 200 for customer and boutique pages. Visual browser testing was unavailable because no browser session was connected. External Cloudinary uploads and Gemini calls were not exercised.
