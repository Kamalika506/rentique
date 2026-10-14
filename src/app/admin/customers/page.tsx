
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  Search,
  Users,
  SlidersHorizontal,
} from "lucide-react";

type CustomerStatus = "Active" | "New" | "Inactive";

type Customer = {
  id: string;
  name: string;
  email: string;
  joined: string;
  rentals: number;
  spending: number;
  status: CustomerStatus;
};

const demoCustomers: Customer[] = [
  {
    id: "CUS-1001",
    name: "Ananya Sharma",
    email: "ananya@example.com",
    joined: "2026-08-12",
    rentals: 5,
    spending: 6495,
    status: "Active",
  },
  {
    id: "CUS-1002",
    name: "Priya Menon",
    email: "priya@example.com",
    joined: "2026-09-02",
    rentals: 3,
    spending: 3297,
    status: "Active",
  },
  {
    id: "CUS-1003",
    name: "Meera Iyer",
    email: "meera@example.com",
    joined: "2026-10-01",
    rentals: 1,
    spending: 1499,
    status: "New",
  },
  {
    id: "CUS-1004",
    name: "Kavya Rao",
    email: "kavya@example.com",
    joined: "2026-07-19",
    rentals: 4,
    spending: 5196,
    status: "Active",
  },
  {
    id: "CUS-1005",
    name: "Divya Krishnan",
    email: "divya@example.com",
    joined: "2026-10-10",
    rentals: 0,
    spending: 0,
    status: "New",
  },
  {
    id: "CUS-1006",
    name: "Nisha Reddy",
    email: "nisha@example.com",
    joined: "2026-06-25",
    rentals: 2,
    spending: 1998,
    status: "Inactive",
  },
];

const statusOptions = ["All statuses", "Active", "New", "Inactive"] as const;

function customerStatusClasses(status: CustomerStatus) {
  switch (status) {
    case "Active":
      return "bg-[#e7f3e9] text-[#28643b]";
    case "New":
      return "bg-[#eee8f2] text-[#654576]";
    case "Inactive":
      return "bg-[#f3efe9] text-[#765c30]";
  }
}

function formatDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function AdminCustomersPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] =
    useState<(typeof statusOptions)[number]>("All statuses");

  const filteredCustomers = useMemo(() => {
    const query = search.trim().toLowerCase();

    return demoCustomers.filter((customer) => {
      const matchesSearch =
        `${customer.id} ${customer.name} ${customer.email}`
          .toLowerCase()
          .includes(query);

      const matchesStatus =
        status === "All statuses" || customer.status === status;

      return matchesSearch && matchesStatus;
    });
  }, [search, status]);

  const totalRentals = demoCustomers.reduce(
    (total, customer) => total + customer.rentals,
    0
  );

  const totalSpending = demoCustomers.reduce(
    (total, customer) => total + customer.spending,
    0
  );

  const activeCustomers = demoCustomers.filter(
    (customer) => customer.status === "Active"
  ).length;

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
              Customer directory
            </p>
            <h1 className="mt-2 font-serif text-3xl text-[#4c2544] sm:text-4xl">
              Customers
            </h1>
            <p className="mt-2 text-sm leading-6 text-[#716971]">
              Review sample customer profiles and rental activity.
            </p>
          </div>

          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-[#e4dfd7] bg-[#fffdf9] px-4 py-2 text-xs font-medium text-[#765c30]">
            <Users size={15} />
            Demo customers
          </span>
        </div>

        <div className="mt-6 rounded-xl border border-[#e4dfd7] bg-[#fffdf9] p-4 text-sm leading-6 text-[#716971]">
          <strong className="text-[#4c2544]">Demo data:</strong> All customer
          names, email addresses, rental counts, and spending totals below are
          illustrative. This page does not access real customer accounts or
          personal information.
        </div>

        <section
          aria-label="Customer summary"
          className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
        >
          <article className="rounded-2xl border border-[#e4dfd7] bg-[#fffdf9] p-5">
            <p className="text-sm text-[#716971]">Sample customers</p>
            <p className="mt-3 text-3xl font-semibold text-[#4c2544]">
              {demoCustomers.length}
            </p>
            <p className="mt-2 text-xs text-[#8a8188]">
              Records in this demo directory
            </p>
          </article>

          <article className="rounded-2xl border border-[#e4dfd7] bg-[#fffdf9] p-5">
            <p className="text-sm text-[#716971]">Active customers</p>
            <p className="mt-3 text-3xl font-semibold text-[#4c2544]">
              {activeCustomers}
            </p>
            <p className="mt-2 text-xs text-[#8a8188]">
              Illustrative customer statuses
            </p>
          </article>

          <article className="rounded-2xl border border-[#e4dfd7] bg-[#fffdf9] p-5 sm:col-span-2 xl:col-span-1">
            <p className="text-sm text-[#716971]">Recorded sample rentals</p>
            <p className="mt-3 text-3xl font-semibold text-[#4c2544]">
              {totalRentals}
            </p>
            <p className="mt-2 text-xs text-[#8a8188]">
              Sample spending total: ₹
              {totalSpending.toLocaleString("en-IN")}
            </p>
          </article>
        </section>

        <section className="mt-8 overflow-hidden rounded-2xl border border-[#e4dfd7] bg-[#fffdf9]">
          <div className="border-b border-[#e4dfd7] p-5 sm:p-6">
            <h2 className="font-serif text-2xl text-[#4c2544]">
              Customer records
            </h2>
            <p className="mt-1 text-sm text-[#716971]">
              Search by customer name, email, or customer ID.
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_220px]">
              <label className="flex h-11 min-w-0 items-center gap-2 rounded-xl border border-[#e4dfd7] bg-white px-3">
                <Search size={17} className="shrink-0 text-[#8a8188]" />
                <span className="sr-only">Search customers</span>
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search name, email, or ID..."
                  className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#a29aa0]"
                />
              </label>

              <label className="flex h-11 min-w-0 items-center gap-2 rounded-xl border border-[#e4dfd7] bg-white px-3">
                <SlidersHorizontal
                  size={16}
                  className="shrink-0 text-[#8a8188]"
                />
                <span className="sr-only">Filter customers by status</span>
                <select
                  value={status}
                  onChange={(event) =>
                    setStatus(
                      event.target.value as (typeof statusOptions)[number]
                    )
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

          {filteredCustomers.length === 0 ? (
            <div className="px-5 py-16 text-center sm:px-6">
              <Users size={30} className="mx-auto text-[#927c59]" />
              <h3 className="mt-4 font-serif text-xl text-[#4c2544]">
                No customers found
              </h3>
              <p className="mt-2 text-sm text-[#716971]">
                Try another search term or status.
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
              <table className="w-full min-w-[800px] text-left text-sm">
                <thead className="bg-[#f7f5f1] text-xs uppercase tracking-wide text-[#716971]">
                  <tr>
                    <th className="px-5 py-4 font-medium">Customer</th>
                    <th className="px-5 py-4 font-medium">Customer ID</th>
                    <th className="px-5 py-4 font-medium">Joined</th>
                    <th className="px-5 py-4 font-medium">Rentals</th>
                    <th className="px-5 py-4 font-medium">Sample spending</th>
                    <th className="px-5 py-4 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e4dfd7]">
                  {filteredCustomers.map((customer) => (
                    <tr key={customer.id} className="hover:bg-[#fdfbf7]">
                      <td className="px-5 py-4">
                        <p className="whitespace-nowrap font-medium text-[#302d31]">
                          {customer.name}
                        </p>
                        <p className="mt-1 whitespace-nowrap text-xs text-[#716971]">
                          {customer.email}
                        </p>
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 font-medium text-[#4c2544]">
                        {customer.id}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-[#716971]">
                        {formatDate(customer.joined)}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4">
                        {customer.rentals}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 font-medium">
                        ₹{customer.spending.toLocaleString("en-IN")}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4">
                        <span
                          className={`rounded-full px-3 py-1.5 text-xs font-medium ${customerStatusClasses(
                            customer.status
                          )}`}
                        >
                          {customer.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="border-t border-[#e4dfd7] px-5 py-4 text-xs text-[#8a8188] sm:px-6">
            Showing {filteredCustomers.length} of {demoCustomers.length} sample
            customers
          </div>
        </section>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/admin/bookings"
            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#4c2544] px-5 py-3 text-sm font-medium text-white hover:bg-[#633358]"
          >
            View bookings <ArrowUpRight size={16} />
          </Link>
          <Link
            href="/admin/products"
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#e4dfd7] bg-[#fffdf9] px-5 py-3 text-sm font-medium text-[#4c2544] hover:bg-[#f3efe9]"
          >
            View products <ArrowUpRight size={16} />
          </Link>
        </div>
      </div>
    </main>
  );
}
