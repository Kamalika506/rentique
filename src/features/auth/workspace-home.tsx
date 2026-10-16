"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { ArrowRight, Store, ShieldCheck } from "lucide-react";
import { SignOutButton } from "@/components/layout/sign-out-button";

const destinations = {
  BOUTIQUE_OWNER: [
    { title: "Boutique overview", description: "See your boutique activity and what needs attention.", href: "/boutique/dashboard" },
    { title: "Inventory", description: "Add outfits and keep your rental collection up to date.", href: "/boutique/products" },
    { title: "Bookings", description: "Review requests and manage customer bookings.", href: "/boutique/bookings" },
    { title: "Rental schedule", description: "Plan upcoming pickups and returns.", href: "/boutique/calendar" },
    { title: "Boutique profile", description: "Update your storefront and contact details.", href: "/boutique/settings" },
    { title: "Application status", description: "Follow your boutique approval progress.", href: "/boutique/pending" },
  ],
  ADMIN: [
    { title: "Platform overview", description: "See platform activity and items that need your attention.", href: "/admin" },
    { title: "Boutique applications", description: "Review applications and manage boutique approvals.", href: "/admin/boutiques" },
    { title: "Bookings", description: "Monitor rental bookings across the platform.", href: "/admin/bookings" },
    { title: "Categories", description: "Organize the categories used by the marketplace.", href: "/admin/categories" },
    { title: "Reviews", description: "Review customer feedback and moderate reviews.", href: "/admin/reviews" },
    { title: "Activity", description: "Follow administrative activity across Rentique.", href: "/admin/activity" },
  ],
};

export function WorkspaceHome({ role }: { role: keyof typeof destinations }) {
  const { data: session, status } = useSession();
  const boutique = role === "BOUTIQUE_OWNER";
  const home = boutique ? "/boutique-home" : "/admin-home";
  const login = boutique ? "/login?intent=boutique" : "/login?intent=admin";
  const authorized = session?.user.role === role;
  const primary = destinations[role][0];
  const button = "inline-flex items-center justify-center gap-2 rounded-full bg-[#4c2544] px-6 py-3 text-sm font-medium text-white hover:bg-[#633358]";

  return <div className="flex min-h-screen flex-col bg-[#f7f5f1] text-[#302d31]">
    <header className="border-b border-[#e4dfd7] bg-[#fffdf9]">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-5 sm:px-8">
        <Link href={home} className="text-3xl font-semibold tracking-[-0.06em] text-[#4c2544]">rentique<span className="text-[#927c59]">.</span><span className="ml-3 inline-block text-xs font-medium uppercase tracking-widest">{boutique ? "Boutique" : "Admin"}</span></Link>
        <nav aria-label="Account navigation" className="flex flex-wrap items-center gap-5 text-sm text-[#4c2544]">
          {status === "loading" ? <span role="status">Loading account...</span> : session?.user ? <>
            <Link href="/profile">My account</Link>
            {!authorized && <Link href="/">My home</Link>}
            <SignOutButton className="rounded-full border border-[#d7cec5] px-5 py-2 hover:bg-[#f3efe9] disabled:opacity-60" />
          </> : <Link href={login} className={button}>Sign in</Link>}
        </nav>
      </div>
    </header>
    <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-12 sm:px-8 sm:py-16">
      <section className="rounded-3xl border border-[#e4dfd7] bg-[#fffdf9] p-7 sm:p-12">
        <div className="mb-6 flex size-14 items-center justify-center rounded-2xl bg-[#f3efe9] text-[#4c2544]">{boutique ? <Store size={28} /> : <ShieldCheck size={28} />}</div>
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#927c59]">{boutique ? "Your boutique, in focus" : "Rentique administration"}</p>
        <h1 className="mt-4 max-w-3xl font-serif text-4xl leading-tight text-[#4c2544] sm:text-6xl">{boutique ? "A home for your boutique business." : "Keep Rentique running smoothly."}</h1>
        <p className="mt-5 max-w-2xl text-base leading-7 text-[#716971]">{authorized ? `Welcome back${session.user.name ? `, ${session.user.name}` : ""}. ` : ""}{boutique ? "Manage your collection, respond to rental requests, and plan every pickup and return from one place." : "Review boutique applications, oversee bookings, and manage the platform from your administrator home."}</p>
        <div className="mt-8 flex flex-wrap items-center gap-4">
          {status === "loading" ? <p role="status">Opening your account...</p> : authorized ? <Link href={primary.href} className={button}>Open {boutique ? "boutique dashboard" : "admin dashboard"} <ArrowRight size={17} /></Link> : session?.user ? <Link href="/" className={button}>Go to my home <ArrowRight size={17} /></Link> : <>
            <Link href={login} className={button}>{boutique ? "Boutique owner sign in" : "Administrator sign in"} <ArrowRight size={17} /></Link>
            {boutique && <Link href="/register?intent=boutique" className="text-sm font-medium text-[#4c2544] underline underline-offset-4">Register your boutique</Link>}
          </>}
        </div>
      </section>
      <section className="mt-12" aria-labelledby="workspace-tools">
        <h2 id="workspace-tools" className="font-serif text-3xl text-[#4c2544]">{boutique ? "Your boutique essentials" : "Platform management"}</h2>
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {destinations[role].map(item => <article key={item.href} className="rounded-2xl border border-[#e4dfd7] bg-[#fffdf9] p-6">
            <h3 className="text-lg font-semibold text-[#4c2544]">{item.title}</h3>
            <p className="mt-2 text-sm leading-6 text-[#716971]">{item.description}</p>
            {status !== "loading" && (!session?.user || authorized) && <Link href={authorized ? item.href : login} className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-[#4c2544]">{authorized ? "Open" : "Sign in to continue"} <ArrowRight size={16} /></Link>}
          </article>)}
        </div>
      </section>
    </main>
    <footer className="border-t border-[#e4dfd7] px-5 py-6 text-center text-xs text-[#716971]">Rentique · {boutique ? "Boutique owner" : "Administrator"} home</footer>
  </div>;
}
