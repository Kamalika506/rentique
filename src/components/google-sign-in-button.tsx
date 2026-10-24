"use client";

import { useEffect, useState } from "react";
import { getProviders, signIn } from "next-auth/react";

export default function GoogleSignInButton({ boutiqueIntent = false }: { boutiqueIntent?: boolean }) {
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    getProviders()
      .then((providers) => { if (active) setEnabled(Boolean(providers?.google)); })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  async function handleSignIn() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await signIn("google", {
        redirectTo: boutiqueIntent ? "/auth/continue?intent=boutique" : "/auth/continue",
      });
    } catch {
      setError("Unable to start Google sign-in. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (!enabled) return null;

  return (
    <div className="mt-5">
      <button
        type="button"
        disabled={busy}
        onClick={handleSignIn}
        className="flex h-12 w-full items-center justify-center rounded-full border border-[#d7cec5] bg-white px-5 text-sm font-medium transition hover:bg-[#f3efe9] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4c2544] disabled:cursor-wait disabled:opacity-60"
      >
        {busy ? "Connecting to Google…" : "Continue with Google"}
      </button>
      {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
    </div>
  );
}
