# Booking management UI

Implemented `/boutique/bookings` and `/boutique/bookings/[id]` with search/status filters, customer/products/date/charge/deposit details, service-provided confirm/reject actions, decision confirmation/reason dialogs, upcoming pickups/returns and load/error/empty states.

`service.ts` defines the UI-facing contract; `provider.tsx` selects the isolated `../adapters/mock/bookings.ts` adapter until Member 2 supplies shared APIs. Decisions modify fictional records in memory only; no availability, stock reservations, payments or notifications are implemented. Demo status vocabulary is provisional and must map to Member 2's canonical definitions.

The provider is shared with the rental calendar, so demo decisions survive navigation and update calendar events. Refresh resets fixtures. Authentication, approved boutique ownership, permitted transitions and real booking availability remain backend responsibilities. See [required contracts and tests](../../../../docs/MEMBER3_IMPLEMENTATION.md).

Booking details now expose the requested full rental lifecycle, inspection condition/notes, and manually reported refund status. `applyLifecycleAction` is the replaceable mutation boundary; confirmation dialogs use only service-provided capabilities. The demo enforces ordered fixture transitions and inspection before completion without changing inventory or moving money. Rejected/cancelled outcomes, stale versions and foreign records are tested. No lifecycle metadata is persisted to PostgreSQL in demo mode.
