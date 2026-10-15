"use client";
import { useWishlist } from "@/features/marketplace/wishlist-provider";
import { useCatalog } from "@/features/marketplace/catalog";
import Link from "next/link";
import { ArrowRight, Heart, Leaf, ShieldCheck, Sparkles } from "lucide-react";
import CustomerHeader from "@/components/layout/customer-header";
import CustomerFooter from "@/components/layout/customer-footer";

const categories = [
  {
    name: "Wedding guest",
    occasion: "wedding",
    description: "Celebrate in style",
    image:
      "https://images.unsplash.com/photo-1566174053879-31528523f8ae?auto=format&fit=crop&w=800&q=85",
  },
  {
    name: "Evening wear",
    occasion: "party",
    description: "Make an entrance",
    image:
      "https://images.unsplash.com/photo-1566174053879-31528523f8ae?auto=format&fit=crop&w=800&q=85",
  },
  {
    name: "Everyday chic",
    occasion: "casual",
    description: "Effortlessly put together",
    image:
      "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=800&q=85",
  },
];


export default function Home() {
  const { toggleWishlist, isWishlisted, isLoaded } = useWishlist();
  const { products: catalog, loading, error } = useCatalog();
  const products = catalog.slice(0, 3).map(product => ({ ...product, designer: product.collection, period: product.rentalPeriod, tag: product.category }));
  return (
    <div className="min-h-screen bg-[#f7f5f1] text-[#302d31]">
      <CustomerHeader showBoutiqueLinks />

      <main>
        <section className="mx-auto grid max-w-7xl gap-10 px-5 py-12 sm:px-8 sm:py-16 lg:grid-cols-[1fr_0.9fr] lg:items-center lg:gap-14 lg:py-20">
          <div className="max-w-xl">
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#e4dfd7] bg-[#fffdf9] px-4 py-2 text-xs font-medium uppercase tracking-[0.16em] text-[#735b6c]">
              <Sparkles size={14} />
              Your wardrobe, reimagined
            </p>

            <h1 className="font-serif text-5xl leading-[1.08] tracking-[-0.045em] text-[#4c2544] sm:text-6xl lg:text-7xl">
              Wear the moment.
              <span className="mt-2 block italic text-[#927c59]">
                Not the price tag.
              </span>
            </h1>

            <p className="mt-6 max-w-lg text-base leading-7 text-[#716971] sm:text-lg sm:leading-8">
              Discover beautiful outfits for weddings, celebrations, and
              everything in between. Find a look you love, rent it for the
              occasion, and return it when the moment has passed.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/marketplace"
                className="inline-flex min-h-12 items-center justify-center gap-3 rounded-full bg-[#4c2544] px-7 py-3 text-sm font-medium text-white transition hover:bg-[#633358]"
              >
                Explore the collection
                <ArrowRight size={17} />
              </Link>

              <Link
                href="/register"
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-[#d7cec5] bg-[#fffdf9] px-7 py-3 text-sm font-medium text-[#4c2544] transition hover:bg-[#f3efe9]"
              >
                Join Rentique
              </Link>
            </div>

            <div className="mt-9 flex flex-wrap gap-x-6 gap-y-3 text-xs text-[#716971]">
              <span className="flex items-center gap-2">
                <Leaf size={15} className="text-[#927c59]" />
                Wear more, waste less
              </span>
              <span className="flex items-center gap-2">
                <ShieldCheck size={15} className="text-[#927c59]" />
                Discover your next look
              </span>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-lg lg:max-w-none">
            <div
              role="img"
              aria-label="Editorial fashion photography featuring an elegant occasion outfit"
              className="aspect-[4/5] overflow-hidden rounded-t-[48%] rounded-b-3xl bg-[#e5d9dc] bg-cover bg-center"
              style={{
                backgroundImage:
                  "url('https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=1200&q=90')",
              }}
            />

            <div className="absolute bottom-5 left-4 right-4 rounded-2xl border border-white/70 bg-[#fffdf9]/95 p-4 shadow-lg sm:bottom-8 sm:left-8 sm:right-8 sm:p-5">
              <p className="text-xs uppercase tracking-[0.16em] text-[#927c59]">
                A different kind of wardrobe
              </p>
              <div className="mt-2 flex items-center justify-between gap-4">
                <div>
                  <p className="font-serif text-xl text-[#4c2544] sm:text-2xl">
                    Your next great outfit
                  </p>
                  <p className="mt-1 text-sm text-[#716971]">
                    One special occasion at a time.
                  </p>
                </div>
                <Link
                  href="/marketplace"
                  aria-label="Explore the marketplace"
                  className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#4c2544] text-white hover:bg-[#633358]"
                >
                  <ArrowRight size={19} />
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-[#e4dfd7] bg-[#fffdf9]">
          <div className="mx-auto grid max-w-7xl grid-cols-1 divide-y divide-[#e4dfd7] px-5 sm:grid-cols-3 sm:divide-x sm:divide-y-0 sm:px-8">
            <div className="py-5 text-center">
              <p className="font-serif text-xl text-[#4c2544]">For the moment</p>
              <p className="mt-1 text-xs text-[#716971]">
                Outfits for your occasions
              </p>
            </div>
            <div className="py-5 text-center">
              <p className="font-serif text-xl text-[#4c2544]">A smarter choice</p>
              <p className="mt-1 text-xs text-[#716971]">
                Rent instead of buying every time
              </p>
            </div>
            <div className="py-5 text-center">
              <p className="font-serif text-xl text-[#4c2544]">Your own style</p>
              <p className="mt-1 text-xs text-[#716971]">
                Explore looks beyond your wardrobe
              </p>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20">
          <div className="mb-8 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#927c59]">
                Find your occasion
              </p>
              <h2 className="mt-3 font-serif text-3xl tracking-tight text-[#4c2544] sm:text-4xl">
                Dress for the feeling
              </h2>
            </div>
            <Link
              href="/marketplace"
              className="hidden items-center gap-2 pb-1 text-sm font-medium text-[#4c2544] hover:text-[#927c59] sm:flex"
            >
              Browse all <ArrowRight size={16} />
            </Link>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((category, index) => (
              <Link
                key={category.name}
                href={`/marketplace?occasion=${category.occasion}`}
                className="group relative overflow-hidden rounded-2xl bg-[#e5d9dc]"
              >
                <div
                  role="img"
                  aria-label={`${category.name} fashion`}
                  className="aspect-[4/5] bg-cover bg-center transition duration-500 group-hover:scale-105"
                  style={{
                    backgroundImage: `url('${category.image}')`,
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/5 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-5 text-white sm:p-6">
                  <p className="text-xs uppercase tracking-[0.15em] text-white/80">
                    {category.description}
                  </p>
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <h3 className="font-serif text-2xl sm:text-3xl">
                      {category.name}
                    </h3>
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-white/60 transition group-hover:bg-white group-hover:text-[#4c2544]">
                      <ArrowRight size={17} />
                    </span>
                  </div>
                </div>
                {index === 0 && (
                  <span className="absolute left-4 top-4 rounded-full bg-[#fffdf9] px-3 py-1.5 text-xs font-medium text-[#4c2544]">
                    Made for celebrations
                  </span>
                )}
              </Link>
            ))}
          </div>
        </section>

        <section className="bg-[#eee7e5]">
          <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20">
            <div className="mb-8 flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#927c59]">
                  The Rentique edit
                </p>
                <h2 className="mt-3 font-serif text-3xl tracking-tight text-[#4c2544] sm:text-4xl">
                  Looks worth going out for
                </h2>
                <p className="mt-3 text-sm leading-6 text-[#716971]">
                  Discover rental products from approved local boutiques.
                </p>
              </div>
              <Link
                href="/marketplace"
                className="hidden items-center gap-2 text-sm font-medium text-[#4c2544] hover:text-[#927c59] sm:flex"
              >
                View marketplace <ArrowRight size={16} />
              </Link>
            </div>

            {loading && <p role="status">Loading collections?</p>}
            {error && <p role="alert">{error}</p>}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((product) => (
                <article
                  key={product.id}
                  className="overflow-hidden rounded-2xl border border-[#e4dfd7] bg-[#fffdf9]"
                >
                  <div className="relative">
                    <div
                      role="img"
                      aria-label={`Fashion image for ${product.name}`}
                      className="aspect-[4/5] bg-cover bg-center"
                      style={{
                        backgroundImage: `url('${product.image}')`,
                      }}
                    />
                    <span className="absolute left-3 top-3 rounded-full bg-[#fffdf9]/95 px-3 py-1.5 text-xs font-medium text-[#4c2544]">
                      Boutique listing
                    </span>
                    <button
                      type="button"
                      disabled={!isLoaded}
                      onClick={() => toggleWishlist(product.id)}
                      aria-pressed={isWishlisted(product.id)}
                      aria-label={`Toggle wishlist for ${product.name}`}
                      className="absolute right-3 top-3 flex size-10  items-center justify-center rounded-full bg-[#fffdf9]/95 text-[#8a8188] opacity-80"
                    >
                      <Heart size={18} fill={isWishlisted(product.id) ? "currentColor" : "none"} />
                    </button>
                  </div>

                  <div className="p-5">
                    <p className="text-xs uppercase tracking-[0.12em] text-[#927c59]">
                      {product.tag}
                    </p>
                    <h3 className="mt-2 font-serif text-2xl text-[#4c2544]">
                      {product.name}
                    </h3>
                    <p className="mt-1 text-sm text-[#716971]">
                      {product.designer}
                    </p>
                    <div className="mt-5 flex items-end justify-between gap-3 border-t border-[#e4dfd7] pt-4">
                      <div>
                        <p className="text-xs text-[#716971]">
                          Rental price
                        </p>
                        <p className="mt-1 text-lg font-semibold text-[#302d31]">
                          ₹{product.price.toLocaleString("en-IN")}
                          <span className="text-xs font-normal text-[#716971]">
                            {" "}
                            / {product.period}
                          </span>
                        </p>
                      </div>
                      <Link
                        href={`/marketplace/${product.id}`}
                        className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-[#4c2544] hover:text-[#927c59]"
                      >
                        Explore <ArrowRight size={15} />
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <div className="mt-6 rounded-xl border border-[#d8cbc9] bg-[#fffdf9]/70 px-4 py-3 text-xs leading-5 text-[#716971]">
              Explore boutique listings and choose your rental dates in the marketplace.
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20">
          <div className="overflow-hidden rounded-3xl bg-[#4c2544] px-6 py-12 text-center text-white sm:px-12 sm:py-16">
            <Sparkles className="mx-auto text-[#d7c39e]" size={25} />
            <h2 className="mx-auto mt-5 max-w-2xl font-serif text-3xl leading-tight sm:text-5xl">
              Your next favourite outfit is waiting.
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-sm leading-7 text-white/75 sm:text-base">
              Explore the collection and find something that feels like you.
            </p>
            <Link
              href="/marketplace"
              className="mt-7 inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#fffdf9] px-7 py-3 text-sm font-medium text-[#4c2544] transition hover:bg-[#f3efe9]"
            >
              Discover Rentique <ArrowRight size={17} />
            </Link>
          </div>
        </section>
      </main>

      <CustomerFooter />
    </div>
  );
}
