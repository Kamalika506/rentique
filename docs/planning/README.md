# Rentique: full-stack project blueprint

Planning baseline: 16 October 2026.

**Product:** a marketplace for women's traditional occasion wear and coordinated accessories. Customers discover and reserve actual boutique inventory, collect it at the shop, and return it to the shop.

**Confirmed scope:** show informational rental prices; provide no payment functionality. There is no checkout payment, payment gateway, deposit ledger, payment confirmation, refund workflow, commission calculation, or vendor payout in this design. Any financial arrangement belongs to the shop and is outside Rentique.

These documents describe a **proposed target design**, not features already implemented or research already performed. Existing application code must be checked against the design before reuse. Writing these documents now does not establish that the earlier implementation followed SDLC.

The [customer implementation audit](../CUSTOMER_FEATURES.md) records the customer increment now implemented in code and distinguishes it from the remaining target architecture.

## Read in this order

1. [Product scope and role features](PRODUCT_AND_ROLES.md): what the platform does, permissions, pages, priorities, and success criteria.
2. [Business rules and rental lifecycle](BUSINESS_RULES.md): booking states, physical stock, walk-ins, cancellations, late returns, cleaning, and operational exceptions.
3. [Database and architecture](DATABASE_AND_ARCHITECTURE.md): entities, relationships, database constraints, concurrency, AI boundaries, and deployment design.
4. [Routes and API contracts](ROUTES_AND_API.md): canonical URLs, access rules, request contracts, and error behavior.
5. [SDLC, delivery, and verification](SDLC_AND_TESTING.md): a three-person delivery plan, acceptance tests, production roadmap, and presentation evidence.

## Important decisions

| Decision | Baseline |
| --- | --- |
| Fulfilment | Customer pickup and return at the same boutique; no delivery |
| Booking | Boutique approves a request; requesting alone is not confirmation |
| Reservation scope | One boutique and one rental interval per booking; multiple items allowed |
| Stock model | Track individual physical pieces within each size/variant |
| Offline activity | Shop walk-ins use the same booking and stock rules |
| Customer/owner roles | An approved owner can also be a customer at other shops |
| Administrator | Separate privileged account; no public admin registration |
| Availability | Server/database controlled; quotes do not reserve stock |
| Return | Physical return, inspection, cleaning, and readiness are separate events |
| AI | Retrieves real products; cannot invent inventory or override booking rules |
| Money | Informational rental prices only |
| Implementation | One modular application and PostgreSQL database first |

Policy numbers such as request expiry and rental length are **proposed configurable defaults**. Validate them with actual boutiques before a public pilot. Do not describe untested performance targets or planned features as achieved results.
