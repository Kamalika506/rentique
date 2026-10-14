"use client";

import Link from "next/link";
import { ArrowRight, Heart, Star } from "lucide-react";
import { useWishlist } from "./wishlist-provider";
import { safeProductImage, type CatalogProduct } from "./catalog";

export function ProductCard({ product }: { product: CatalogProduct }) {
  const { toggleWishlist, isWishlisted, isLoaded } = useWishlist();
  const wishlisted = isWishlisted(product.id);
  const image = safeProductImage(product.image);
  return <article className="overflow-hidden rounded-2xl border border-[#e4dfd7] bg-[#fffdf9] transition hover:shadow-md">
    <div className="relative">
      <Link href={`/marketplace/${encodeURIComponent(product.id)}`} aria-label={`View ${product.name}`} className="block">
        <div className="relative aspect-[4/5] overflow-hidden bg-[#eee7e5]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {image ? <img src={image} alt={product.name} loading="lazy" className="size-full object-cover" /> : <div className="flex size-full items-center justify-center text-sm text-[#716971]">Image unavailable</div>}
          <span className="absolute left-3 top-3 rounded-full bg-[#fffdf9]/95 px-3 py-1.5 text-xs text-[#4c2544]">{product.category}</span>
        </div>
      </Link>
      <button type="button" onClick={() => toggleWishlist(product.id)} disabled={!isLoaded} aria-label={`${wishlisted ? "Remove" : "Add"} ${product.name} ${wishlisted ? "from" : "to"} wishlist`} aria-pressed={wishlisted} className="absolute right-3 top-3 flex size-11 items-center justify-center rounded-full bg-[#fffdf9]/95 text-[#4c2544] disabled:opacity-60"><Heart size={20} fill={wishlisted ? "currentColor" : "none"} /></button>
    </div>
    <div className="p-5">
      <Link href={`/marketplace/${encodeURIComponent(product.id)}`} className="block"><h3 className="font-serif text-2xl text-[#4c2544]">{product.name}</h3></Link>
      <Link href={`/boutiques/${encodeURIComponent(product.boutique.id)}`} className="mt-1 block text-sm text-[#716971] hover:underline">{product.boutique.name} · {product.boutique.city}</Link>
      <p className="mt-3 line-clamp-2 text-sm leading-6 text-[#716971]">{product.description}</p>
      {!!product.ratingCount && <p className="mt-3 flex items-center gap-1 text-sm"><Star size={14} className="text-[#927c59]" />{Number(product.ratingAverage ?? 0).toFixed(1)} ({product.ratingCount})</p>}
      <div className="mt-5 flex items-end justify-between gap-3 border-t border-[#e4dfd7] pt-4">
        <div><p className="text-xs text-[#716971]">Rental from</p><p className="mt-1 text-lg font-semibold">₹{product.price.toLocaleString("en-IN")} <span className="text-xs font-normal text-[#716971]">/ {product.rentalPeriod}</span></p><p className="mt-1 text-xs text-[#716971]">Deposit from ₹{(product.depositMinor / 100).toLocaleString("en-IN")}</p></div>
        <Link href={`/marketplace/${encodeURIComponent(product.id)}`} aria-label={`View ${product.name}`} className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#f3efe9] text-[#4c2544]"><ArrowRight size={18} /></Link>
      </div>
    </div>
  </article>;
}
