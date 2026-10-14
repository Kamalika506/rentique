"use client";
import { useState } from "react";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { api, jsonRequest } from "@/lib/api-client";
export default function Page() {
  const [currentPassword, setCurrentPassword] = useState(""), [password, setPassword] = useState(""), [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  async function change(event: React.FormEvent) { event.preventDefault(); if (busy) return; setError(""); if (password !== confirmation) { setError("New passwords do not match."); return; } setBusy(true); try { await api("/api/profile/password", jsonRequest("PATCH", { currentPassword, password })); await signOut({ callbackUrl: "/login" }); } catch (error) { setError(error instanceof Error ? error.message : "Password could not be changed."); } finally { setBusy(false); } }
  return <main className="mx-auto w-full max-w-lg px-5 py-12"><Link href="/profile" className="underline">Back to profile</Link><h1 className="mt-6 font-serif text-3xl">Change password</h1><form onSubmit={change} className="mt-6 space-y-5">{[["Current password", currentPassword, setCurrentPassword], ["New password", password, setPassword], ["Confirm new password", confirmation, setConfirmation]].map(([label, value, setter]) => <label key={label as string} className="block">{label as string}<input className="mt-2 block w-full rounded-xl border p-3" type="password" required minLength={label === "Current password" ? 1 : 8} maxLength={72} autoComplete={label === "Current password" ? "current-password" : "new-password"} value={value as string} onChange={event => (setter as (value: string) => void)(event.target.value)} /></label>)}{error && <p role="alert">{error}</p>}<button disabled={busy} className="rounded-full bg-[#4c2544] px-6 py-3 text-white">{busy ? "Saving..." : "Save password"}</button></form><p className="mt-5 text-sm">You will be signed out after changing your password.</p></main>;
}
