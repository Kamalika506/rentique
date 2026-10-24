"use client";
import { api } from "@/lib/api-client";
import { validateImageFiles } from "../inventory/image-upload";
import { useId, useRef, useState } from "react";
import { LoaderCircle, Upload } from "lucide-react";
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

  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const photoInput = useRef<HTMLInputElement>(null);
  const photoInputId = useId();
  const photoHintId = useId();
  const [returnQuantities, setReturnQuantities] = useState<Record<string, number>>({});
  const [returnUnitIds, setReturnUnitIds] = useState<Record<string, string[]>>({});
  const [error, setError] = useState(""); const [feedback, setFeedback] = useState("");
  function open(selected: LifecycleAction) { setReturnQuantities(Object.fromEntries(booking.products.filter(item => item.itemId).map(item => [item.itemId!, item.quantity - (item.returnedQuantity ?? 0)]))); setReturnUnitIds(Object.fromEntries(booking.products.filter(item => item.itemId).map(item => [item.itemId!, (item.units ?? []).filter(unit => !unit.returnedAt && !unit.releasedAt).map(unit => unit.id)]))); setPhotos(booking.inspection?.photos ?? []); setAction(selected); setError(""); setFeedback(""); setReason(""); setCondition(booking.inspection?.condition ?? "GOOD"); setInspectionNotes(booking.inspection?.notes ?? ""); }
  async function uploadPhotos(files: File[]) {
    if (!files.length) return;
    setError("");
    try {
      validateImageFiles(files);
      if (photos.length + files.length > 6) throw new Error("Use up to six inspection photos in total.");
      if (service.mode === "demo") throw new Error("Photo uploads require the live booking workspace.");
      setUploading(true); onBusyChange(true);
      const body = new FormData(); files.forEach(file => body.append("files", file));
      const images = await api<{ secureUrl: string }[]>("/api/boutique/images", { method: "POST", body });
      setPhotos(current => [...current, ...images.map(image => image.secureUrl)]);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Photo upload failed. Please retry."); }
    finally { setUploading(false); onBusyChange(false); }
  }
  async function submit() {
    if (!action || saving || uploading) return;
    const raw = action === "REJECT" || action === "CANCEL" ? { action, reason } : action === "RETURN" && booking.products.every(item => item.itemId) ? { action, items: booking.products.flatMap(item => { const ids = returnUnitIds[item.itemId!] ?? []; return (item.units?.length ? ids.length ? [{ itemId: item.itemId!, unitIds: ids }] : [] : (returnQuantities[item.itemId!] ?? 0) > 0 ? [{ itemId: item.itemId!, quantity: returnQuantities[item.itemId!] }] : []) as Array<{ itemId: string; unitIds?: string[]; quantity?: number }>; }) } : action === "RECORD_INSPECTION" ? { action, condition, photos, notes: inspectionNotes } : { action };
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
      <div className={`${form.actions} mt-6`}>{booking.allowedActions.filter(allowed => allowed !== "RECORD_REFUND").map((allowed) => <Button key={allowed} disabled={saving || uploading} variant={allowed === "REJECT" || allowed === "CANCEL" ? "outline" : "default"} onClick={() => open(allowed)}>{lifecycleActionLabels[allowed]}</Button>)}</div>
      {!booking.allowedActions.length && <p className={`${styles.muted} mt-4`}>No lifecycle actions are available for this record.</p>}
      <p className={`${styles.muted} mt-4`}>The server checks ownership, the current booking state, and available stock before saving each action.</p>
    </div></section>
    <div className={styles.split}>
      <section className={styles.panel}><div className={styles.panelHead}><h2 className={styles.panelTitle}>Return inspection</h2></div><div className="p-6">{booking.inspection ? <><p className="text-sm font-medium">{booking.inspection.condition.replaceAll("_", " ")}</p><p className="mt-3 whitespace-pre-wrap text-sm">{booking.inspection.notes || "No inspection notes."}</p><div className="mt-4 flex flex-wrap gap-3">{booking.inspection.photos?.map((photo, index) => <a key={photo} href={photo} target="_blank" rel="noopener noreferrer" aria-label={`Open inspection photo ${index + 1}`}>
{/* eslint-disable-next-line @next/next/no-img-element */}
<img src={photo} alt={`Return inspection photo ${index + 1}`} width={120} height={120} className="h-28 w-28 rounded object-cover" /></a>)}</div><p className={`${styles.muted} mt-3`}>Recorded: {bookingDate(booking.inspection.recordedAt, service.timezone)}</p></> : <p className={styles.muted}>No inspection recorded. Record the return and its condition before completing the rental.</p>}</div></section>
    </div>
    <p role="status" className="mb-5 text-sm text-[#4c2544]">{feedback}</p>
    <Dialog.Root open={Boolean(action)} onOpenChange={(value) => { if (!value && !saving && !uploading) setAction(null); }}><Dialog.Portal><Dialog.Backdrop className={form.backdrop} /><Dialog.Popup className={form.dialog}>
      <Dialog.Title className="text-xl text-[#4c2544]">{action ? lifecycleActionLabels[action] : "Rental action"}?</Dialog.Title>
      <Dialog.Description className="my-4 text-sm leading-7">{service.mode === "demo" ? "This updates a fictional booking in browser memory only. Refresh clears it; nothing is saved to PostgreSQL." : "The booking backend must verify ownership, current status and this action before saving."}</Dialog.Description>
      <form onSubmit={(event) => { event.preventDefault(); void submit(); }}>
        {action === "RETURN" && booking.products.every(item => item.itemId) && <div className="space-y-4">{booking.products.filter(item => item.quantity > (item.returnedQuantity ?? 0)).map(item => <fieldset key={item.itemId} className="space-y-2 text-sm"><legend>{item.name} · {item.size} · {item.quantity - (item.returnedQuantity ?? 0)} outstanding</legend>{item.units?.length ? item.units.filter(unit => !unit.returnedAt && !unit.releasedAt).map(unit => <label key={unit.id} className="flex items-center gap-2"><input type="checkbox" checked={(returnUnitIds[item.itemId!] ?? []).includes(unit.id)} disabled={saving || uploading} onChange={event => setReturnUnitIds({ ...returnUnitIds, [item.itemId!]: event.target.checked ? [...(returnUnitIds[item.itemId!] ?? []), unit.id] : (returnUnitIds[item.itemId!] ?? []).filter(id => id !== unit.id) })} />{unit.code}</label>) : <input aria-label="Quantity returned" type="number" min={0} max={item.quantity - (item.returnedQuantity ?? 0)} value={returnQuantities[item.itemId!] ?? 0} disabled={saving || uploading} onChange={event => setReturnQuantities({ ...returnQuantities, [item.itemId!]: Number(event.target.value) })} className={form.input} />}</fieldset>)}<p className="text-sm">Select the exact pieces physically received. Remaining items stay collected.</p></div>}
        {(action === "REJECT" || action === "CANCEL") && <label className={form.label}>Reason<textarea className={form.input} maxLength={500} value={reason} disabled={saving || uploading} onChange={(event) => setReason(event.target.value)} aria-describedby="lifecycle-error" required /></label>}
        {action === "RECORD_INSPECTION" && <div className="grid gap-4"><label className={form.label}>Inspection condition<select className={form.input} value={condition} disabled={saving || uploading} onChange={(event) => setCondition(event.target.value as InspectionCondition)}>{["GOOD", "MINOR_DAMAGE", "MAJOR_DAMAGE"].map((value) => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}</select></label><label className={form.label}>Inspection notes<textarea className={form.input} value={inspectionNotes} disabled={saving || uploading} maxLength={2000} onChange={(event) => setInspectionNotes(event.target.value)} aria-describedby="lifecycle-error" /></label><div className="rounded-lg border border-dashed border-[#d8d0c4] bg-[#faf8f4] p-4"><input ref={photoInput} id={photoInputId} type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={saving || uploading || photos.length >= 6} className="hidden" onChange={event => { const files = Array.from(event.target.files ?? []); event.target.value = ""; void uploadPhotos(files); }} /><div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-sm font-medium text-[#4c2544]">Inspection photos (optional)</p><p id={photoHintId} className={`${styles.muted} mt-1`}>JPG, PNG or WebP · up to 5 MB each. Photograph garments only; image links are public.</p></div><Button type="button" variant="outline" size="lg" disabled={saving || uploading || photos.length >= 6} onClick={() => photoInput.current?.click()} aria-describedby={photoHintId}>{uploading ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : <Upload aria-hidden="true" />} {uploading ? "Uploading…" : "Choose photos"}</Button></div><p className={`${styles.muted} mt-3`} aria-live="polite">{photos.length} of 6 photos added</p></div>{uploading && <p role="status" aria-live="polite">Uploading photos…</p>}<ul className="grid gap-2">{photos.map((photo, index) => <li key={photo} className="flex items-center justify-between gap-3 rounded-md border border-[#e4dfd7] bg-[#fffdf9] px-3 py-2 text-sm"><a href={photo} target="_blank" rel="noopener noreferrer" className="text-[#4c2544] underline underline-offset-2">Photo {index + 1}</a><Button type="button" variant="ghost" size="sm" disabled={saving || uploading} onClick={() => setPhotos(current => current.filter((_, position) => position !== index))} aria-label={`Remove inspection photo ${index + 1}`}>Remove</Button></li>)}</ul><p className={styles.muted}>Describe any damage. An inspected return still requires cleaning before the stock can be released.</p></div>}
        <p role="alert" id="lifecycle-error" className={`${form.error} mt-4`}>{error}</p><div className={`${form.actions} mt-5`}><Button type="submit" disabled={saving || uploading}>{saving ? "Recording…" : "Confirm action"}</Button><Button type="button" variant="outline" disabled={saving || uploading} onClick={() => setAction(null)}>Close without changes</Button></div>
      </form>
    </Dialog.Popup></Dialog.Portal></Dialog.Root>
  </>;
}
