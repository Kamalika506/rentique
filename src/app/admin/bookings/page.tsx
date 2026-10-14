
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarCheck,
  Search,
  SlidersHorizontal,
} from "lucide-react";

type BookingStatus = "Upcoming" | "Active" | "Completed" | "Cancelled";

type Booking = {
  id: string;
  customer: string;
  product: string;
  startDate: string;
  endDate: string;
  amount: number;
  status: BookingStatus;
};

const demoBookings: Booking[] = [
  {
    id: "RNT-1001",
    customer: "Ananya Sharma",
    product: "The Midnight Edit",
    startDate: "2026-10-18",
    endDate: "2026-10-21",
    amount: 1299,
    status: "Upcoming",
  },
  {
    id: "RNT-1002",
    customer: "Priya Menon",
    product: "The Modern Muse",
    startDate: "2026-10-12",
    endDate: "2026-10-15",
    amount: 999,
    status: "Active",
  },
  {
    id: "RNT-1003",
    customer: "Meera Iyer",
    product: "The Soft Statement",
    startDate: "2026-10-05",
    endDate: "2026-10-08",
    amount: 1499,
    status: "Completed",
  },
  {
    id: "RNT-1004",
    customer: "Kavya Rao",
    product: "The Celebration Edit",
    startDate: "2026-10-07",
    endDate: "2026-10-10",
    amount: 1199,
    status: "Cancelled",
  },
  {
    id: "RNT-1005",
    customer: "Divya Krishnan",
    product: "The Everyday Muse",
    startDate: "2026-10-22",
    endDate: "2026-10-25",
    amount: 899,
    status: "Upcoming",
  },
  {
    id: "RNT-1006",
    customer: "Nisha Reddy",
    product: "The Modern Muse",
    startDate: "2026-10-13",
    endDate: "2026-10-16",
    amount: 999,
    status: "Active",
  },
];

const statusOptions = [
  "All statuses",
  "Upcoming",
  "Active",
  "Completed",
  "Cancelled",
] as const;

function statusClasses(status: BookingStatus) {
  switch (status) {
    case "Upcoming":
      return "bg-[#f3efe9] text-[#765c30]";
    case "Active":
      return "bg-[#e7f3e9] text-[#28643b]";
    case "Completed":
      return "bg-[#eee8f2] text-[#654576]";
    case "Cancelled":
      return "bg-[#f8e9e8] text-[#9b4540]";
  }
}

function formatDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function AdminBookingsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<(typeof statusOptions)[number]>(
    "All statuses"
  );

  const filteredBookings = useMemo(() => {
    const query = search.trim().toLowerCase();

    return demoBookings.filter((booking) => {
      const matchesSearch =
        `${booking.id} ${booking.customer} ${booking.product}`
          .toLowerCase()
          .includes(query);

      const matchesStatus =
        status === "All statuses" || booking.status === status;

      return matchesSearch && matchesStatus;
    });
  }, [search, status]);

  const statusCounts = {
    Upcoming: demoBookings.filter((item) => item.status === "Upcoming").length,
    Active: demoBookings.filter((item) => item.status === "Active").length,
    Completed: demoBookings.filter((item) => item.status === "Completed").length,
    Cancelled: demoBookings.filter((item) => item.status === "Cancelled").length,
  };

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
              Rental operations
            </p>
            <h1 className="mt-2 font-serif text-3xl text-[#4c2544] sm:text-4xl">
              Bookings
            </h1>
            <p className="mt-2 text-sm leading-6 text-[#716971]">
              Review sample rental bookings and their current statuses.
            </p>
          </div>

          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-[#e4dfd7] bg-[#fffdf9] px-4 py-2 text-xs font-medium text-[#765c30]">
            <CalendarCheck size={15} />
            Demo bookings
          </span>
        </div>

        <div className="mt-6 rounded-xl border border-[#e4dfd7] bg-[#fffdf9] p-4 text-sm leading-6 text-[#716971]">
          <strong className="text-[#4c2544]">Demo data:</strong> These
          bookings are illustrative records. This page does not create,
          confirm, cancel, or update real bookings.
        </div>

        <section
          aria-label="Booking status summary"
          className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4"
        >
          {(
            [
              ["Upcoming", statusCounts.Upcoming],
              ["Active", statusCounts.Active],
              ["Completed", statusCounts.Completed],
              ["Cancelled", statusCounts.Cancelled],
            ] as const
          ).map(([label, count]) => (
            <button
              key={label}
              type="button"
              onClick={() =>
                setStatus((current) => (current === label ? "All statuses" : label))
              }
              className={`rounded-2xl border p-4 text-left transition sm:p-5 ${
                status === label
                  ? "border-[#4c2544] bg-[#f3efe9]"
                  : "border-[#e4dfd7] bg-[#fffdf9] hover:border-[#c9b6c5]"
              }`}
            >
              <p className="text-sm text-[#716971]">{label}</p>
              <p className="mt-2 text-2xl font-semibold text-[#4c2544]">
                {count}
              </p>
              <p className="mt-1 text-xs text-[#8a8188]">
                Sample {label.toLowerCase()} bookings
              </p>
            </button>
          ))}
        </section>

        <section className="mt-8 overflow-hidden rounded-2xl border border-[#e4dfd7] bg-[#fffdf9]">
          <div className="border-b border-[#e4dfd7] p-5 sm:p-6">
            <h2 className="font-serif text-2xl text-[#4c2544]">
              Booking records
            </h2>
            <p className="mt-1 text-sm text-[#716971]">
              Search by booking ID, customer, or product.
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_220px]">
              <label className="flex h-11 min-w-0 items-center gap-2 rounded-xl border border-[#e4dfd7] bg-white px-3">
                <Search size={17} className="shrink-0 text-[#8a8188]" />
                <span className="sr-only">Search bookings</span>
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search ID, customer, or product..."
                  className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#a29aa0]"
                />
              </label>

              <label className="flex h-11 min-w-0 items-center gap-2 rounded-xl border border-[#e4dfd7] bg-white px-3">
                <SlidersHorizontal
                  size={16}
                  className="shrink-0 text-[#8a8188]"
                />
                <span className="sr-only">Filter by booking status</span>
                <select
                  value={status}
                  onChange={(event) =>
                    setStatus(event.target.value as (typeof statusOptions)[number])
                  }
                  className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                >
                  {statusOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          {filteredBookings.length === 0 ? (
            <div className="px-5 py-16 text-center sm:px-6">
              <CalendarCheck size={30} className="mx-auto text-[#927c59]" />
              <h3 className="mt-4 font-serif text-xl text-[#4c2544]">
                No bookings found
              </h3>
              <p className="mt-2 text-sm text-[#716971]">
                Try a different search term or status.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setStatus("All statuses");
                }}
                className="mt-4 text-sm font-medium text-[#4c2544] underline underline-offset-4"
              >
                Reset filters
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="bg-[#f7f5f1] text-xs uppercase tracking-wide text-[#716971]">
                  <tr>
                    <th className="px-5 py-4 font-medium">Booking ID</th>
                    <th className="px-5 py-4 font-medium">Customer</th>
                    <th className="px-5 py-4 font-medium">Product</th>
                    <th className="px-5 py-4 font-medium">Start date</th>
                    <th className="px-5 py-4 font-medium">End date</th>
                    <th className="px-5 py-4 font-medium">Amount</th>
                    <th className="px-5 py-4 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e4dfd7]">
                  {filteredBookings.map((booking) => (
                    <tr key={booking.id} className="hover:bg-[#fdfbf7]">
                      <td className="whitespace-nowrap px-5 py-4 font-medium text-[#4c2544]">
                        {booking.id}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4">
                        {booking.customer}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4">
                        {booking.product}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-[#716971]">
                        {formatDate(booking.startDate)}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-[#716971]">
                        {formatDate(booking.endDate)}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 font-medium">
                        ₹{booking.amount.toLocaleString("en-IN")}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4">
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
                </tbody>
              </table>
            </div>
          )}

          <div className="border-t border-[#e4dfd7] px-5 py-4 text-xs text-[#8a8188] sm:px-6">
            Showing {filteredBookings.length} of {demoBookings.length} sample
            bookings
          </div>
        </section>
      </div>
    </main>
  );
}
