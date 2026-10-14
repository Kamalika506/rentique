
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  Package,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { demoProducts } from "@/features/marketplace/demo-products";

export default function AdminProductsPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All categories");
  const [sort, setSort] = useState("name");

  const categories = [
    "All categories",
    ...Array.from(new Set(demoProducts.map((product) => product.category))),
  ];

  const filteredProducts = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    const results = demoProducts.filter((product) => {
      const matchesSearch =
        `${product.name} ${product.category} ${product.collection}`
          .toLowerCase()
          .includes(normalizedSearch);

      const matchesCategory =
        category === "All categories" || product.category === category;

      return matchesSearch && matchesCategory;
    });

    return [...results].sort((a, b) => {
      if (sort === "price-low") return a.price - b.price;
      if (sort === "price-high") return b.price - a.price;
      return a.name.localeCompare(b.name);
    });
  }, [search, category, sort]);

  return (
    <main className="min-h-screen bg-[#f7f5f1] px-4 py-8 text-[#302d31] sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 text-sm text-[#716971] hover:text-[#4c2544]"
        >
          <ArrowLeft size={17} />
          Back to dashboard
        </Link>

        <div className="mt-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#927c59]">
              Catalogue overview
            </p>
            <h1 className="mt-2 font-serif text-3xl text-[#4c2544] sm:text-4xl">
              Products
            </h1>
            <p className="mt-2 text-sm leading-6 text-[#716971]">
              Browse and review the sample products displayed in the Rentique
              customer marketplace.
            </p>
          </div>

          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-[#e4dfd7] bg-[#fffdf9] px-4 py-2 text-xs font-medium text-[#765c30]">
            <Package size={15} />
            Demo catalogue
          </span>
        </div>

        <div className="mt-6 rounded-xl border border-[#e4dfd7] bg-[#fffdf9] p-4 text-sm leading-6 text-[#716971]">
          <strong className="text-[#4c2544]">Read-only preview:</strong>{" "}
          These products come from local demo data. Changes to live inventory,
          stock availability, and product approval are not supported here.
        </div>

        <section
          aria-label="Product catalogue summary"
          className="mt-6 grid gap-4 sm:grid-cols-2"
        >
          <article className="rounded-2xl border border-[#e4dfd7] bg-[#fffdf9] p-5">
            <p className="text-sm text-[#716971]">Products in catalogue</p>
            <p className="mt-3 text-3xl font-semibold text-[#4c2544]">
              {demoProducts.length}
            </p>
            <p className="mt-2 text-xs text-[#8a8188]">
              Sample products available in the demo
            </p>
          </article>

          <article className="rounded-2xl border border-[#e4dfd7] bg-[#fffdf9] p-5">
            <p className="text-sm text-[#716971]">Matching products</p>
            <p className="mt-3 text-3xl font-semibold text-[#4c2544]">
              {filteredProducts.length}
            </p>
            <p className="mt-2 text-xs text-[#8a8188]">
              Results based on your search and category filters
            </p>
          </article>
        </section>

        <section className="mt-8 rounded-2xl border border-[#e4dfd7] bg-[#fffdf9]">
          <div className="border-b border-[#e4dfd7] p-5 sm:p-6">
            <h2 className="font-serif text-2xl text-[#4c2544]">
              Product catalogue
            </h2>
            <p className="mt-1 text-sm text-[#716971]">
              Search, filter, and sort the existing sample products.
            </p>

            <div className="mt-5 grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_190px]">
              <label className="flex h-11 min-w-0 items-center gap-2 rounded-xl border border-[#e4dfd7] bg-white px-3">
                <Search size={17} className="shrink-0 text-[#8a8188]" />
                <span className="sr-only">Search products</span>
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search name or collection..."
                  className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#a29aa0]"
                />
              </label>

              <label className="flex h-11 min-w-0 items-center gap-2 rounded-xl border border-[#e4dfd7] bg-white px-3">
                <SlidersHorizontal
                  size={16}
                  className="shrink-0 text-[#8a8188]"
                />
                <span className="sr-only">Filter by category</span>
                <select
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                >
                  {categories.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex h-11 min-w-0 items-center gap-2 rounded-xl border border-[#e4dfd7] bg-white px-3">
                <span className="shrink-0 text-xs text-[#716971]">Sort</span>
                <span className="sr-only">Sort products</span>
                <select
                  value={sort}
                  onChange={(event) => setSort(event.target.value)}
                  className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                >
                  <option value="name">Name A–Z</option>
                  <option value="price-low">Price: low to high</option>
                  <option value="price-high">Price: high to low</option>
                </select>
              </label>
            </div>
          </div>

          {filteredProducts.length === 0 ? (
            <div className="px-5 py-16 text-center sm:px-6">
              <Package size={30} className="mx-auto text-[#927c59]" />
              <h3 className="mt-4 font-serif text-xl text-[#4c2544]">
                No products found
              </h3>
              <p className="mt-2 text-sm text-[#716971]">
                Try another search term or category.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setCategory("All categories");
                  setSort("name");
                }}
                className="mt-4 text-sm font-medium text-[#4c2544] underline underline-offset-4"
              >
                Reset filters
              </button>
            </div>
          ) : (
            <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-6 xl:grid-cols-3">
              {filteredProducts.map((product) => (
                <article
                  key={product.id}
                  className="overflow-hidden rounded-2xl border border-[#e4dfd7] bg-[#fffdf9]"
                >
                  <div
                    role="img"
                    aria-label={`Demo product image for ${product.name}`}
                    className="aspect-[4/3] bg-[#eee7e5] bg-cover bg-center"
                    style={{
                      backgroundImage: `url("${product.image}")`,
                    }}
                  />

                  <div className="p-4">
                    <p className="text-xs font-medium uppercase tracking-[0.14em] text-[#927c59]">
                      {product.category}
                    </p>

                    <h3 className="mt-2 font-serif text-xl text-[#4c2544]">
                      {product.name}
                    </h3>

                    <p className="mt-1 text-sm text-[#716971]">
                      {product.collection}
                    </p>

                    <p className="mt-3 line-clamp-2 text-sm leading-6 text-[#716971]">
                      {product.description}
                    </p>

                    <div className="mt-4 flex items-end justify-between gap-3 border-t border-[#e4dfd7] pt-4">
                      <div>
                        <p className="text-xs text-[#8a8188]">
                          Sample rental price
                        </p>
                        <p className="mt-1 text-lg font-semibold text-[#302d31]">
                          ₹{product.price.toLocaleString("en-IN")}
                        </p>
                        <p className="mt-1 text-xs text-[#716971]">
                          / {product.rentalPeriod}
                        </p>
                      </div>

                      <Link
                        href={`/marketplace/${product.id}`}
                        className="inline-flex min-h-10 items-center gap-1 rounded-full border border-[#e4dfd7] px-3 py-2 text-xs font-medium text-[#4c2544] hover:bg-[#f3efe9]"
                      >
                        View product <ArrowUpRight size={14} />
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}

          <div className="border-t border-[#e4dfd7] px-5 py-4 text-xs text-[#8a8188] sm:px-6">
            Showing {filteredProducts.length} of {demoProducts.length} demo
            products
          </div>
        </section>
      </div>
    </main>
  );
}
