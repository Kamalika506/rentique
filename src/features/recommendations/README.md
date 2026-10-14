# AI recommendations

Customer screen: `/styling`, linked from the customer navigation and marketplace. It collects occasion, full-period INR rental budget, outfit, colour, jewellery, date and optional city preferences. Result cards link to real products and their boutique storefronts. Deposits are disclosed as additional, and each product booking rechecks availability.

Server entry: `createServerRecommendationService(inventoryAdapter)` in `server.ts`, protected by `server-only`. `POST /api/recommendations` uses this entry. The default adapter reads active products from approved, active boutiques, excludes disabled categories, and checks peak concurrent reservations for each size. Rental prices cover the entire date interval. Missing database access returns HTTP 503 with `INVENTORY_UNAVAILABLE` and no products. There are no production mock products or invented database endpoints.

`contracts.ts` contains input/output Zod schemas and the inventory boundary. `engine.ts` handles deterministic filtering, complete-look budgets and rule fallback. `gemini.ts` uses structured JSON for style tags only; the server entry injects private credentials. Tests inject an inventory adapter and fake Gemini transport without calling Google or a database.

Configure `GEMINI_API_KEY` and `GEMINI_MODEL` only on the server to enable AI preference ranking. Without them, or after API failures, malformed output or timeouts, the service uses occasion rules and clearly labels the result source. AI output can affect ranking but cannot add products, change prices, or bypass dates, availability, budget or approval checks.

The Generate Content REST request uses `generationConfig.responseFormat.text.mimeType: "APPLICATION_JSON"`, following the [REST enum definition](https://ai.google.dev/api/generate-content). The configured `gemini-3.5-flash-lite` model is [stable and supports structured outputs](https://ai.google.dev/gemini-api/docs/models/gemini-3.5-flash-lite). A synthetic preference request verified this configuration; no customer data was sent.

The shared input/output contract is in `contracts.ts`. Automated tests cover budget arithmetic, approval and stock constraints, Gemini transport validation and bounded fallback behavior.
