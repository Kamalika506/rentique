"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import CustomerHeader from "@/components/layout/customer-header";

const navigation = [
  ["Home", "/admin-home"],
  ["Overview", "/admin"], ["Boutiques", "/admin/boutiques"],
  ["Categories", "/admin/categories"], ["Bookings", "/admin/bookings"],
  ["Reviews", "/admin/reviews"], ["Activity", "/admin/activity"],
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return <div className="min-h-screen bg-[#f7f5f1] text-[#302d31]"><CustomerHeader />
    <div className="mx-auto flex max-w-[1600px] flex-col lg:flex-row">
      <aside className="border-b border-[#e4dfd7] bg-[#fffdf9] p-5 lg:min-h-[calc(100vh-80px)] lg:w-56 lg:shrink-0 lg:border-r">
        <p className="mb-4 font-serif text-xl text-[#4c2544]">Admin workspace</p>
        <nav aria-label="Admin navigation" className="flex flex-wrap gap-2 lg:flex-col">
          {navigation.map(([label, href]) => <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined} className={`rounded-xl px-4 py-2.5 text-sm ${pathname === href ? "bg-[#4c2544] text-white" : "text-[#716971] hover:bg-[#f3efe9]"}`}>{label}</Link>)}
        </nav>
      </aside>
      <main className="min-w-0 flex-1 p-5 sm:p-8 lg:p-10">{children}</main>
    </div>
  </div>;
}
