"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { api, jsonRequest } from "@/lib/api-client";
import { BoutiqueSidebar } from "../dashboard/boutique-sidebar";
import { BoutiqueTopNavigation } from "../dashboard/top-navigation";
import { boutiqueSettingsSchema, type BoutiqueSettings, type BoutiqueSettingsInput } from "./schema";
import styles from "../dashboard/dashboard.module.css";

const fields = [
  { key: "name", label: "Boutique name", max: 120 }, { key: "contactEmail", label: "Business contact email", max: 254, type: "email" },
  { key: "phone", label: "Contact phone", max: 32, type: "tel" }, { key: "address", label: "Pickup address", max: 300 },
  { key: "city", label: "City", max: 120 }, { key: "state", label: "State", max: 120 },
  { key: "postalCode", label: "Postal code", max: 12 }, { key: "socialLink", label: "Website or social link", max: 300, type: "url" },
  { key: "timezone", label: "Timezone", max: 64 },
] as const;

function formDetails(profile: BoutiqueSettings): BoutiqueSettingsInput {
  return { name: profile.name, description: profile.description, contactEmail: profile.contactEmail, phone: profile.phone, address: profile.address,
    city: profile.city, state: profile.state, postalCode: profile.postalCode, socialLink: profile.socialLink ?? "", timezone: profile.timezone, version: profile.version, collectionInstructions: profile.collectionInstructions ?? "", cancellationPolicy: profile.cancellationPolicy ?? "", returnPolicy: profile.returnPolicy ?? "", openingHours: profile.openingHours ?? "", rentalPolicy: profile.rentalPolicy ?? "" };
}

export function BoutiqueSettingsForm() {
  const [profile, setProfile] = useState<BoutiqueSettings | null>(null), [form, setForm] = useState<BoutiqueSettingsInput | null>(null);
  const [loading, setLoading] = useState(true), [saving, setSaving] = useState(false), [error, setError] = useState(""), [message, setMessage] = useState(""), [reload, setReload] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    api<BoutiqueSettings>("/api/boutique/settings", { signal: controller.signal }).then((data) => { setProfile(data); setForm(formDetails(data)); }).catch((cause) => { if (!controller.signal.aborted) setError(cause.message); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [reload]);
  async function save(event: React.FormEvent) {
    event.preventDefault(); setError(""); setMessage("");
    const parsed = boutiqueSettingsSchema.safeParse(form);
    if (!parsed.success) { setError(parsed.error.issues[0].message); return; }
    setSaving(true);
    try { const updated = await api<BoutiqueSettings>("/api/boutique/settings", jsonRequest("PATCH", parsed.data)); setProfile(updated); setForm(formDetails(updated)); setMessage("Boutique profile saved."); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to save your profile."); }
    finally { setSaving(false); }
  }
  function reloadProfile() { setLoading(true); setError(""); setMessage(""); setReload(reload + 1); }
  return <div className={styles.shell}>
    <a href="#settings-content" className={styles.skip}>Skip to content</a><BoutiqueSidebar activeView="settings" />
    <div className={styles.workspace}><BoutiqueTopNavigation activeView="settings" boutiqueName={profile?.name ?? "Boutique settings"} />
      <main className={styles.main} id="settings-content" tabIndex={-1}>
        <div className={styles.pageHeading}><div><h1 className={styles.heading}>Boutique profile</h1><p className={styles.muted}>Keep your storefront and pickup contact details up to date.</p></div><Link href="/boutique/pending" className={styles.link}>Application status</Link></div>
        {error && <p role="alert" className="mb-5 text-sm text-red-700">{error}</p>}{message && <p role="status" className="mb-5 text-sm text-green-800">{message}</p>}
        {loading ? <p role="status">Loading profile…</p> : form && profile ? <>
          <p className={styles.notice}>{profile.status === "APPROVED" ? "Your profile is visible on your public storefront." : "Your boutique becomes public after admin approval. You can update your contact details while the application is being reviewed."}</p>
          <form onSubmit={save} className={`${styles.panel} p-6`}>
            <div className="grid gap-5 sm:grid-cols-2">{fields.map((field) => <label className={styles.field} key={field.key}>{field.label}<input className={styles.input} type={"type" in field ? field.type : "text"} required={field.key !== "socialLink"} maxLength={field.max} value={form[field.key]} disabled={saving} onChange={(event) => { setForm({ ...form, [field.key]: event.target.value }); setMessage(""); }} placeholder={field.key === "timezone" ? "Asia/Kolkata" : field.key === "socialLink" ? "https://" : undefined} /></label>)}</div>
            <label className={`${styles.field} mt-5`}>About your boutique<textarea rows={5} className={styles.input} required minLength={20} maxLength={1000} value={form.description} disabled={saving} onChange={(event) => { setForm({ ...form, description: event.target.value }); setMessage(""); }} /></label>
            <label className="mt-5 block text-sm">Shop pickup and return hours<textarea rows={3} maxLength={1000} className={styles.input} value={form.openingHours ?? ""} disabled={saving} onChange={event => setForm({ ...form, openingHours: event.target.value })} placeholder="For example: Monday–Saturday, 10 am–7 pm; Sunday closed" /></label>
            <label className="mt-5 block text-sm">Customer-visible rental policies<textarea rows={5} maxLength={3000} className={styles.input} value={form.rentalPolicy ?? ""} disabled={saving} onChange={event => setForm({ ...form, rentalPolicy: event.target.value })} placeholder="Fit checks, included pieces, collection and return instructions. No online payments." /></label>
            {([ ["collectionInstructions", "Collection instructions", "What to bring, counter location, fitting and collection steps."], ["cancellationPolicy", "Cancellation policy", "Cancellation deadlines and how customers should contact the shop."], ["returnPolicy", "Return policy", "Return location, deadlines, garment condition and late-return rules."] ] as const).map(([key, label, placeholder]) => <label key={key} className="mt-5 block text-sm">{label}<textarea rows={4} maxLength={2000} className={styles.input} value={form[key] ?? ""} disabled={saving} placeholder={placeholder} onChange={event => setForm({ ...form, [key]: event.target.value })} /></label>)}
            <p className="mt-4 text-sm">Hours, contact details and policies are visible to customers before booking. Shop policies must follow the platform reservation rules.</p>
            <div className="mt-6 flex flex-wrap items-center gap-4"><Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save profile"}</Button><Button type="button" variant="outline" disabled={saving} onClick={reloadProfile}>Reload latest profile</Button>{profile.status === "APPROVED" && <Link href={`/boutiques/${encodeURIComponent(profile.id)}`} className={styles.link}>View storefront →</Link>}</div>
          </form>
        </> : <Button onClick={reloadProfile}>Try again</Button>}
      </main>
    </div>
  </div>;
}
