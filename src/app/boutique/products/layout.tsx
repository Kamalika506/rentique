import { InventoryWorkspace } from "@/features/boutiques/inventory/workspace";
import { AccountGuard } from "@/features/auth/guards";
export default function ProductsLayout({ children }: { children: React.ReactNode }) { return <AccountGuard boutique approved><InventoryWorkspace>{children}</InventoryWorkspace></AccountGuard>; }
