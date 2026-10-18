import { timingSafeEqual } from "node:crypto";
import { endpoint, ApiError } from "@/lib/api";
import { runNotificationJobs } from "@/features/notifications/server";
export const POST = endpoint(async request => {
  const secret = process.env.JOBS_SECRET;
  if (!secret || secret.length < 32) throw new ApiError(503, "Scheduled jobs are not configured.");
  const supplied = request.headers.get("authorization") ?? "";
  const expected = "Bearer " + secret;
  if (Buffer.byteLength(supplied) !== Buffer.byteLength(expected) || !timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))) throw new ApiError(401, "Invalid job credentials.");
  return runNotificationJobs();
});
