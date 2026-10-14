import { applicationUrl, sendMail, smtpConfigured, type MailMessage } from "@/lib/mail";

export type NotificationStatus = "sent" | "not_configured" | "failed";
interface BoutiqueDecision {
  name: string;
  status: "APPROVED" | "REJECTED" | "PENDING";
  owner: { email: string | null };
  rejectionReason: string | null;
}

/** Decisions are committed before this optional notification is attempted. */
export async function notifyBoutiqueDecision(
  boutique: BoutiqueDecision,
  mail = { configured: smtpConfigured, send: sendMail },
): Promise<{ status: NotificationStatus }> {
  if (!mail.configured() || !boutique.owner.email) return { status: "not_configured" };
  const decision = boutique.status === "APPROVED" ? "approved" : boutique.status === "REJECTED" ? "rejected" : "reopened for review";
  const login = applicationUrl("/login?intent=boutique");
  const message: MailMessage = {
    to: boutique.owner.email,
    subject: `Rentique boutique application ${decision}`,
    text: [
      `Your boutique application for ${boutique.name} has been ${decision}.`,
      boutique.status === "REJECTED" && boutique.rejectionReason ? `Reason: ${boutique.rejectionReason}` : "",
      boutique.status === "APPROVED" ? "Sign in to your boutique dashboard to manage your products and bookings." : "Sign in to view your application status.",
      login?.toString() ?? "",
      "Rentique administration",
    ].filter(Boolean).join("\n\n"),
  };
  try { await mail.send(message); return { status: "sent" }; }
  catch { return { status: "failed" }; }
}
