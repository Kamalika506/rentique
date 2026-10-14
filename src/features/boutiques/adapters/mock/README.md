# Boutique mock adapter boundary

`onboarding.ts` implements an explicitly selected, in-memory boutique onboarding demo adapter. It validates inputs, creates only PENDING applications, rejects same-session duplicates, and returns defensive copies. No data is persisted; refresh clears the provider session.

`dashboard.ts` implements an independent, read-only sample dashboard service with fixed-date fixtures and an empty scenario. It supplies consistent metrics, inventory, recent bookings, pickups and returns. Fixture aggregation is demo-only, not database or booking business logic; a real backend must supply authoritative totals and enforce approved boutique access.

`products.ts` implements a scoped, mutable inventory demo: listing, lookup, create/edit, archive/unarchive, version conflict detection, and browser-memory image selection. It stores no data outside the current provider instance. Its records are separate from the dashboard's frozen report fixtures.

The onboarding service types live in `../../onboarding/service.ts`. Define agreed UI-facing types before adding other adapters. Return clearly identified mock results; simulate mutations only in memory and disclose that changes are not persisted. Do not call guessed API endpoints, access Prisma, or read credentials. A later real adapter must implement the same agreed boundary and be selected explicitly; API failures must never silently fall back to mock data.
