import { endpoint } from "@/lib/api";
import { getApplication, createApplication } from "@/features/rentals/workspace-server";

export const GET = endpoint(getApplication);
export const POST = endpoint(createApplication, 201);
