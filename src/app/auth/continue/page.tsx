import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/api";
export default function Page({ searchParams }: { searchParams: Promise<{ intent?: string }> }) { return <Suspense fallback={<p role="status">Opening your account...</p>}><Continue searchParams={searchParams} /></Suspense>; }
async function Continue({ searchParams }: { searchParams: Promise<{ intent?: string }> }) { await connection(); const user = await currentUser(); const { intent } = await searchParams; return redirect(user.role === "ADMIN" ? "/admin" : user.role === "BOUTIQUE_OWNER" ? "/boutique/dashboard" : intent === "boutique" ? "/boutique/register" : "/profile"); }
