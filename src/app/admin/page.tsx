
"use client";

import { useState } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  Package,
  CalendarCheck,
  Users,
  ChartNoAxesCombined,
  Menu,
  X,
  ArrowUpRight,
  IndianRupee,
  ShoppingBag,
  Clock3,
  CheckCircle2,
  Search,
} from "lucide-react";
import CustomerHeader from "@/components/layout/customer-header";
import CustomerFooter from "@/components/layout/customer-footer";

const navigation = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Products", href: "/admin/products", icon: Package },
  { label: "Bookings", href: "/admin/bookings", icon: CalendarCheck },
  { label: "Customers", href: "/admin/customers", icon: Users },
  { label: "Analytics", href: "/admin/analytics", icon: ChartNoAxesCombined },
];

const stats = [
  {
    label: "Total products",
    value: "128",
    note: "Demo inventory",
    icon: Package,
  },
  {
    label: "Total bookings",
    value: "64",
    note: "Illustrative records",
    icon: CalendarCheck,
  },
  {
    label: "Customers",
    value: "42",
    note: "Sample customers",
    icon: Users,
  },
  {
    label: "Rental revenue",
    value: "₹48,650",
    note: "Illustrative amount",
    icon: IndianRupee,
  },
];

const bookings = [
  {
    id: "RNT-1001",
    customer: "Ananya Sharma",
    product: "Rose Evening Gown",
    date: "12 Oct 2026",
    amount: "₹1,299",
    status: "Upcoming",
  },
  {
    id: "RNT-1002",
    customer: "Priya Menon",
    product: "Classic Silk Saree",
    date: "11 Oct 2026",
    amount: "₹999",
    status: "Active",
  },
  {
    id: "RNT-1003",
    customer: "Meera Iyer",
    product: "Ivory Cocktail Dress",
    date: "08 Oct 2026",
    amount: "₹1,499",
    status: "Completed",
  },
  {
    id: "RNT-1004",
    customer: "Kavya Rao",
    product: "Midnight Party Gown",
    date: "07 Oct 2026",
    amount: "₹1,799",
    status: "Cancelled",
  },
];

function statusClasses(status: string) {
  switch (status) {
    case "Upcoming":
      return "bg-[#f3efe9] text-[#765c30]";
    case "Active":
      return "bg-[#e7f3e9] text-[#28643b]";
    case "Completed":
      return "bg-[#eee8f2] text-[#654576]";
    default:
      return "bg-[#f8e9e8] text-[#9b4540]";
  }
}

