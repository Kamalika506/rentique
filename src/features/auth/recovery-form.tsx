"use client";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { api, jsonRequest } from "@/lib/api-client";
import CustomerHeader from "@/components/layout/customer-header";
import CustomerFooter from "@/components/layout/customer-footer";

type Mode = "forgot-password" | "reset-password" | "verify-email";
export function RecoveryScreen({ mode }: { mode: Mode }) { return <Suspense fallback={<main role="status" className="p-8">Loading account recovery...</main>}><RecoveryForm mode={mode} /></Suspense>; }
function RecoveryForm({ mode }: { mode: Mode }) {
  const params = useSearchParams(), token = params.get("token");
  const [email, setEmail] = useState(""), [password, setPassword] = useState(""), [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState(""), [error, setError] = useState(""), [busy, setBusy] = useState(false), [done, setDone] = useState(false);
  const title = mode === "forgot-password" ? "Reset your password" : mode === "reset-password" ? "Choose a new password" : "Verify your email";
  async function submit(event: React.FormEvent) {
    event.preventDefault(); if (busy || done) return;
    setError(""); setMessage("");
    if (mode === "reset-password" && password !== confirm) { setError("Passwords do not match."); return; }
    if (mode === "reset-password" && !token) { setError("The reset link is missing. Request a new link."); return; }
    setBusy(true);
    try {
      const endpoint = mode === "verify-email" && !token ? "verification-email" : mode;
      const body = mode === "reset-password" ? { token, password } : mode === "verify-email" && token ? { token } : { email };
      const result = await api<{ message: string }>("/api/auth/" + endpoint, jsonRequest("POST", body));
      setMessage(result.message); if (mode === "reset-password" || (mode === "verify-email" && token)) setDone(true);
    } catch (error) { setError(error instanceof Error ? error.message : "The request could not be completed."); }
    finally { setBusy(false); }
  }
  return <div className="min-h-screen bg-[#f7f5f1]"><CustomerHeader /><main className="mx-auto max-w-lg px-5 py-12"><section className="rounded-3xl border bg-white p-7"><h1 className="font-serif text-3xl text-[#4c2544]">{title}</h1>
    <p className="mt-3 text-sm">{mode === "forgot-password" ? "Enter your account email to receive a secure reset link." : mode === "verify-email" && !token ? "Request a verification link for your account email." : "Complete this action to secure your account."}</p>
    {!done && <form onSubmit={submit} className="mt-6 space-y-4">{(mode === "forgot-password" || (mode === "verify-email" && !token)) && <label className="block">Email<input required type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} className="mt-1 block w-full rounded-xl border p-3" /></label>}
      {mode === "reset-password" && <><label className="block">New password<input required type="password" minLength={8} maxLength={72} autoComplete="new-password" value={password} onChange={event => setPassword(event.target.value)} className="mt-1 block w-full rounded-xl border p-3" /></label><label className="block">Confirm password<input required type="password" minLength={8} autoComplete="new-password" value={confirm} onChange={event => setConfirm(event.target.value)} className="mt-1 block w-full rounded-xl border p-3" /></label></>}
      <button disabled={busy} className="w-full rounded-full bg-[#4c2544] p-3 text-white">{busy ? "Please wait..." : mode === "verify-email" && token ? "Verify email" : mode === "reset-password" ? "Save new password" : "Send email"}</button>
    </form>}{message && <p role="status" className="mt-4">{message}</p>}{error && <p role="alert" className="mt-4 text-red-700">{error}</p>}
    <div className="mt-5 flex gap-5 text-sm"><Link href="/login" className="underline">Sign in</Link>{mode === "reset-password" && <Link href="/forgot-password" className="underline">Request a new link</Link>}</div>
  </section></main><CustomerFooter /></div>;
}
