import { AccountGuard } from "@/features/auth/guards";

// Authentication may redirect before the wishlist renders.
// Do not validate instant UI across this session-dependent boundary.
export const instant = false;

export default function Layout({ children }: { children: React.ReactNode }) { return <AccountGuard role="CUSTOMER">{children}</AccountGuard>; }
