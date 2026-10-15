# Rentique

**Discover your next favourite look.**

Rentique is a fashion rental marketplace connecting customers with boutiques for weddings, celebrations, and everyday occasions. Customers discover outfits and manage rentals, boutique owners manage their storefronts and inventory, and administrators oversee marketplace operations.

## Platform capabilities

| Workspace | Capabilities |
| --- | --- |
| Customer | Browse and filter collections, explore boutiques, save a wishlist, receive occasion styling suggestions, check dated availability, request rentals, and review completed rentals. |
| Boutique | Submit an application, manage a storefront, upload product images, maintain stock and pricing, process bookings, and view a rental calendar and analytics. |
| Administrator | Review boutique applications, manage accounts and categories, moderate products and reviews, and monitor bookings and activity. |

Availability and pricing are checked on the server when a booking is submitted. Payment collection is arranged with the boutique; the application does not currently integrate a payment gateway. Manual refund records track status and do not transfer funds.

## Technology

| Layer | Implementation |
| --- | --- |
| Application | Next.js 16.4 App Router, React 19, TypeScript |
| Styling | Tailwind CSS 4, CSS Modules, Base UI |
| Backend | Next.js route handlers and server-side services |
| Persistence | PostgreSQL with Prisma 6 |
| Authentication | Auth.js credentials sessions and optional Google sign-in |
| Product images | Cloudinary |
| Styling recommendations | Inventory-based rules with optional Gemini preference interpretation |
| Verification | ESLint, TypeScript, Node.js test runner through `tsx` |

## Local development

### Prerequisites

- Node.js 20.9 or newer and npm.
- A PostgreSQL database and permission to apply the repository's migrations.
- Cloudinary credentials for boutique image uploads and the deployment readiness checks.

### Installation

Run the following from the repository root. The examples use Windows PowerShell; on macOS or Linux, use `npm` and `npx` in place of `npm.cmd` and `npx.cmd`.

```powershell
npm.cmd ci
Copy-Item .env.example .env.local
```

For an existing checkout, keep your configured `.env.local` rather than copying over it. Set the environment values described below before continuing.

```powershell
npm.cmd run db:generate
npm.cmd run db:migrate
```

Provision the administrator using the instructions below, then check local readiness and start the application:

```powershell
npm.cmd run check:local
npm.cmd run dev
```

