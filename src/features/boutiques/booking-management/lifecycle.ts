import { z } from "zod";
import type { LifecycleAction, ManualRefundStatus } from "./service";
export const lifecycleActionLabels: Record<LifecycleAction, string> = { CONFIRM: "Confirm booking", REJECT: "Reject request", PICK_UP: "Mark as picked up", RETURN: "Mark as returned", COMPLETE: "Complete rental", CANCEL: "Cancel booking", RECORD_INSPECTION: "Record inspection", RECORD_REFUND: "Record manual refund status" };
export const manualRefundLabels: Record<ManualRefundStatus, string> = { PENDING: "Refund pending (manual record)", PARTIALLY_REFUNDED: "Partial refund reported", REFUNDED: "Full refund reported", WITHHELD: "Deposit withheld (manual record)", NOT_REQUIRED: "Refund not required (manual record)" };
const reason = z.string().trim().min(3, "Provide a reason of at least 3 characters.").max(500);
export const lifecycleCommandSchema = z.discriminatedUnion("action", [
  z.object({ action: z.enum(["CONFIRM", "PICK_UP", "RETURN", "COMPLETE"]) }),
  z.object({ action: z.enum(["REJECT", "CANCEL"]), reason }),
  z.object({ action: z.literal("RECORD_INSPECTION"), condition: z.enum(["GOOD", "MINOR_DAMAGE", "MAJOR_DAMAGE"]), notes: z.string().trim().max(2000) }).refine((value) => value.condition === "GOOD" || value.notes.length >= 3, "Describe the damage in inspection notes."),
  z.object({ action: z.literal("RECORD_REFUND"), status: z.enum(["PENDING", "PARTIALLY_REFUNDED", "REFUNDED", "WITHHELD", "NOT_REQUIRED"]), notes: z.string().trim().min(3, "Describe the manually recorded refund status.").max(1000) }),
]);
