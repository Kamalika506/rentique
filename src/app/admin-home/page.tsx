import { WorkspaceHome } from "@/features/auth/workspace-home";

export const metadata = { title: "Administrator home | Rentique" };
export default function AdminHomePage() { return <WorkspaceHome role="ADMIN" />; }
