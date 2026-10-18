"use client";
import { useEffect, useState } from "react";
import { api, jsonRequest } from "@/lib/api-client";
type Report = { id: string; subject: string; message: string; status: string; response: string; version: number; user: { name: string | null; email: string | null } };
export default function Page() {
  const [reports, setReports] = useState<Report[]>([]), [error, setError] = useState(""), [busy, setBusy] = useState(false);
  useEffect(() => { const controller = new AbortController(); api<Report[]>("/api/admin/support", { signal: controller.signal }).then(setReports).catch(error => { if (!controller.signal.aborted) setError(error.message); }); return () => controller.abort(); }, []);
  async function reply(event: React.FormEvent<HTMLFormElement>, report: Report) {
    event.preventDefault(); const form = new FormData(event.currentTarget); setBusy(true); setError("");
    try { const updated = await api<Report>("/api/admin/support", jsonRequest("PATCH", { id: report.id, version: report.version, status: form.get("status"), response: form.get("response") })); setReports(items => items.map(item => item.id === report.id ? { ...item, ...updated } : item)); }
    catch (error) { setError(error instanceof Error ? error.message : "Could not update report."); }
    finally { setBusy(false); }
  }
  return <><h1 className="font-serif text-4xl text-[#4c2544]">Customer problem reports</h1>{error && <p role="alert" className="mt-5">{error}</p>}<div className="mt-7 space-y-5">{reports.map(report => <article key={report.id} className="rounded-xl border bg-white p-6"><h2 className="text-xl">{report.subject}</h2><p className="mt-2 text-sm">{report.user.name} · {report.user.email}</p><p className="mt-4 whitespace-pre-line">{report.message}</p><form onSubmit={event => void reply(event, report)} className="mt-5 space-y-4"><label className="block text-sm">Status<select name="status" defaultValue={report.status} className="ml-3 rounded border p-2"><option>OPEN</option><option>IN_PROGRESS</option><option>RESOLVED</option></select></label><label className="block text-sm">Customer-visible response<textarea name="response" required minLength={3} maxLength={3000} defaultValue={report.response} className="mt-2 block w-full rounded border p-3" /></label><button disabled={busy} className="rounded-full bg-[#4c2544] px-5 py-2 text-white">Save response</button></form></article>)}</div></>;
}
