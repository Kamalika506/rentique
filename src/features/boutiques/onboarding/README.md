# Boutique onboarding

Registration and application status UI are implemented here, using React Hook Form, Zod, Base UI inputs and the existing shadcn Base UI button. `schema.ts` defines registration validation; `service.ts` defines the replaceable service contract; `provider.tsx` explicitly selects the demo service until real endpoints are available.

The demo adapter in `../adapters/mock/onboarding.ts` creates PENDING applications in memory only. Refresh clears them; nothing is sent for review. Pending, approved and rejected status UI includes separately labeled demo previews that cannot change a submitted application or enable management.

Member 2 must supply authenticated persistence and enforce approved boutique ownership on every management operation. Member 1 owns the approval/admin flow. See [implementation and integration details](../../../../docs/MEMBER3_IMPLEMENTATION.md).
