import { endpoint } from "@/lib/api";
import { consumeRecovery } from "@/features/auth/recovery";
export const POST = endpoint(request => consumeRecovery(request, "EMAIL_VERIFICATION"));
