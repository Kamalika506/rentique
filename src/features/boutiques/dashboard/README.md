# Boutique dashboard

`/boutique/dashboard` hosts a read-only overview and URL-driven inventory, booking and rental schedule previews. Reusable sidebar and top navigation share desktop/mobile destinations. Cards, filters, booking detail links, refresh, empty-state preview, and CSV export have working behaviors.

`service.ts` defines a replaceable `BoutiqueDashboardService`. The explicit demo adapter in `../adapters/mock/dashboard.ts` returns fictional fixtures as of 11 October 2026, independent of onboarding. No persistence, authentication, database access, or booking mutations are implemented. A real client adapter must call approved endpoints with backend-enforced approved-boutique ownership and must never silently fall back to demos.

See [service definitions, action map, and blockers](../../../../docs/MEMBER3_IMPLEMENTATION.md).
