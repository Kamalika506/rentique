"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import CustomerHeader from "@/components/layout/customer-header";
import CustomerFooter from "@/components/layout/customer-footer";
import { api, jsonRequest } from "@/lib/api-client";
type Notice = { id: string; title: string; message: string; href: string; readAt: string | null; scheduledFor: string };
export default function NotificationsPage() {
  const [notices, setNotices] = useState<Notice[] | null>(null), [error, setError] = useState("");
  useEffect(() => { const controller = new AbortController(); api<Notice[]>("/api/notifications", { signal: controller.signal }).then(setNotices).catch(error => { if (!controller.signal.aborted) setError(error.message); }); return () => controller.abort(); }, []);
  async function mark(id: string) { try { await api("/api/notifications", jsonRequest("PATCH", { id })); setNotices(items => items?.map(item => item.id === id ? { ...item, readAt: new Date().toISOString() } : item) ?? []); } catch { setError("Could not mark this notification read."); } }
  return <div className="min-h-screen bg-[#f7f5f1]"><CustomerHeader /><main className="mx-auto max-w-4xl px-5 py-12"><h1 className="font-serif text-4xl text-[#4c2544]">Notifications and reminders</h1>{error && <p role="alert" className="mt-5">{error}</p>}{!notices ? <p role="status" className="mt-5">Loading…</p> : !notices.length ? <p className="mt-6">No notifications yet.</p> : <ul className="mt-7 space-y-4">{notices.map(notice => <li key={notice.id} className="rounded-xl border bg-white p-5"><h2 className="font-medium">{notice.title}{!notice.readAt && " · Unread"}</h2><p className="mt-2">{notice.message}</p><time className="mt-2 block text-xs">{new Date(notice.scheduledFor).toLocaleString("en-IN")}</time><Link href={notice.href} className="mt-3 inline-block underline">View details</Link>{!notice.readAt && <button onClick={() => void mark(notice.id)} className="ml-5 underline">Mark read</button>}</li>)}</ul>}</main><CustomerFooter /></div>;
}
