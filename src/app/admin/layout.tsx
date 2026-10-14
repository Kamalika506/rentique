import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { ApiError, currentUser } from "@/lib/api";
import { AdminShell } from "@/features/admin/shell";

async function AuthorizedWorkspace({ children }: { children: React.ReactNode }) {
  await connection();
  try { await currentUser("ADMIN"); }
  catch (error) {
    if (error instanceof ApiError) redirect(error.status === 401 ? "/login?intent=admin" : "/profile");
    throw error;
  }
  return <AdminShell>{children}</AdminShell>;
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<main className="p-10" aria-live="polite">Opening administrator workspace...</main>}><AuthorizedWorkspace>{children}</AuthorizedWorkspace></Suspense>;
}
