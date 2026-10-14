import { BookingWorkspace } from "@/features/boutiques/booking-management/workspace";
import { AccountGuard } from "@/features/auth/guards";
export default function Layout({ children }: { children: React.ReactNode }) { return <AccountGuard boutique approved><BookingWorkspace>{children}</BookingWorkspace></AccountGuard>; }
