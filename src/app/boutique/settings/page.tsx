import { redirect } from "next/navigation";

// Profile editing awaits the shared boutique backend; show the implemented status screen.
export default function SettingsPage() {
  redirect("/boutique/pending");
}
