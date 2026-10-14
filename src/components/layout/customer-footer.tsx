import Link from "next/link";

export default function CustomerFooter() {
  return (
    <footer className="border-t border-[#e4dfd7] bg-[#fffdf9]">
      <div className="mx-auto grid max-w-7xl gap-8 px-5 py-10 sm:px-8 md:grid-cols-3 md:items-center">
        <Link
          href="/"
          className="text-2xl font-semibold tracking-[-0.06em] text-[#4c2544]"
        >
          rentique<span className="text-[#927c59]">.</span>
        </Link>

        <p className="max-w-sm text-sm leading-6 text-[#716971] md:mx-auto">
          Find your next favourite look. Rent thoughtfully, dress beautifully,
          and give every outfit another story.
        </p>

        <nav
          aria-label="Footer navigation"
          className="flex flex-wrap gap-x-5 gap-y-3 text-sm text-[#514a50] md:justify-end"
        >
          <Link className="hover:text-[#4c2544]" href="/marketplace">
            Explore
          </Link>
          <Link className="hover:text-[#4c2544]" href="/wishlist">
            Wishlist
          </Link>
          <Link className="hover:text-[#4c2544]" href="/login">
            My account
          </Link>
        </nav>

        <p className="text-xs text-[#8a8188] md:col-span-3">
          © 2026 Rentique. Demo storefront.
        </p>
      </div>
    </footer>
  );
}