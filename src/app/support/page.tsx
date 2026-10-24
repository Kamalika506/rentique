"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import CustomerHeader from "@/components/layout/customer-header";
import CustomerFooter from "@/components/layout/customer-footer";
import { api, jsonRequest } from "@/lib/api-client";
type Report = { id: string; subject: string; message: string; status: string; response: string };
export default function Page() { return <Suspense fallback={<p role="status">Opening support…</p>}><Support /></Suspense>; }
function Support() {
  const params = useSearchParams();
  const [reports, setReports] = useState<Report[]>([]), [subject, setSubject] = useState(params.get("subject") ?? ""), [message, setMessage] = useState(""), [feedback, setFeedback] = useState(""), [busy, setBusy] = useState(false);
  useEffect(() => { const controller = new AbortController(); api<Report[]>("/api/support", { signal: controller.signal }).then(setReports).catch(error => { if (!controller.signal.aborted) setFeedback(error.message); }); return () => controller.abort(); }, []);
  async function submit(event: React.FormEvent) {
    event.preventDefault(); if (busy) return; setBusy(true); setFeedback("");
    try { const report = await api<Report>("/api/support", jsonRequest("POST", { subject, message, ...(params.get("bookingId") ? { bookingId: params.get("bookingId") } : {}) })); setReports(items => [report, ...items]); setSubject(""); setMessage(""); setFeedback("Complaint submitted. Track its status and support replies below or in notifications."); }
    catch (error) { setFeedback(error instanceof Error ? error.message : "Could not submit complaint."); }
    finally { setBusy(false); }
  }
  return <div className="min-h-screen bg-[#f7f5f1]"><CustomerHeader /><main className="mx-auto max-w-4xl px-5 py-12"><h1 className="font-serif text-4xl text-[#4c2544]">Help & complaints</h1><p className="mt-4">Need help? Raise a complaint about a reservation, listing, return status, or your boutique experience. Our support team will review it.</p>{params.get("bookingId") && <p className="mt-3 text-sm">Reservation: {params.get("bookingId")}</p>}
    <form onSubmit={submit} className="mt-7 space-y-5 rounded-xl border bg-white p-6"><label className="block">Subject<input required minLength={5} maxLength={160} value={subject} disabled={busy} onChange={event => setSubject(event.target.value)} className="mt-2 block w-full rounded border p-3" /></label><label className="block">What happened?<textarea required minLength={10} maxLength={3000} value={message} disabled={busy} onChange={event => setMessage(event.target.value)} className="mt-2 block w-full rounded border p-3" rows={5} /></label><button disabled={busy} className="rounded-full bg-[#4c2544] px-6 py-3 text-white">{busy ? "Sending…" : "Raise complaint"}</button></form>
    {feedback && <p role="status" className="mt-5">{feedback}</p>}<h2 className="mt-10 font-serif text-2xl">Your complaints</h2><div className="mt-5 space-y-4">{reports.length === 0 && <p className="text-sm text-[#716971]">Your submitted complaints and support replies will appear here.</p>}{reports.map(report => <article key={report.id} className="rounded-xl border bg-white p-5"><h3 className="font-medium">{report.subject} · {report.status.replaceAll("_", " ")}</h3><p className="mt-3 whitespace-pre-line">{report.message}</p>{report.response && <p className="mt-4 whitespace-pre-line border-t pt-4">Support response: {report.response}</p>}</article>)}</div>
  </main><CustomerFooter /></div>;
}
