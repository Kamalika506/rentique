import { endpoint } from "@/lib/api";
import { requestRecovery } from "@/features/auth/recovery";
export const POST = endpoint(request => requestRecovery(request, "EMAIL_VERIFICATION"));
