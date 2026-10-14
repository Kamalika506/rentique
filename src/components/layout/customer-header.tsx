"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  Heart,
  Menu,
  Search,
  UserRound,
  X,
} from "lucide-react";

const navLinks = [
  { label: "Discover", href: "/" },
  { label: "Shop all", href: "/marketplace" },
  { label: "Boutiques", href: "/boutiques" },
  { label: "Occasion styling", href: "/styling" },
];

export default function CustomerHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { data: session, status } = useSession();
  const user = session?.user;
  const username = user?.name || user?.email?.split("@")[0] || "My account";

  return (
    <header className="sticky top-0 z-50 border-b border-[#e4dfd7] bg-[#fffdf9]/95 backdrop-blur">
      <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between gap-4 px-5 sm:px-8">
        <Link
          href="/"
          className="shrink-0 text-2xl font-semibold tracking-[-0.06em] text-[#4c2544] sm:text-3xl"
          aria-label="Rentique home"
        >
          rentique<span className="text-[#927c59]">.</span>
        </Link>

        <nav
          aria-label="Main navigation"
          className="hidden items-center gap-8 md:flex"
        >
          {navLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="text-sm text-[#514a50] transition-colors hover:text-[#4c2544]"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 sm:flex">
          <Link
            href="/marketplace"
            aria-label="Search rentals"
            className="rounded-full p-2.5 text-[#4c2544] transition hover:bg-[#f3efe9]"
          >
            <Search size={19} />
          </Link>

          <Link
            href="/wishlist"
            aria-label="Wishlist"
            className="rounded-full p-2.5 text-[#4c2544] transition hover:bg-[#f3efe9]"
          >
            <Heart size={19} />
          </Link>

          {user ? <Link
            href="/profile"
            aria-label={`Account for ${username}`}
            className="ml-1 inline-flex h-10 items-center gap-2 rounded-full bg-[#4c2544] px-5 text-sm font-medium text-white transition hover:bg-[#633358]"
          >
            <UserRound size={16} />
            <span className="max-w-32 truncate">{username}</span>
          </Link> : status === "loading" ? <span role="status" className="px-3 text-sm">Loading account...</span> : <>
            <Link href="/login" className="px-3 text-sm text-[#4c2544]">Login</Link>
            <Link href="/register" className="rounded-full bg-[#4c2544] px-5 py-2.5 text-sm text-white">Sign up</Link>
          </>}
        </div>

        {user && <Link href="/profile" className="ml-auto max-w-28 truncate text-sm font-medium text-[#4c2544] sm:hidden">{username}</Link>}
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={menuOpen}
          aria-controls="mobile-navigation"
          className="rounded-full p-2 text-[#4c2544] hover:bg-[#f3efe9] sm:hidden"
        >
          {menuOpen ? <X size={23} /> : <Menu size={23} />}
        </button>
      </div>

      {menuOpen && (
        <nav
          id="mobile-navigation"
          aria-label="Mobile navigation"
          className="border-t border-[#e4dfd7] bg-[#fffdf9] px-5 py-4 sm:hidden"
        >
          <div className="flex flex-col gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="rounded-lg px-3 py-3 text-sm text-[#302d31] hover:bg-[#f3efe9]"
              >
                {link.label}
              </Link>
            ))}

            <Link
              href="/wishlist"
              onClick={() => setMenuOpen(false)}
              className="rounded-lg px-3 py-3 text-sm text-[#302d31] hover:bg-[#f3efe9]"
            >
              Wishlist
            </Link>

            {user ? <Link href="/profile" onClick={() => setMenuOpen(false)} className="rounded-lg px-3 py-3 text-sm text-[#302d31]">{username}</Link> : status === "loading" ? <p role="status">Loading account...</p> : <>
              <Link href="/login" onClick={() => setMenuOpen(false)} className="rounded-full bg-[#4c2544] px-4 py-3 text-center text-sm text-white">Login</Link>
              <Link href="/register" onClick={() => setMenuOpen(false)} className="rounded-full border border-[#4c2544] px-4 py-3 text-center text-sm text-[#4c2544]">Sign up</Link>
            </>}
          </div>
        </nav>
      )}
    </header>
  );
}
