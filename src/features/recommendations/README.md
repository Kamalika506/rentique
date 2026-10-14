# AI recommendations

Server entry: `createServerRecommendationService(inventoryAdapter)` in `server.ts`, protected by `server-only`. `POST /api/recommendations` uses this entry. Until shared inventory and availability are integrated, dated requests return HTTP 503 with `INVENTORY_UNAVAILABLE` and no products. There are no production mock products or invented database endpoints.

`contracts.ts` contains input/output Zod schemas and the inventory boundary. `engine.ts` handles deterministic filtering, complete-look budgets and rule fallback. `gemini.ts` uses structured JSON for style tags only; the server entry injects private credentials. Tests inject an inventory adapter and fake Gemini transport without calling Google or a database.

See [implementation contracts and blockers](../../../docs/MEMBER3_IMPLEMENTATION.md). Customer marketplace styling UI placement remains Member 1's responsibility.
