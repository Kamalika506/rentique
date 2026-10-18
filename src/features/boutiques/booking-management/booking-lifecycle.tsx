"use client";
import { useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { Button } from "@/components/ui/button";
import { useBookingService } from "./provider";
import { bookingDate, bookingError, bookingStatusLabels, type BoutiqueBooking, type InspectionCondition, type LifecycleAction, type LifecycleCommand } from "./service";
import { lifecycleActionLabels, lifecycleCommandSchema } from "./lifecycle";
import styles from "../dashboard/dashboard.module.css";
import form from "../inventory/inventory.module.css";

const workflow = ["PENDING", "CONFIRMED", "PICKED_UP", "RETURNED", "COMPLETED"] as const;
export function BookingLifecycle({ booking, onUpdated, onBusyChange }: { booking: BoutiqueBooking; onUpdated: (booking: BoutiqueBooking) => void; onBusyChange: (busy: boolean) => void }) {
  const service = useBookingService();
  const [action, setAction] = useState<LifecycleAction | null>(null); const [saving, setSaving] = useState(false);
  const [reason, setReason] = useState(""); const [condition, setCondition] = useState<InspectionCondition>("GOOD"); const [inspectionNotes, setInspectionNotes] = useState("");

  const [returnQuantities, setReturnQuantities] = useState<Record<string, number>>({});
  const [error, setError] = useState(""); const [feedback, setFeedback] = useState("");
  function open(selected: LifecycleAction) { setReturnQuantities(Object.fromEntries(booking.products.filter(item => item.itemId).map(item => [item.itemId!, item.quantity - (item.returnedQuantity ?? 0)]))); setAction(selected); setError(""); setFeedback(""); setReason(""); setCondition(booking.inspection?.condition ?? "GOOD"); setInspectionNotes(booking.inspection?.notes ?? ""); }
  async function submit() {
    if (!action || saving) return;
    const raw = action === "REJECT" || action === "CANCEL" ? { action, reason } : action === "RETURN" && booking.products.every(item => item.itemId) ? { action, items: Object.entries(returnQuantities).filter(([, quantity]) => quantity > 0).map(([itemId, quantity]) => ({ itemId, quantity })) } : action === "RECORD_INSPECTION" ? { action, condition, notes: inspectionNotes } : { action };
    const parsed = lifecycleCommandSchema.safeParse(raw);
    if (!parsed.success) { setError(parsed.error.issues[0].message); return; }
    setSaving(true); onBusyChange(true); setError("");
    try {
      const updated = await service.applyLifecycleAction(booking.id, parsed.data as LifecycleCommand, booking.version);
      if (updated.id !== booking.id || updated.boutiqueId !== service.boutique.id) throw new Error("Unexpected booking response");
      onUpdated(updated); setAction(null); setFeedback(`${lifecycleActionLabels[action]} recorded${service.mode === "demo" ? " in demo memory only; nothing was persisted to PostgreSQL" : " by the booking service"}.`);
    } catch (cause) { setError(bookingError(cause)); }
    finally { setSaving(false); onBusyChange(false); }
  }
  return <>
    <section className={styles.panel}><div className={styles.panelHead}><h2 className={styles.panelTitle}>Rental lifecycle</h2></div><div className="p-6">
      <ol className="flex flex-wrap gap-3 text-xs" aria-label="Supported rental workflow">{workflow.map((status, index) => <li key={status} className={styles.pill} aria-current={booking.status === status ? "step" : undefined} data-status={booking.status === status ? status : undefined}>{index + 1}. {bookingStatusLabels[status]}{booking.status === status ? " · Current" : ""}</li>)}</ol>
      {["REJECTED", "CANCELLED"].includes(booking.status) && <p className="mt-4 text-sm">Outcome: {bookingStatusLabels[booking.status]}</p>}
      <dl className={`${form.details} mt-5`}>{[["Actual pickup", booking.pickedUpAt], ["Actual return", booking.returnedAt], ["Completed", booking.completedAt]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value ? bookingDate(value, service.timezone) : "Not recorded"}</dd></div>)}</dl>
      <div className={`${form.actions} mt-6`}>{booking.allowedActions.filter(allowed => allowed !== "RECORD_REFUND").map((allowed) => <Button key={allowed} disabled={saving} variant={allowed === "REJECT" || allowed === "CANCEL" ? "outline" : "default"} onClick={() => open(allowed)}>{lifecycleActionLabels[allowed]}</Button>)}</div>
      {!booking.allowedActions.length && <p className={`${styles.muted} mt-4`}>No lifecycle actions are available for this record.</p>}
      <p className={`${styles.muted} mt-4`}>The server checks ownership, the current booking state, and available stock before saving each action.</p>
    </div></section>
    <div className={styles.split}>
      <section className={styles.panel}><div className={styles.panelHead}><h2 className={styles.panelTitle}>Return inspection</h2></div><div className="p-6">{booking.inspection ? <><p className="text-sm font-medium">{booking.inspection.condition.replaceAll("_", " ")}</p><p className="mt-3 whitespace-pre-wrap text-sm">{booking.inspection.notes || "No inspection notes."}</p><p className={`${styles.muted} mt-3`}>Recorded: {bookingDate(booking.inspection.recordedAt, service.timezone)}</p></> : <p className={styles.muted}>No inspection recorded. Record the return and its condition before completing the rental.</p>}</div></section>
    </div>
    <p role="status" className="mb-5 text-sm text-[#4c2544]">{feedback}</p>
    <Dialog.Root open={Boolean(action)} onOpenChange={(value) => { if (!value && !saving) setAction(null); }}><Dialog.Portal><Dialog.Backdrop className={form.backdrop} /><Dialog.Popup className={form.dialog}>
      <Dialog.Title className="text-xl text-[#4c2544]">{action ? lifecycleActionLabels[action] : "Rental action"}?</Dialog.Title>
      <Dialog.Description className="my-4 text-sm leading-7">{service.mode === "demo" ? "This updates a fictional booking in browser memory only. Refresh clears it; nothing is saved to PostgreSQL." : "The booking backend must verify ownership, current status and this action before saving."}</Dialog.Description>
      <form onSubmit={(event) => { event.preventDefault(); void submit(); }}>
        {action === "RETURN" && booking.products.every(item => item.itemId) && <div className="space-y-4">{booking.products.filter(item => item.quantity > (item.returnedQuantity ?? 0)).map(item => <label key={item.itemId} className="block text-sm">{item.name} · {item.size} · {item.quantity - (item.returnedQuantity ?? 0)} outstanding<input type="number" min={0} max={item.quantity - (item.returnedQuantity ?? 0)} value={returnQuantities[item.itemId!] ?? 0} disabled={saving} onChange={event => setReturnQuantities({ ...returnQuantities, [item.itemId!]: Number(event.target.value) })} className={form.input} /></label>)}<p className="text-sm">Record only pieces physically received at the shop. Remaining items stay collected.</p></div>}
        {(action === "REJECT" || action === "CANCEL") && <label className={form.label}>Reason<textarea className={form.input} maxLength={500} value={reason} disabled={saving} onChange={(event) => setReason(event.target.value)} aria-describedby="lifecycle-error" required /></label>}
        {action === "RECORD_INSPECTION" && <div className="grid gap-4"><label className={form.label}>Inspection condition<select className={form.input} value={condition} disabled={saving} onChange={(event) => setCondition(event.target.value as InspectionCondition)}>{["GOOD", "MINOR_DAMAGE", "MAJOR_DAMAGE"].map((value) => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}</select></label><label className={form.label}>Inspection notes<textarea className={form.input} value={inspectionNotes} disabled={saving} maxLength={2000} onChange={(event) => setInspectionNotes(event.target.value)} aria-describedby="lifecycle-error" /></label><p className={styles.muted}>Describe any damage. An inspected return still requires cleaning before the stock can be released.</p></div>}
        <p role="alert" id="lifecycle-error" className={`${form.error} mt-4`}>{error}</p><div className={`${form.actions} mt-5`}><Button type="submit" disabled={saving}>{saving ? "Recording…" : "Confirm action"}</Button><Button type="button" variant="outline" disabled={saving} onClick={() => setAction(null)}>Close without changes</Button></div>
      </form>
    </Dialog.Popup></Dialog.Portal></Dialog.Root>
  </>;
}