Open [localhost:3000](http://localhost:3000). `db:migrate` applies existing migrations to the configured database. The local checker reports configuration and database readiness, including whether an administrator has been provisioned.

### Environment configuration

[`.env.example`](.env.example) is the configuration reference. Keep credentials in the ignored `.env.local` file or your deployment environment. Do not commit secrets or expose server credentials through `NEXT_PUBLIC_` variables.

| Variables | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string. Required for database-backed features and migrations. |
| `AUTH_SECRET` | Random authentication secret of at least 32 characters. |
| `APP_URL` | Application origin: `http://localhost:3000` locally and the public HTTPS origin when deployed. |
| `ADMIN_EMAIL` | Account used by the administrator provisioning command. |
| `AUTH_TRUST_HOST` | Enable only when the application's proxy and forwarded headers are trusted. |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Authenticated product image uploads. See `.env.example` for the signed upload preset setting. |
| `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` | Optional Google sign-in; configure both together. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `EMAIL_FROM` | Outgoing notifications and recovery emails. `EMAIL_FROM` defaults to `SMTP_USER`. |
| `REQUIRE_EMAIL_VERIFICATION` | Defaults to `false`. Enable after SMTP and the application URL are configured and delivery has been tested. |
| `GEMINI_API_KEY`, `GEMINI_MODEL` | Optional AI preference interpretation; configure both together. Recommendations use deterministic rules when Gemini is unavailable. |

The Prisma configuration loads `.env.local` before `.env`, and explicit shell variables take precedence. See the [setup and API guide](docs/CUSTOMER_BOUTIQUE_API.md) for provider configuration and integration details.

### Administrator setup

Set `ADMIN_EMAIL` to the intended administrator account, then provision it through the trusted command:

```powershell
# Promote an existing account.
npm.cmd run admin:provision

# Alternatively, create a new administrator account.
npm.cmd run admin:provision -- --create
```

For a new account, the initial password is saved to the ignored `.tmp/admin-credentials.txt` file. Sign in at `/login?intent=admin` and change the password at `/change-password`. Boutique owners must use a separate administrator account. Public registration cannot create an administrator.

## Repository structure

```text
src/
  app/           Pages, layouts, and API route handlers
  components/    Shared interface components and providers
  features/      Domain features, services, contracts, and workspaces
  lib/           API, database, email, and shared utilities
  types/         Shared type declarations
  auth.ts        Authentication configuration
prisma/          Database schema, migrations, and development seed assets
scripts/         Provisioning, readiness checks, and data utilities
tests/           Unit/service tests and HTTP integration suites
docs/            Setup, API contracts, and implementation documentation
```

The Prisma client is generated into `src/generated/prisma`; run `db:generate` after installation or schema changes.

## Development commands

| Command | Purpose |
| --- | --- |
| `npm.cmd run dev` | Start the development server. |
| `npm.cmd run build` | Create the production build. |
| `npm.cmd start` | Serve an existing production build. |
| `npm.cmd run lint` | Run ESLint. |
| `npx.cmd tsc --noEmit --incremental false` | Check TypeScript without emitting files. |
| `npm.cmd test` | Run unit and service tests. |
| `npm.cmd run test:integration` | Run HTTP integration suites against an isolated test application and database. |
| `npm.cmd run db:generate` | Generate the Prisma client. |
| `npm.cmd run db:migrate` | Apply existing database migrations. |
| `npm.cmd run check:local` | Run read-only local readiness checks. |
| `npm.cmd run check:deployment` | Run read-only production readiness checks. |

Optional sample-data commands are `npm.cmd run db:seed` and `npm.cmd run db:seed:tifara`. These write database records and upload images to Cloudinary; use a development database and configured image account.

## Quality checks

Before submitting a change, run:

```powershell
npm.cmd run lint
npx.cmd tsc --noEmit --incremental false
npm.cmd test
npm.cmd run build
```

Integration suites create and remove fixtures. Run them only against a disposable, migrated PostgreSQL database with an application using that same database. Set `RENTIQUE_TEST_URL` to the test server origin and disable SMTP and Google sign-in for that application. Follow the [integration setup instructions](docs/CUSTOMER_BOUTIQUE_API.md#verification-and-deployment) for the full procedure.

Keep changes focused, follow the existing feature structure, document environment or API changes, and include relevant verification results in the pull request. Read [AGENTS.md](AGENTS.md) before using coding agents; this repository requires checking the installed Next.js guides before framework changes.

## Deployment

Configure the deployment environment with the database connection, authentication secret, public HTTPS origin, and required providers. Configure Google OAuth callback URLs for that origin if Google sign-in is enabled.

```powershell
npm.cmd ci
npm.cmd run db:generate
npm.cmd run db:migrate
```

Provision the administrator as described above before running the production readiness check:

```powershell
npm.cmd run check:deployment
npm.cmd run build
npm.cmd start
```

Use the host's release process to apply migrations to the intended database before serving the updated application. Configure database backups, monitoring, and provider delivery checks for the deployment environment. `/api/health` provides a request-time database health endpoint.

## Troubleshooting

- **PowerShell says scripts are disabled:** use `npm.cmd` and `npx.cmd` as shown above. This avoids the blocked PowerShell wrappers without changing the system execution policy.
- **Prisma client is missing:** run `npm.cmd run db:generate`.
- **Database or schema checks fail:** verify `DATABASE_URL`, database connectivity, and applied migrations with `npm.cmd run check:local`.
- **Boutique access redirects:** management requires an approved boutique owner account. A customer visiting `/boutique/pending` is redirected to `/profile`; signed-out visitors are sent to boutique sign-in.
- **Instant validation reports `NEXT_REDIRECT` on the pending page:** the account guard can redirect before the page renders. That page explicitly allows blocking with `instant = false`, while retaining its authentication checks.
- **Email is unavailable:** configure SMTP and a valid `APP_URL`. For Gmail, use an app password. Keep mandatory verification disabled until delivery works.

## Documentation

- [Setup, provider configuration, API contracts, and integration verification](docs/CUSTOMER_BOUTIQUE_API.md)
- [Boutique feature documentation](src/features/boutiques/README.md)
- [Recommendation engine](src/features/recommendations/README.md)
- [Analytics](src/features/analytics/README.md)
