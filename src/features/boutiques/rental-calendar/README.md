# Rental calendar

Implemented `/boutique/calendar` with month navigation, month picker, reference-month action, refresh, rental date ranges, pickup/return markers, tentative pending styling and event links to booking details. The calendar scrolls horizontally on narrow screens and supports keyboard navigation through event links.

Calendar events come from the booking service in boutique-local dates. `dates.ts` generates display cells only; it never calculates availability or stock. The isolated demo adapter illustrates ranges, while real conflicts, holds, availability and permitted actions remain Member 2's booking backend responsibility. See [integration details](../../../../docs/MEMBER3_IMPLEMENTATION.md).
