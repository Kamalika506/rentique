"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDownUp, ArrowRight,Heart, Search, SlidersHorizontal } from "lucide-react";
import CustomerHeader from "@/components/layout/customer-header";
import CustomerFooter from "@/components/layout/customer-footer";
import { demoProducts } from "@/features/marketplace/demo-products";
import { useWishlist } from "@/features/marketplace/wishlist-provider";

const categories = ["Wedding guest", "Evening wear", "Everyday chic"];

export default function MarketplacePage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All categories");
  const [maxPrice, setMaxPrice] = useState("all");
  const [sortBy, setSortBy] = useState("recommended");
  const { toggleWishlist, isWishlisted, isLoaded } = useWishlist();

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();

    const results = demoProducts.filter((product) => {
      const matchesSearch =
        !query ||
        product.name.toLowerCase().includes(query) ||
        product.collection.toLowerCase().includes(query) ||
        product.category.toLowerCase().includes(query);

      const matchesCategory =
        category === "All categories" || product.category === category;

      const matchesPrice =
        maxPrice === "all" || product.price <= Number(maxPrice);

      return matchesSearch && matchesCategory && matchesPrice;
    });

    return [...results].sort((a, b) => {
      if (sortBy === "price-low") return a.price - b.price;
      if (sortBy === "price-high") return b.price - a.price;
      if (sortBy === "name") return a.name.localeCompare(b.name);
      return 0;
    });
  }, [search, category, maxPrice, sortBy]);

  function clearFilters() {
    setSearch("");
    setCategory("All categories");
    setMaxPrice("all");
    setSortBy("recommended");
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#f7f5f1] text-[#302d31]">
      <CustomerHeader />

      <main className="flex-1">
        <section className="border-b border-[#e4dfd7] bg-[#eee7e5]">
          <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-16">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#927c59]">
              The Rentique collection
            </p>

            <h1 className="mt-3 font-serif text-4xl leading-tight tracking-tight text-[#4c2544] sm:text-5xl">
              Find your next favourite look.
            </h1>

            <p className="mt-4 max-w-2xl text-sm leading-7 text-[#716971] sm:text-base">
              Explore styles for celebrations, evenings, and everyday moments.
              Search the collection and find a look that feels like you.
            </p>

            <p className="mt-4 text-xs text-[#716971]">
              Demo marketplace. Products, prices, and availability are
              illustrative and are not connected to live inventory.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-12">
          <div className="grid gap-4 rounded-2xl border border-[#e4dfd7] bg-[#fffdf9] p-4 sm:p-5 lg:grid-cols-[1.5fr_1fr_1fr_1fr] lg:items-end">
            <div>
              <label
                htmlFor="marketplace-search"
                className="mb-2 block text-sm font-medium text-[#302d31]"
              >
                Search styles
              </label>

              <div className="flex h-12 items-center gap-3 rounded-xl border border-[#d9d1c9] bg-white px-3 focus-within:border-[#4c2544] focus-within:ring-2 focus-within:ring-[#4c2544]/10">
                <Search size={18} className="shrink-0 text-[#927c59]" />
                <input
                  id="marketplace-search"
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Try evening or occasion"
                  className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#a49ba2]"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="category-filter"
                className="mb-2 block text-sm font-medium text-[#302d31]"
              >
                Category
              </label>
              <select
                id="category-filter"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className="h-12 w-full rounded-xl border border-[#d9d1c9] bg-white px-3 text-sm outline-none focus:border-[#4c2544] focus:ring-2 focus:ring-[#4c2544]/10"
              >
                <option>All categories</option>
                {categories.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="price-filter"
                className="mb-2 block text-sm font-medium text-[#302d31]"
              >
                Maximum rental price
              </label>
              <select
                id="price-filter"
                value={maxPrice}
                onChange={(event) => setMaxPrice(event.target.value)}
                className="h-12 w-full rounded-xl border border-[#d9d1c9] bg-white px-3 text-sm outline-none focus:border-[#4c2544] focus:ring-2 focus:ring-[#4c2544]/10"
              >
                <option value="all">Any price</option>
                <option value="1000">Up to ₹1,000</option>
                <option value="1250">Up to ₹1,250</option>
                <option value="1500">Up to ₹1,500</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="sort-products"
                className="mb-2 block text-sm font-medium text-[#302d31]"
              >
                Sort by
              </label>
              <select
                id="sort-products"
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value)}
                className="h-12 w-full rounded-xl border border-[#d9d1c9] bg-white px-3 text-sm outline-none focus:border-[#4c2544] focus:ring-2 focus:ring-[#4c2544]/10"
              >
                <option value="recommended">Recommended</option>
                <option value="price-low">Price: low to high</option>
                <option value="price-high">Price: high to low</option>
                <option value="name">Name: A to Z</option>
              </select>
            </div>

            <button
              type="button"
              onClick={clearFilters}
              className="text-left text-sm font-medium text-[#4c2544] underline underline-offset-4 hover:text-[#927c59] lg:col-span-4 lg:justify-self-end"
            >
              Clear all filters
            </button>
          </div>

          <div className="mb-6 mt-8 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-serif text-2xl text-[#4c2544] sm:text-3xl">
                Explore the collection
              </h2>
              <p className="mt-2 text-sm text-[#716971]" aria-live="polite">
                {filteredProducts.length}{" "}
                {filteredProducts.length === 1 ? "style" : "styles"} found
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs text-[#716971]">
              <SlidersHorizontal size={16} />
              <ArrowDownUp size={15} />
              Filters update instantly
            </div>
          </div>

          {filteredProducts.length > 0 ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {filteredProducts.map((product) => {
                const wishlisted = isWishlisted(product.id);

                return (
                  <article
                    key={product.id}
                    className="overflow-hidden rounded-2xl border border-[#e4dfd7] bg-[#fffdf9] transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <div className="relative">
                      <Link
                        href={`/marketplace/${product.id}`}
                        aria-label={`View details for ${product.name}`}
                        className="group block"
                >
                        <div
                          role="img"
                          aria-label={`Demo fashion image for ${product.name}`}
                          className="relative aspect-[4/5] bg-[#eee7e5] bg-cover bg-center"
                          style={{
                            backgroundImage: `url('${product.image}')`,
                          }}
                        >
                          <span className="absolute left-3 top-3 rounded-full bg-[#fffdf9]/95 px-3 py-1.5 text-xs font-medium text-[#4c2544]">
                            Demo listing
                          </span>
                        </div>
                      </Link>

                      <button
                        type="button"
                        onClick={() => toggleWishlist(product.id)}
                        aria-label={
                          wishlisted
                            ? `Remove ${product.name} from wishlist`
                            : `Add ${product.name} to wishlist`
                        }
                        aria-pressed={wishlisted}
                        disabled={!isLoaded}
                        className="absolute right-3 top-3 z-10 flex size-11 items-center justify-center rounded-full bg-[#fffdf9]/95 text-[#4c2544] shadow-sm transition hover:bg-white disabled:opacity-60"
                      >
                        <Heart
                          size={20}
                          fill={wishlisted ? "currentColor" : "none"}
                          className={wishlisted ? "text-[#4c2544]" : ""}
                        />
                      </button>
                    </div>

                    <Link
                      href={`/marketplace/${product.id}`}
                      aria-label={`View details for ${product.name}`}
                      className="group block"
                    >
                      <div className="p-5">
                        <p className="text-xs uppercase tracking-[0.12em] text-[#927c59]">
                          {product.category}
                        </p>

                        <h3 className="mt-2 font-serif text-2xl text-[#4c2544] group-hover:text-[#927c59]">
                          {product.name}
                        </h3>

                        <p className="mt-1 text-sm text-[#716971]">
                          {product.collection}
                        </p>

                        <p className="mt-3 text-sm leading-6 text-[#716971]">
                          {product.description}
                        </p>

                        <div className="mt-5 flex items-end justify-between gap-3 border-t border-[#e4dfd7] pt-4">
                          <div>
                            <p className="text-xs text-[#716971]">
                              Sample rental price
                            </p>
                            <p className="mt-1 text-lg font-semibold text-[#302d31]">
                              ₹{product.price.toLocaleString("en-IN")}
                              <span className="text-xs font-normal text-[#716971]">
                                {" "}/ {product.rentalPeriod}
                              </span>
                            </p>
                          </div>

                          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#f3efe9] text-[#4c2544] transition group-hover:bg-[#4c2544] group-hover:text-white">
                            <ArrowRight size={18} />
                          </span>
                        </div>
                      </div>
                    </Link>
                  </article>
                );
              })}

            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-[#d9d1c9] bg-[#fffdf9] px-5 py-14 text-center">
              <Search size={28} className="mx-auto text-[#927c59]" />
              <h3 className="mt-4 font-serif text-2xl text-[#4c2544]">
                No styles found
              </h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#716971]">
                Try another search, choose a different category, or increase
                your maximum rental price.
              </p>
              <button
                type="button"
                onClick={clearFilters}
                className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-[#4c2544] px-6 text-sm font-medium text-white hover:bg-[#633358]"
              >
                Clear filters
              </button>
            </div>
          )}

          <p className="mt-8 text-xs leading-5 text-[#8a8188]">
            All products and prices shown here are demo data. Live inventory,
            availability, and booking will be integrated through the team's
            agreed backend APIs.
          </p>
        </section>
      </main>

      <CustomerFooter />
    </div>
  );
}