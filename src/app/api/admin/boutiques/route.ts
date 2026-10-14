import { endpoint } from "@/lib/api";
import { reviewApplications } from "@/features/rentals/workspace-server";

export const GET = endpoint(reviewApplications);
export const PATCH = endpoint(reviewApplications);
