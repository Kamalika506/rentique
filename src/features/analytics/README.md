# Boutique analytics

Member 3's read-only reporting module powers `/boutique/analytics`. `calculations.ts` contains tested pure calculations and runtime input validation; `service.ts` defines the complete, boutique-scoped reporting snapshot. The screen accepts a replaceable `BoutiqueAnalyticsService` and defaults to the isolated fictional adapter in `adapters/mock/analytics.ts`. No backend endpoints are presumed available.

See [implementation contracts and blockers](../../../docs/MEMBER3_IMPLEMENTATION.md) for cohort definitions, revenue exclusions, historical utilization evidence, and Member 2's authorization requirements. Reporting never decides rental availability or changes bookings.
