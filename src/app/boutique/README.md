# Boutique management

The boutique workspace uses authenticated PostgreSQL-backed API routes for registration/status, inventory and image uploads, bookings and inspections, calendar availability, settings, dashboard and analytics. Management routes require an approved boutique and verify ownership on every API operation. Pending owners can view their application and edit their profile. Demo services remain available for isolated fixture tests.

Keep route files thin and compose modules from `@/features/boutiques`, `@/features/analytics`, and `@/features/recommendations`. See [current setup, API contracts and verification](../../../docs/CUSTOMER_BOUTIQUE_API.md). The [original member implementation notes](../../../docs/MEMBER3_IMPLEMENTATION.md) describe the earlier demo scaffold.
