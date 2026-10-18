# Rentique setup and connected modules

> Customer contract update, 16 October 2026: use the [customer feature guide](CUSTOMER_FEATURES.md) for reviewed multi-item quotes, verified-email reservations, partial returns, image matching, and notifications. The older direct single-variant booking body and deposit/refund descriptions below are superseded by that guide. Existing history is preserved; new reservations have no deposit/refund functionality.

Rentique uses Next.js App Router, React, TypeScript and Tailwind for the interface; Next.js route handlers for the backend; Auth.js for credentials/optional Google authentication; and Prisma with PostgreSQL for persistence. Customer, boutique and administrator screens use live APIs. Demo adapters are retained only for fixture tests.

## Local setup

Keep credentials in ignored `.env.local`. `.env.example` documents the supported variables. Shell variables take precedence over local files.

```powershell
npm.cmd ci
npm.cmd run db:generate
npm.cmd run db:migrate
npm.cmd run check:local
npm.cmd run dev
```

Set `DATABASE_URL` and a random `AUTH_SECRET` of at least 32 characters. The additive `20261014090000_complete_modules` migration adds editable categories, review moderation, audit history, recovery tokens, persistent rate limits and session revocation. Apply migrations to each environment before serving this version.

`CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY` and `CLOUDINARY_API_SECRET` enable authenticated boutique image uploads. `GEMINI_API_KEY` and `GEMINI_MODEL` enable AI preference interpretation; recommendations still enforce real inventory, availability and budget constraints. Missing or failed Gemini calls use deterministic rules.

## Administrator and Gmail sending

The configured administrator is `mladybuglore@gmail.com`. Public registration cannot request an administrator role. Provisioning is a trusted local/deployment command:

```powershell
npm.cmd run admin:provision
# For a new administrator without an existing account:
npm.cmd run admin:provision -- --create
```

The creation command writes the generated initial password to ignored `.tmp/admin-credentials.txt`, without printing it or overwriting an existing credential file. Promotion of an existing account keeps its password and invalidates existing sessions. Boutique owners must use a separate administrator account. Sign in at `/login?intent=admin`, change the initial password at `/change-password`, and review applications at `/admin/boutiques`.

No custom email domain is required. To send from the existing Gmail address, use:

```dotenv
ADMIN_EMAIL=mladybuglore@gmail.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=mladybuglore@gmail.com
SMTP_PASSWORD=
EMAIL_FROM=mladybuglore@gmail.com
APP_URL=http://localhost:3000
REQUIRE_EMAIL_VERIFICATION=false
```

