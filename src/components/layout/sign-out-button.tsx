"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";

export function SignOutButton({ className }: { className?: string }) {
  const [busy, setBusy] = useState(false);
  return <button type="button" disabled={busy} className={className} onClick={() => { setBusy(true); void signOut({ callbackUrl: "/" }).catch(() => setBusy(false)); }}>{busy ? "Signing out..." : "Sign out"}</button>;
}
