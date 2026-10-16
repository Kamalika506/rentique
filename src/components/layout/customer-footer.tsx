"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";

export default function CustomerFooter() {
  const { data: session, status } = useSession();
  const role = session?.user.role;
  const isWorkspace = role === "BOUTIQUE_OWNER" || role === "ADMIN";
  const homeHref = role === "BOUTIQUE_OWNER" ? "/boutique-home" : role === "ADMIN" ? "/admin-home" : "/";
  return (
    <footer className="border-t border-[#e4dfd7] bg-[#fffdf9]">
      <div className="mx-auto grid max-w-7xl gap-8 px-5 py-10 sm:px-8 md:grid-cols-3 md:items-center">
        <Link
          href={homeHref}
          className="text-2xl font-semibold tracking-[-0.06em] text-[#4c2544]"
        >
          rentique<span className="text-[#927c59]">.</span>
        </Link>

        <p className="max-w-sm text-sm leading-6 text-[#716971] md:mx-auto">
          {isWorkspace ? "Your Rentique workspace. Manage your account and keep your business moving." : status === "loading" ? "Rentique" : "Find your next favourite look. Rent thoughtfully, dress beautifully, and give every outfit another story."}
        </p>

        <nav
          aria-label="Footer navigation"
          className="flex flex-wrap gap-x-5 gap-y-3 text-sm text-[#514a50] md:justify-end"
        >
          {status !== "loading" && <><Link className="hover:text-[#4c2544]" href={isWorkspace ? homeHref : "/marketplace"}>
            {isWorkspace ? "Workspace" : "Explore"}
          </Link>
          {!isWorkspace && <Link className="hover:text-[#4c2544]" href="/wishlist">
            Wishlist
          </Link>}
          <Link className="hover:text-[#4c2544]" href={session?.user ? "/profile" : "/login"}>
            My account
          </Link></>}
        </nav>

        <p className="text-xs text-[#8a8188] md:col-span-3">
          © 2026 Rentique. Demo storefront.
        </p>
      </div>
    </footer>
  );
}
