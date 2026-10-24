# Tifara sample catalog image correction

The six sample listings originally used unrelated stock photography. Their replacement mappings and source-page links are recorded in `scripts/data/tifara-product-images.ts`.

| Sample listing | Reference photograph source |
|---|---|
| Crimson raw silk bridal lehenga | [Elahe / Nitika Gujral](https://www.elahe.in/products/crimson-red-raw-silk-lehenga-set-ng231) |
| Gold tissue Kanjivaram saree | [Zilikaa](https://www.zilikaa.com/products/vintage-gold-kanchipuram-tissue-silk-saree-1) |
| Champagne flared gown | [Seema Gujral](https://seemagujral.com/products/champagne-sequin-gown) |
| Sage green gota patti Anarkali | [Andaaz Fashion](https://www.andaazfashion.com/sage-green-georgette-anarkali-suit-with-gota-patti-work-lstv142464.html) |
| Emerald and Polki choker | [Tyaani](https://tyaani.com/products/shalininecklaceandananyatopssets-tyst1959) |
| Midnight blue velvet Indo-Western set | [Global Creations](https://globalcreationsindia.com/products/navy-blue-velvet-embroidered-cape-with-inner-and-bellbottom) |

These are reference photos for sample listings, not verification of Tifara's actual inventory, garment composition, or gemstone provenance. Source attribution does not establish a reuse license. Merchant photos retain their original ownership and visible watermarks. Real inventory listings should use boutique-owned or licensed photographs of the actual items.

## Repair procedure

`npx tsx scripts/correct-tifara-images.ts` downloads the six mapped images and renders a contact sheet under `.tmp/tifara-image-review/` for visual inspection.

After review, `npx tsx scripts/correct-tifara-images.ts --apply` uploads the reviewed files to new, content-addressed Cloudinary IDs, backs up current image metadata locally, and atomically replaces the six matching Tifara product galleries. It increments product versions to invalidate stale estimates and rejects concurrent product/image edits. Original Cloudinary assets and historical booking snapshots are retained.

The Tifara seed uses the same mapping under a new `catalog-v2` asset namespace so an existing incorrect asset is not silently reused. Seeding still skips products that already have images; use the repair script to fix existing galleries.
