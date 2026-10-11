import type { BoutiqueRegistration } from "./schema";

export type ApplicationStatus = "PENDING" | "APPROVED" | "REJECTED";
export interface BoutiqueApplication {
  id: string;
  details: BoutiqueRegistration;
  status: ApplicationStatus;
  submittedAt: string;
  rejectionReason?: string;
}

/** The backend must bind these operations to the authenticated applicant. */
export interface BoutiqueOnboardingService {
  readonly mode: "demo" | "live";
  createApplication(input: BoutiqueRegistration): Promise<BoutiqueApplication & { status: "PENDING" }>;
  getCurrentApplication(): Promise<BoutiqueApplication | null>;
}

export class OnboardingServiceError extends Error {
  constructor(message: string, public readonly fieldErrors?: Partial<Record<keyof BoutiqueRegistration, string>>) {
    super(message);
    this.name = "OnboardingServiceError";
  }
}

/** Presentation only. This must never authorize a management operation. */
export function canPresentManagement(application: BoutiqueApplication | null, mode: BoutiqueOnboardingService["mode"]) {
  return mode === "live" && application?.status === "APPROVED";
}