export default function AdminDashboardPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filteredBookings = bookings.filter((booking) =>
    `${booking.id} ${booking.customer} ${booking.product} ${booking.status}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <div className="flex min-h-screen flex-col bg-[#f7f5f1] text-[#302d31]">
      <CustomerHeader />

      <div className="flex flex-1">
        {sidebarOpen && (
          <button
            type="button"
            aria-label="Close admin navigation"
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-30 bg-black/30 lg:hidden"
          />
        )}

        <aside
          className={`fixed inset-y-0 left-0 z-40 w-64 border-r border-[#e4dfd7] bg-[#fffdf9] px-5 py-6 transition-transform lg:static lg:z-auto lg:translate-x-0 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="mb-8 flex items-center justify-between">
            <div>
              <p className="font-serif text-2xl text-[#4c2544]">Rentique</p>
              <p className="mt-1 text-xs uppercase tracking-[0.16em] text-[#927c59]">
                Admin workspace
              </p>
            </div>
            <button
              type="button"
              aria-label="Close navigation"
              onClick={() => setSidebarOpen(false)}
              className="rounded-lg p-2 hover:bg-[#f3efe9] lg:hidden"
            >
              <X size={20} />
            </button>
          </div>

          <nav aria-label="Admin navigation" className="space-y-2">
            {navigation.map((item) => {
              const Icon = item.icon;
              const active = item.href === "/admin";

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm transition ${
                    active
                      ? "bg-[#4c2544] font-medium text-white"
                      : "text-[#716971] hover:bg-[#f3efe9] hover:text-[#4c2544]"
                  }`}
                >
                  <Icon size={18} />
                  {item.label}
                  {active && <ArrowUpRight size={15} className="ml-auto" />}
                </Link>
              );
            })}
          </nav>

          <div className="mt-10 rounded-2xl bg-[#f3efe9] p-4">
            <p className="text-sm font-medium text-[#4c2544]">
              Demo workspace
            </p>
            <p className="mt-2 text-xs leading-5 text-[#716971]">
              Dashboard figures and booking records are illustrative, not live
              business data.
            </p>
          </div>
        </aside>

        <main className="min-w-0 flex-1 px-4 py-6 sm:px-7 sm:py-8 lg:px-10">
          <div className="mx-auto max-w-7xl">
            <div className="flex items-center gap-3">
              <button
                type="button"
                aria-label="Open admin navigation"
                onClick={() => setSidebarOpen(true)}
                className="rounded-xl border border-[#e4dfd7] bg-[#fffdf9] p-2.5 lg:hidden"
              >
                <Menu size={20} />
              </button>

              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#927c59]">
                  Overview
                </p>
                <h1 className="mt-1 font-serif text-3xl text-[#4c2544] sm:text-4xl">
                  Admin dashboard
                </h1>
              </div>

              <Link
                href="/"
                className="hidden rounded-full border border-[#e4dfd7] bg-[#fffdf9] px-4 py-2.5 text-sm text-[#4c2544] hover:bg-[#f3efe9] sm:inline-flex"
              >
                View storefront
              </Link>
            </div>

            <div className="mt-6 rounded-xl border border-[#e4dfd7] bg-[#fffdf9] px-4 py-3 text-sm leading-6 text-[#716971]">
              <strong className="text-[#4c2544]">Demo data:</strong> All figures
              and booking records below are sample values. They are not
              connected to the backend.
            </div>

            <section
              aria-label="Dashboard summary"
              className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
            >
              {stats.map((stat) => {
                const Icon = stat.icon;

                return (
                  <article
                    key={stat.label}
                    className="rounded-2xl border border-[#e4dfd7] bg-[#fffdf9] p-5"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm text-[#716971]">{stat.label}</p>
                      <span className="rounded-xl bg-[#f3efe9] p-2.5 text-[#4c2544]">
                        <Icon size={19} />
                      </span>
                    </div>
                    <p className="mt-4 text-3xl font-semibold tracking-tight text-[#302d31]">
                      {stat.value}
                    </p>
                    <p className="mt-2 text-xs text-[#8a8188]">{stat.note}</p>
                  </article>
                );
              })}
            </section>

            <section className="mt-8 rounded-2xl border border-[#e4dfd7] bg-[#fffdf9]">
              <div className="flex flex-col gap-4 border-b border-[#e4dfd7] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                <div>
                  <h2 className="font-serif text-2xl text-[#4c2544]">
                    Recent bookings
                  </h2>
                  <p className="mt-1 text-sm text-[#716971]">
                    A sample view of rental activity
                  </p>
                </div>

                <label className="flex h-11 w-full items-center gap-2 rounded-xl border border-[#e4dfd7] bg-white px-3 sm:max-w-xs">
                  <Search size={17} className="shrink-0 text-[#8a8188]" />
                  <span className="sr-only">Search bookings</span>
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search bookings..."
                    className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#a29aa0]"
                  />
                </label>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="bg-[#f7f5f1] text-xs uppercase tracking-wide text-[#716971]">
                    <tr>
                      <th className="px-6 py-4 font-medium">Booking ID</th>
                      <th className="px-6 py-4 font-medium">Customer</th>
                      <th className="px-6 py-4 font-medium">Product</th>
                      <th className="px-6 py-4 font-medium">Date</th>
                      <th className="px-6 py-4 font-medium">Amount</th>
                      <th className="px-6 py-4 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e4dfd7]">
                    {filteredBookings.map((booking) => (
                      <tr key={booking.id} className="hover:bg-[#fdfbf7]">
                        <td className="whitespace-nowrap px-6 py-4 font-medium text-[#4c2544]">
                          {booking.id}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">
                          {booking.customer}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">
                          {booking.product}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-[#716971]">
                          {booking.date}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 font-medium">
                          {booking.amount}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">
                          <span
                            className={`rounded-full px-3 py-1.5 text-xs font-medium ${statusClasses(
                              booking.status
                            )}`}
                          >
                            {booking.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {filteredBookings.length === 0 && (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-6 py-12 text-center text-[#716971]"
                        >
                          No sample bookings match your search.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="border-t border-[#e4dfd7] px-5 py-4 text-xs text-[#8a8188] sm:px-6">
                Showing {filteredBookings.length} of {bookings.length} sample
                bookings
              </div>
            </section>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <article className="rounded-2xl border border-[#e4dfd7] bg-[#fffdf9] p-5">
                <div className="flex items-center gap-3">
                  <span className="rounded-xl bg-[#f3efe9] p-2.5 text-[#4c2544]">
                    <Clock3 size={20} />
                  </span>
                  <h2 className="font-serif text-xl text-[#4c2544]">
                    Booking activity
                  </h2>
                </div>
                <p className="mt-3 text-sm leading-6 text-[#716971]">
                  Review the sample booking statuses above. Live updates will
                  require a connected booking API.
                </p>
              </article>

              <article className="rounded-2xl border border-[#e4dfd7] bg-[#fffdf9] p-5">
                <div className="flex items-center gap-3">
                  <span className="rounded-xl bg-[#f3efe9] p-2.5 text-[#4c2544]">
                    <ShoppingBag size={20} />
                  </span>
                  <h2 className="font-serif text-xl text-[#4c2544]">
                    Storefront status
                  </h2>
                </div>
                <p className="mt-3 text-sm leading-6 text-[#716971]">
                  Your customer storefront is available separately from this
                  demo dashboard.
                </p>
                <Link
                  href="/marketplace"
                  className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-[#4c2544] hover:underline"
                >
                  Browse marketplace <ArrowUpRight size={16} />
                </Link>
              </article>
            </div>
          </div>
        </main>
      </div>

      <CustomerFooter />
    </div>
  );
}
