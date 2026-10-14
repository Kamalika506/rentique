"use client";

import { SessionProvider, useSession } from "next-auth/react";
import { useEffect } from "react";

function SessionRefresh() {
  const { update } = useSession();
  useEffect(() => {
    const refresh = () => { void update(); };
    window.addEventListener("rentique:session-change", refresh);
    return () => window.removeEventListener("rentique:session-change", refresh);
  }, [update]);
  return null;
}

export default function CustomerSessionProvider({ children }: { children: React.ReactNode }) {
  return <SessionProvider><SessionRefresh />{children}</SessionProvider>;
}