Fill `SMTP_PASSWORD` locally with a Google **app password**, never the regular Gmail password. Enable Google 2-Step Verification and generate an app password as described in [Google's instructions](https://support.google.com/accounts/answer/185833?hl=en). Keep the value out of chat and Git, and restart the server after changing environment variables. `EMAIL_FROM` accepts a plain email address and defaults to `SMTP_USER`.

Approval/rejection/reopening commits to PostgreSQL before an optional email is attempted. A mail failure does not reverse the decision. The admin screen reports delivery status, and owners can always see their status after signing in. Recovery emails require working SMTP and a valid `APP_URL`; reset and verification tokens expire and are single-use. Keep verification optional until email delivery has been tested.

## Connected journeys

1. Register a customer at `/register`, sign in and edit `/profile`. Browse `/marketplace` or `/boutiques`, filter products, save a wishlist and explore `/styling`.
2. Start **Boutique registration** from the home page using a separate owner account. Submit `/boutique/register`, then sign in to see the pending application. Management is available after admin approval; pending owners may edit `/boutique/settings`.
3. The administrator approves or rejects `/admin/boutiques`, manages accounts and categories, archives products, moderates reviews and monitors actual bookings/activity.
4. Approved owners create/edit/archive products, upload gallery images, set stock and daily or per-rental prices, and edit their public storefront profile.
5. Customers select size, quantity and pickup/return times. **Check availability** returns a dated quote. Booking submission rechecks stock and authoritative prices within a serializable transaction.
6. Requests appear at `/boutique/bookings`; owners confirm/reject, record pickup and return, inspect the items, and complete the rental. Customer `/my-rentals` tracks the same records and includes rental history.
7. Customers with completed rentals can leave one review per rented product/booking. Public ratings exclude reviews hidden by moderators.

The inventory editor currently creates one size per listing, with a quantity for that size. Payment collection is arranged with the boutique. Manual refund records track status but do not move money; no payment gateway is configured.

## API contracts

All authenticated data is private and uncached. Writes validate origin, role, ownership and input; record versions prevent stale edits.

| Route | Methods | Access and behavior |
| --- | --- | --- |
| `/api/register` | POST | Customer or boutique owner account creation, bcrypt password hashing and rate limiting; cannot set ADMIN. |
| `/api/auth/[...nextauth]` | GET, POST | Auth.js credentials sessions and optional Google OAuth. |
| `/api/profile` | GET, PATCH | Authenticated profile; update name/phone. |
| `/api/profile/password` | PATCH | Verify current password, change password and revoke existing sessions. |
| `/api/auth/forgot-password`, `/api/auth/verification-email` | POST | Rate-limited outgoing recovery/verification links. |
| `/api/auth/reset-password`, `/api/auth/verify-email` | POST | Consume purpose-bound, hashed, expiring, single-use tokens. |
| `/api/categories` | GET | Active categories shared by marketplace and inventory editor. |
| `/api/products` | GET | Public approved/active inventory; `id` reads one product. |
| `/api/boutiques`, `/api/boutiques/[id]` | GET | Approved public storefronts and profile data; no private owner fields. |
| `/api/availability` | GET | Date-specific variant availability and server-calculated price quote. |
| `/api/bookings` | GET, POST, PATCH | Customer rental history, create a request or cancel pending/confirmed bookings. |
| `/api/wishlist` | GET, POST, DELETE | Customer's saved product IDs; mutation body `{productId}`. |
| `/api/reviews` | GET, POST | Public visible reviews and ratings; eligible completed-rental customer review submission. |
| `/api/recommendations` | POST | Occasion styling against database inventory; Gemini preference interpretation with rules fallback. |
| `/api/boutique/application` | GET, POST | Signed-in owner's application; rejected applications may be resubmitted. |
| `/api/boutique/settings` | GET, PATCH | Owner profile/settings; cannot set ownership, approval or reviewer fields. |
| `/api/boutique/products` | GET, POST, PUT, PATCH | Approved owner's inventory, create/edit and archive/unarchive. |
| `/api/boutique/images` | POST | Approved owner's verified Cloudinary image upload. |
| `/api/boutique/bookings` | GET, PATCH | Approved owner's requests and full rental lifecycle. |
| `/api/boutique/calendar` | GET | Persisted booking calendar, with `month=YYYY-MM`. |
| `/api/boutique/dashboard`, `/api/boutique/analytics` | GET | Actual inventory, bookings, revenue and product popularity. |
| `/api/admin/dashboard`, `/api/admin/bookings`, `/api/admin/activity` | GET | Admin-only real totals, bookings and audit/activity monitoring. |
| `/api/admin/users` | GET, PATCH | Admin-only activation/deactivation, with session revocation and self/last-admin safeguards. |
| `/api/admin/boutiques` | GET, PATCH | Admin-only paginated registration management and optional owner notifications. |
| `/api/admin/products` | GET, PATCH | Admin-only product moderation, version checked and audited. |
| `/api/admin/categories` | GET, POST, PATCH | Admin-only editable categories, slugs and active status. |
| `/api/admin/reviews` | GET, PATCH | Admin-only hide/restore reviews with a moderation reason. |
| `/api/health` | GET | Request-time database health without configuration details. |

Catalog filters: `search`, `category` (slug/ID or legacy name), `occasion`, `colour`, `size`, `minPrice`, `maxPrice`, `sort`, `boutiqueId`, `page`, `pageSize`. Price filters use rupees. With `page` or `paged=1`, results include `{items,total,page,pageSize,totalPages,facets}`. Without paging, the legacy array response is retained for existing home/wishlist consumers. Product detail includes gallery images, variant IDs, prices, deposits, rating counts and public boutique details. Admin resources return `{items,total,page,pageSize,pages}`.

Availability parameters and booking creation body use the same rental fields:

```json
{
  "variantId": "variant-id-from-product-response",
  "quantity": 1,
  "pickupAt": "2027-01-10T10:00:00+05:30",
  "returnAt": "2027-01-13T10:00:00+05:30"
}
```

`GET /api/availability` requires sign-in and takes these as query parameters and returns availability, free units, rental days and integer-paise rental/deposit/total prices. `POST /api/bookings` takes JSON, deriving customer, boutique and price snapshots on the server. Pickup must be future, return must follow pickup, and the interval is limited to 90 days. Daily pricing rounds partial days up; per-rental pricing charges once per unit. Pending, confirmed and picked-up bookings reserve stock. Reservations are pickup-inclusive/return-exclusive, and capacity uses peak simultaneous reservations. A quote is informational; booking creation always rechecks and can return 409 after another customer reserves the stock.

Booking lifecycle writes use `{id,version,command}`. Product creation uses `{input}`, editing `{id,version,input}`, archiving `{id,version,archived}`. Review creation uses `{bookingId,productId,rating,comment}`. Boutique decisions use `{id,version,status,reason?}` and return the updated record with `notification.status` (`sent`, `not_configured` or `failed`).

## Verification and deployment

```powershell
npm.cmd test
npm.cmd run lint
npx.cmd tsc --noEmit --incremental false
npm.cmd run build
npm.cmd run check:local
```

The integration suites create and remove fixtures. Use only a disposable, migrated PostgreSQL database and an app pointing to that same database. Disable SMTP and Google sign-in on the test app to avoid external side effects:

```powershell
$env:DATABASE_URL='postgresql://test-user:test-password@127.0.0.1:5432/rentique_test'
$env:AUTH_SECRET='isolated-test-secret-at-least-32-characters'
$env:AUTH_TRUST_HOST='true'
$env:SMTP_PASSWORD=''
$env:AUTH_GOOGLE_ID=''
$env:AUTH_GOOGLE_SECRET=''
$env:REQUIRE_EMAIL_VERIFICATION='false'
npm.cmd run db:migrate
npm.cmd run build
npm.cmd run start -- --hostname 127.0.0.1 --port 3101
# In a second terminal, using the same test database:
$env:RENTIQUE_TEST_URL='http://127.0.0.1:3101'
npm.cmd run test:integration
```

Verified: 56 service/rule/security tests, both full HTTP integration suites against the production server, TypeScript, ESLint and production build. Integration covers sessions, role redirects, approval/rejection, ownership, filters, storefronts/settings, quotes/stock conflicts, wishlist, complete rental lifecycle, review eligibility/moderation, category management, account/session revocation, recovery-token expiry/replay and rate limits. Previous live provider checks verified a temporary Cloudinary upload/gallery/CDN asset (removed afterward) and Gemini structured output. Browser click/visual testing was unavailable because no browser session was connected. Gmail delivery remains unverified until the app password is configured.

Before deploying, configure the host's server-side environment variables and set `APP_URL` to the real HTTPS origin (and `AUTH_URL` if explicitly used). Google OAuth redirect URLs must match that origin. Run `npm run db:generate`, `npm run db:migrate`, `npm run check:deployment`, then build/start. The deployment checker is read-only and checks schema/migrations, the configured administrator, database connectivity, secret placement and provider configuration. A local HTTP URL intentionally fails the production URL check. Choose a production host and configure backups/monitoring separately; this checkout has not been published.
