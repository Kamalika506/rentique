"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api, jsonRequest } from "@/lib/api-client";
import type { BoutiqueApplication } from "@/features/boutiques/onboarding/service";

export default function BoutiqueReviewsPage() {
  const [applications, setApplications] = useState<BoutiqueApplication[]>([]), [error, setError] = useState(""), [busy, setBusy] = useState(false), [loaded, setLoaded] = useState(false);
  const load = useCallback(async () => { try { setApplications(await api("/api/admin/boutiques")); setLoaded(true); setError(""); } catch (error) { setError(error instanceof Error ? error.message : "Applications could not be loaded."); } }, []);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => clearTimeout(timer); }, [load]);
  async function review(id: string, status: "APPROVED" | "REJECTED") {
    const reason = status === "REJECTED" ? window.prompt("Reason for rejection") : undefined;
    if (status === "REJECTED" && !reason) return;
    setBusy(true);
    try { await api("/api/admin/boutiques", jsonRequest("PATCH", { id, status, reason })); await load(); }
    catch (error) { setError(error instanceof Error ? error.message : "Review failed."); }
    finally { setBusy(false); }
  }
  return <main className="mx-auto max-w-5xl px-5 py-12"><Link className="underline" href="/profile">Back to profile</Link><h1 className="my-6 font-serif text-4xl">Boutique applications</h1>
    {error && <p role="alert">{error}</p>}{loaded && !applications.length && <p>No pending applications.</p>}
    <div className="space-y-5">{applications.map(application => <article className="rounded-xl border p-6" key={application.id}><h2 className="text-2xl">{application.details.name}</h2><p className="my-3">{application.details.description}</p><p>{application.details.address}, {application.details.city}</p><p>{application.details.contactEmail} · {application.details.phone}</p><div className="mt-5 flex gap-5"><button disabled={busy} onClick={() => void review(application.id, "APPROVED")} className="underline">Approve</button><button disabled={busy} onClick={() => void review(application.id, "REJECTED")} className="underline">Reject</button></div></article>)}</div>
  </main>;
}
