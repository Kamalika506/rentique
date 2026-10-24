import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { ApiError, currentUser } from "@/lib/api";
import { prisma } from "@/lib/prisma";

async function AccountContent({ children, role, boutique, approved, customerOnly }: { children: React.ReactNode; role?: "CUSTOMER"; boutique?: boolean; approved?: boolean; customerOnly?: boolean }) {
  await connection();
  let user;
  try { user = await currentUser(role); } catch (error) { if (error instanceof ApiError) redirect(error.status === 401 ? boutique ? "/login?intent=boutique" : "/login" : "/profile"); throw error; }
  if (customerOnly && user.role !== "CUSTOMER") redirect(user.role === "BOUTIQUE_OWNER" ? "/boutique-home" : "/admin-home");
  if (boutique) {
    if (user.role !== "BOUTIQUE_OWNER") redirect("/profile");
    const shop = await prisma.boutique.findUnique({ where: { ownerId: user.id } });
    if (!shop) redirect("/boutique/register");
    if (approved && shop.status !== "APPROVED") redirect("/boutique/pending");
  }
  return children;
}
export function AccountGuard(props: { children: React.ReactNode; role?: "CUSTOMER"; boutique?: boolean; approved?: boolean; customerOnly?: boolean }) {
  return <Suspense fallback={<main role="status" className="p-8">Opening your account...</main>}><AccountContent {...props} /></Suspense>;
}
