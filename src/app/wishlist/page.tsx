
"use client";

import Link from "next/link";
import { Heart, ArrowRight, Trash2 } from "lucide-react";
import CustomerHeader from "@/components/layout/customer-header";
import CustomerFooter from "@/components/layout/customer-footer";
import { demoProducts } from "@/features/marketplace/demo-products";
import { useWishlist } from "@/features/marketplace/wishlist-provider";

export default function WishlistPage() {
  const {
    productIds,
    isLoaded,
    removeFromWishlist,
  } = useWishlist();

  const savedProducts = demoProducts.filter((product) =>
    productIds.includes(product.id),
  );

  return (
    <div className="flex min-h-screen flex-col bg-[#f7f5f1] text-[#302d31]">
      <CustomerHeader />

      <main className="mx-auto w-full max-w-7xl flex-1 px-5 py-12 sm:px-8 sm:py-16">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#927c59]">
          Your personal collection
        </p>

        <div className="mt-3 flex items-center gap-3">
          <Heart size={28} className="text-[#4c2544]" />
          <h1 className="font-serif text-4xl text-[#4c2544] sm:text-5xl">
            Your wishlist
          </h1>
        </div>

        <p className="mt-4 max-w-2xl text-sm leading-7 text-[#716971] sm:text-base">
          Keep the looks you love in one place and revisit them whenever
          you are ready.
        </p>

        {!isLoaded ? (
          <p className="mt-10 text-sm text-[#716971]">
            Loading your wishlist...
          </p>
        ) : savedProducts.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-dashed border-[#d9d1c9] bg-[#fffdf9] px-5 py-16 text-center">
            <Heart size={34} className="mx-auto text-[#927c59]" />

            <h2 className="mt-4 font-serif text-2xl text-[#4c2544]">
              Your wishlist is waiting
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#716971]">
              Browse the collection and save the styles you would love
              to explore later.
            </p>

            <Link
              href="/marketplace"
              className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#4c2544] px-6 text-sm font-medium text-white hover:bg-[#633358]"
            >
              Explore the collection
              <ArrowRight size={16} />
            </Link>
          </div>
        ) : (
          <>
            <p className="mt-8 text-sm text-[#716971]">
              {savedProducts.length}{" "}
              {savedProducts.length === 1 ? "style" : "styles"} saved
            </p>

            <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {savedProducts.map((product) => (
                <article
                  key={product.id}
                  className="overflow-hidden rounded-2xl border border-[#e4dfd7] bg-[#fffdf9]"
                >
                  <Link
                    href={`/marketplace/${product.id}`}
                    aria-label={`View details for ${product.name}`}
                    className="block"
                  >
                    <div
                      role="img"
                      aria-label={`Demo fashion image for ${product.name}`}
                      className="aspect-[4/5] bg-[#eee7e5] bg-cover bg-center"
                      style={{
                        backgroundImage: `url('${product.image}')`,
                      }}
                    />
                  </Link>

                  <div className="p-5">
                    <p className="text-xs uppercase tracking-[0.12em] text-[#927c59]">
                      {product.category}
                    </p>

                    <Link
                      href={`/marketplace/${product.id}`}
                      className="mt-2 block font-serif text-2xl text-[#4c2544] hover:text-[#927c59]"
                    >
                      {product.name}
                    </Link>

                    <p className="mt-1 text-sm text-[#716971]">
                      {product.collection}
                    </p>

                    <p className="mt-4 text-lg font-semibold">
                      ₹{product.price.toLocaleString("en-IN")}
                      <span className="ml-1 text-xs font-normal text-[#716971]">
                        / {product.rentalPeriod}
                      </span>
                    </p>

                    <div className="mt-5 flex gap-3 border-t border-[#e4dfd7] pt-4">
                      <Link
                        href={`/marketplace/${product.id}`}
                        className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-full bg-[#4c2544] px-4 text-sm font-medium text-white hover:bg-[#633358]"
                      >
                        View details
                        <ArrowRight size={15} />
                      </Link>

                      <button
                        type="button"
                        onClick={() => removeFromWishlist(product.id)}
                        aria-label={`Remove ${product.name} from wishlist`}
                        className="inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-[#e4dfd7] text-[#4c2544] hover:bg-[#f3efe9]"
                      >
                        <Trash2 size={17} />
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}

        <p className="mt-8 text-xs leading-5 text-[#8a8188]">
          Your wishlist is stored locally in this browser for this demo.
          It is not synced to an account or across devices.
        </p>
      </main>

      <CustomerFooter />
    </div>
  );
}
