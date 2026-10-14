import { boutiqueRegistrationSchema } from "../../onboarding/schema";
import { OnboardingServiceError, type BoutiqueApplication, type BoutiqueOnboardingService } from "../../onboarding/service";

/** Browser-memory-only demo. Each provider instance is isolated; refresh clears it. */
export function createDemoOnboardingService(delayMs = 650): BoutiqueOnboardingService {
  let application: BoutiqueApplication | null = null;
  const pause = () => new Promise<void>((resolve) => setTimeout(resolve, delayMs));
  return {
    mode: "demo",
    async createApplication(input) {
      const details = boutiqueRegistrationSchema.parse(input);
      await pause();
      if (application) throw new OnboardingServiceError("An application has already been submitted in this demo session. View its status instead.");
      const created = { id: `demo-${crypto.randomUUID()}`, details, status: "PENDING" as const, submittedAt: new Date().toISOString() };
      application = created;
      return structuredClone(created);
    },
    async getCurrentApplication() {
      await pause();
      return application ? structuredClone(application) : null;
    },
  };
}
