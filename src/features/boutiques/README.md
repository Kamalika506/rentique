# Boutique management

Member 3 owns boutique overview, profile/settings UI, onboarding, inventory, booking management UI, and rental calendar UI here. Reuse the existing feature folder rather than creating another boutique domain.

Future feature components reuse `@/components/ui` (shadcn `base-nova`, Base UI), theme tokens in `globals.css`, and `cn` from `@/lib/utils`. Do not introduce Radix primitives or assume Radix `asChild` conventions apply to Base UI.

Keep mock data access in `adapters/mock`; do not place fixtures or direct fetch calls in UI components. Authentication, Prisma models, booking lifecycle, and access enforcement remain Member 2's responsibility. See [implementation plan](../../../docs/MEMBER3_IMPLEMENTATION.md).
