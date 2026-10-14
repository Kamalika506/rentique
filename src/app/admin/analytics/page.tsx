
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  ChartNoAxesCombined,
  IndianRupee,
  CalendarDays,
  Package,
  TrendingUp,
} from "lucide-react";

const periods = ["7 days", "30 days", "90 days"] as const;
type Period = (typeof periods)[number];

const analytics = {
  "7 days": {
    revenue: 12450,
    bookings: 18,
    customers: 12,
    completed: 11,
    revenueSeries: [1200, 1800, 1500, 2400, 1900, 2100, 1550],
    bookingSeries: [2, 4, 3, 5, 2, 4, 3],
    labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  },
  "30 days": {
    revenue: 48650,
    bookings: 64,
    customers: 42,
    completed: 39,
    revenueSeries: [8200, 11200, 9500, 14300, 12600, 16800],
    bookingSeries: [9, 12, 10, 14, 11, 16],
    labels: ["Week 1", "Week 2", "Week 3", "Week 4", "Week 5", "Week 6"],
  },
  "90 days": {
    revenue: 136800,
    bookings: 192,
    customers: 118,
    completed: 154,
    revenueSeries: [18500, 22400, 19800, 27500, 24300, 34400],
    bookingSeries: [25, 31, 27, 36, 32, 41],
    labels: ["Period 1", "Period 2", "Period 3", "Period 4", "Period 5", "Period 6"],
  },
};

const categories = [
  { name: "Evening wear", share: 42, amount: 20433 },
  { name: "Wedding guest", share: 35, amount: 17028 },
  { name: "Contemporary", share: 23, amount: 11189 },
];

function formatCurrency(amount: number) {
  return `₹${amount.toLocaleString("en-IN")}`;
}

function MiniBarChart({
  values,
  labels,
  formatValue,
}: {
  values: number[];
  labels: string[];
  formatValue?: (value: number) => string;
}) {
  const maximum = Math.max(...values, 1);

  return (
    <div className="mt-6 flex h-48 items-end gap-3 sm:gap-5">
      {values.map((value, index) => (
        <div
          key={labels[index]}
          className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2"
        >
          <span className="text-center text-[10px] text-[#716971] sm:text-xs">
            {formatValue ? formatValue(value) : value}
          </span>
          <div className="flex h-full w-full items-end">
            <div
              title={`${labels[index]}: ${value}`}
              className="w-full rounded-t-lg bg-[#4c2544] transition-all"
              style={{ height: `${Math.max((value / maximum) * 100, 4)}%` }}
            />
          </div>
          <span className="whitespace-nowrap text-[10px] text-[#716971] sm:text-xs">
            {labels[index]}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function AdminAnalyticsPage() {
  const [period, setPeriod] = useState<Period>("30 days");
  const data = useMemo(() => analytics[period], [period]);

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
              Business insights
            </p>
            <h1 className="mt-2 font-serif text-3xl text-[#4c2544] sm:text-4xl">
              Analytics
            </h1>
            <p className="mt-2 text-sm leading-6 text-[#716971]">
              Explore illustrative revenue, bookings, and customer activity.
            </p>
          </div>

          <label className="flex h-11 w-fit items-center gap-3 rounded-xl border border-[#e4dfd7] bg-[#fffdf9] px-3">
            <CalendarDays size={17} className="text-[#927c59]" />
            <span className="sr-only">Analytics period</span>
            <select
              value={period}
              onChange={(event) => setPeriod(event.target.value as Period)}
              className="bg-transparent text-sm outline-none"
            >
              {periods.map((item) => (
                <option key={item} value={item}>
                  Last {item}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-6 rounded-xl border border-[#e4dfd7] bg-[#fffdf9] p-4 text-sm leading-6 text-[#716971]">
          <strong className="text-[#4c2544]">Demo analytics:</strong> These
          metrics and charts use illustrative values. Changing the period
          updates sample figures only; no live business data is queried.
        </div>

        <section
          aria-label="Analytics summary"
          className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
        >
          {[
            {
              label: "Rental revenue",
              value: formatCurrency(data.revenue),
              note: `Last ${period}`,
              icon: IndianRupee,
            },
            {
              label: "Bookings",
              value: data.bookings.toLocaleString("en-IN"),
              note: "Sample booking count",
              icon: Package,
            },
            {
              label: "Customers",
              value: data.customers.toLocaleString("en-IN"),
              note: "Illustrative customer count",
              icon: TrendingUp,
            },
            {
              label: "Completed rentals",
              value: data.completed.toLocaleString("en-IN"),
              note: "Sample completed bookings",
              icon: ChartNoAxesCombined,
            },
          ].map((stat) => {
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
                <p className="mt-4 text-2xl font-semibold text-[#4c2544] sm:text-3xl">
                  {stat.value}
                </p>
                <p className="mt-2 text-xs text-[#8a8188]">{stat.note}</p>
              </article>
            );
          })}
        </section>

        <section className="mt-8 grid gap-6 xl:grid-cols-2">
          <article className="rounded-2xl border border-[#e4dfd7] bg-[#fffdf9] p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-serif text-2xl text-[#4c2544]">
                  Revenue overview
                </h2>
                <p className="mt-1 text-sm text-[#716971]">
                  Illustrative revenue by period
                </p>
              </div>
              <IndianRupee size={21} className="text-[#927c59]" />
            </div>

            <MiniBarChart
              values={data.revenueSeries}
              labels={data.labels}
              formatValue={(value) =>
                value >= 1000 ? `₹${Math.round(value / 1000)}k` : `₹${value}`
              }
            />

            <div className="mt-5 border-t border-[#e4dfd7] pt-4">
              <p className="text-sm text-[#716971]">Total sample revenue</p>
              <p className="mt-1 text-2xl font-semibold text-[#4c2544]">
                {formatCurrency(data.revenue)}
              </p>
            </div>
          </article>

          <article className="rounded-2xl border border-[#e4dfd7] bg-[#fffdf9] p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-serif text-2xl text-[#4c2544]">
                  Booking activity
                </h2>
                <p className="mt-1 text-sm text-[#716971]">
                  Illustrative bookings by period
                </p>
              </div>
              <CalendarDays size={21} className="text-[#927c59]" />
            </div>

            <MiniBarChart values={data.bookingSeries} labels={data.labels} />

            <div className="mt-5 border-t border-[#e4dfd7] pt-4">
              <p className="text-sm text-[#716971]">Total sample bookings</p>
              <p className="mt-1 text-2xl font-semibold text-[#4c2544]">
                {data.bookings}
              </p>
            </div>
          </article>
        </section>

        <section className="mt-6 rounded-2xl border border-[#e4dfd7] bg-[#fffdf9] p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <span className="rounded-xl bg-[#f3efe9] p-2.5 text-[#4c2544]">
              <Package size={20} />
            </span>
            <div>
              <h2 className="font-serif text-2xl text-[#4c2544]">
                Category performance
              </h2>
              <p className="mt-1 text-sm text-[#716971]">
                Illustrative revenue share by clothing category
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-5">
            {categories.map((category) => (
              <div key={category.name}>
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span className="font-medium text-[#302d31]">
                    {category.name}
                  </span>
                  <span className="text-[#716971]">
                    {category.share}% · {formatCurrency(category.amount)}
                  </span>
                </div>
                <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-[#f3efe9]">
                  <div
                    className="h-full rounded-full bg-[#4c2544]"
                    style={{ width: `${category.share}%` }}
                  />
                </div>
              </div>
            ))}
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
