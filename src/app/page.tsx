import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import CustomerHome from "@/features/marketplace/customer-home";

async function AccountHome() {
  await connection();
  const session = await auth();
  if (session?.user.role === "BOUTIQUE_OWNER") redirect("/boutique-home");
  if (session?.user.role === "ADMIN") redirect("/admin-home");
  return <CustomerHome />;
}

export default function Home() {
  return <Suspense fallback={<main className="min-h-screen bg-[#f7f5f1] p-8 text-[#4c2544]" role="status">Opening your home...</main>}><AccountHome /></Suspense>;
}
