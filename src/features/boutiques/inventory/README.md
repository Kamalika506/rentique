# Inventory

Inventory UI is implemented at `/boutique/products`, `/boutique/products/new`, and `/boutique/products/[id]/edit`. It includes search/category/stock filters, validated add/edit forms, previews, archive/unarchive confirmations, stock status, image selection/removal/alt descriptions, INR pricing and deposits, and loading/error/empty states.

`schema.ts` defines UI DTO validation, not database models. `service.ts` defines the replaceable `BoutiqueProductService`. The root boutique `ProductProvider` selects `../adapters/mock/products.ts` explicitly. Demo products and local image data exist only in browser memory; navigation preserves changes, while refresh resets them. The demo is separate from onboarding and the dashboard's fixed reporting snapshot.

Only scoped products are returned/editable in demo mode. The real backend must enforce authenticated boutique ownership and approval on all reads, writes and uploads; frontend filtering is not authorization. See [contracts, verification and integration blockers](../../../../docs/MEMBER3_IMPLEMENTATION.md).
