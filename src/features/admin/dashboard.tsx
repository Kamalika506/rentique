"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api-client";

interface Dashboard {
  asOf: string;
  summary: { customers: number; activeUsers: number; boutiques: number; pendingBoutiques: number; approvedBoutiques: number; products: number; activeProducts: number; totalBookings: number; pendingBookings: number; activeRentals: number; completedRentals: number; completedRentalRevenueMinor: number };
  recentBookings: { id: string; customer: string; boutique: string; products: string; status: string; rentalMinor: number; createdAt: string }[];
  recentActivity: { id: string; action: string; actor: string; createdAt: string }[];
  bookingStatuses: { status: string; count: number }[];
  popularProducts: { name: string; quantity: number }[];
  months: { month: string; bookings: number; completedRevenueMinor: number }[];
}
const money = (minor: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(minor / 100);
const date = (value: string) => new Date(value).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
const human = (value: string) => value.toLowerCase().replaceAll("_", " ");

export function AdminDashboard({ analytics = false }: { analytics?: boolean }) {
  const [data, setData] = useState<Dashboard | null>(null), [error, setError] = useState(""), [loading, setLoading] = useState(true);
  const load = useCallback(async () => { setLoading(true); try { setData(await api<Dashboard>("/api/admin/dashboard")); setError(""); } catch (error) { setError(error instanceof Error ? error.message : "Could not load the dashboard."); } finally { setLoading(false); } }, []);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => clearTimeout(timer); }, [load]);
  return <div className="mx-auto max-w-7xl"><div className="flex items-center justify-between gap-4"><div><p className="text-xs uppercase tracking-widest text-[#927c59]">Platform overview</p><h1 className="mt-2 font-serif text-4xl text-[#4c2544]">{analytics ? "Platform analytics" : "Admin dashboard"}</h1></div><button type="button" disabled={loading} onClick={() => void load()} className="rounded-full border bg-white px-4 py-2 text-sm disabled:opacity-50">Refresh</button></div>
    {error && <p role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-red-800">{error}</p>}{loading && !data && <p className="mt-6" aria-live="polite">Loading platform records...</p>}
    {data && <><p className="mt-3 text-sm text-[#716971]">Updated {date(data.asOf)}. Revenue reflects completed rental charges; payment receipts are separate.</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[
        ["Customers", data.summary.customers, `${data.summary.activeUsers} active platform accounts`, "/admin/customers"],
        ["Approved boutiques", data.summary.approvedBoutiques, `${data.summary.pendingBoutiques} awaiting review`, "/admin/boutiques"],
        ["Total bookings", data.summary.totalBookings, `${data.summary.pendingBookings} pending requests`, "/admin/bookings"],
        ["Completed rental revenue", money(data.summary.completedRentalRevenueMinor), `${data.summary.completedRentals} completed rentals`, "/admin/analytics"],
        ["Live products", data.summary.activeProducts, `${data.summary.products} total products`, "/admin/products"],
        ["Active rentals", data.summary.activeRentals, "Currently picked up by customers", "/admin/bookings"],
      ].map(([label, value, note, href]) => <Link href={String(href)} key={String(label)} className="rounded-2xl border border-[#e4dfd7] bg-white p-5"><p className="text-sm text-[#716971]">{label}</p><p className="mt-3 text-3xl font-semibold">{value}</p><p className="mt-2 text-xs text-[#716971]">{note}</p></Link>)}</div>
      {analytics ? <div className="mt-8 grid gap-6 xl:grid-cols-2"><section className="rounded-2xl border bg-white p-5"><h2 className="font-serif text-2xl">Monthly bookings and revenue</h2><table className="mt-4 w-full text-left text-sm"><thead><tr className="border-b"><th className="py-3">Month</th><th>Bookings</th><th>Completed charges</th></tr></thead><tbody>{data.months.map(month => <tr key={month.month} className="border-b"><td className="py-3">{month.month}</td><td>{month.bookings}</td><td>{money(month.completedRevenueMinor)}</td></tr>)}</tbody></table>{!data.months.length && <p className="py-5 text-sm">No bookings yet.</p>}</section><section className="rounded-2xl border bg-white p-5"><h2 className="font-serif text-2xl">Popular rental products</h2><p className="mt-2 text-sm text-[#716971]">Requested quantities, excluding cancelled and rejected bookings.</p><ul className="mt-4 space-y-3">{data.popularProducts.map((product, index) => <li key={`${product.name}-${index}`} className="flex justify-between gap-3 border-b pb-3"><span>{product.name}</span><span>{product.quantity}</span></li>)}</ul>{!data.popularProducts.length && <p className="py-5 text-sm">No rental requests yet.</p>}<h3 className="mt-6 font-medium">Booking statuses</h3><ul className="mt-3 space-y-2">{data.bookingStatuses.map(status => <li key={status.status} className="flex justify-between"><span className="capitalize">{human(status.status)}</span><span>{status.count}</span></li>)}</ul></section></div> : <div className="mt-8 grid gap-6 xl:grid-cols-3"><section className="overflow-hidden rounded-2xl border bg-white xl:col-span-2"><div className="flex items-center justify-between border-b p-5"><h2 className="font-serif text-2xl">Recent bookings</h2><Link href="/admin/bookings" className="text-sm underline">View all</Link></div><div className="overflow-x-auto"><table className="w-full min-w-[600px] text-left text-sm"><thead className="bg-[#f7f5f1]"><tr><th className="p-4">Customer / boutique</th><th>Product</th><th>Rental</th><th>Status</th></tr></thead><tbody>{data.recentBookings.map(booking => <tr key={booking.id} className="border-t"><td className="p-4"><p>{booking.customer}</p><p className="text-xs text-[#716971]">{booking.boutique}</p></td><td>{booking.products}</td><td>{money(booking.rentalMinor)}</td><td className="capitalize">{human(booking.status)}</td></tr>)}</tbody></table>{!data.recentBookings.length && <p className="p-6 text-sm">No bookings yet.</p>}</div></section><section className="rounded-2xl border bg-white p-5"><div className="flex justify-between"><h2 className="font-serif text-2xl">Recent activity</h2><Link href="/admin/activity" className="text-sm underline">View all</Link></div><ul className="mt-5 space-y-4">{data.recentActivity.map(event => <li key={event.id} className="border-b pb-3"><p className="text-sm capitalize">{human(event.action)}</p><p className="mt-1 text-xs text-[#716971]">{event.actor} · {date(event.createdAt)}</p></li>)}</ul>{!data.recentActivity.length && <p className="mt-5 text-sm">No platform activity yet.</p>}</section></div>}
    </>}
  </div>;
}
