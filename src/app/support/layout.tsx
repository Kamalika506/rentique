import { AccountGuard } from "@/features/auth/guards";
export default function Layout({ children }: { children: React.ReactNode }) { return <AccountGuard role="CUSTOMER">{children}</AccountGuard>; }
