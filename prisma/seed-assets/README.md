# Seed Assets

This directory contains the manifest used by `npm run db:seed` to populate the
development database with sample products and images.

## Image Policy

Images are sourced from [Unsplash](https://unsplash.com) via their public API.
Unsplash images are free to use for commercial and non-commercial purposes
under the [Unsplash License](https://unsplash.com/license).

The seed script downloads each image at runtime, uploads it to Cloudinary
under a stable `rentique/seed/<slug>` public ID, and records the resulting
secure URL in the Prisma `ProductImage` table.

## Re-running the seed

The seed script is fully idempotent:
- Products whose `name` already exists in the boutique are skipped.
- Cloudinary uploads use `overwrite=false`, so existing assets are never
  replaced — the script reads back the existing URL from Cloudinary.
- No existing database records are deleted or altered.

Run with:

```
npm run db:seed
```
