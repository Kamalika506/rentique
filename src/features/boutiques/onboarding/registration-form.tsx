"use client";

import Link from "next/link";
import { useEffect } from "react";
import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@base-ui/react/input";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { boutiqueCategories, boutiqueRegistrationSchema, type BoutiqueRegistration } from "./schema";
import { OnboardingServiceError } from "./service";
import { useOnboardingService } from "./provider";
import styles from "./onboarding.module.css";

const fields = [
  { name: "name", label: "Boutique name", placeholder: "e.g. The Silk Atelier", wide: true, autoComplete: "organization" },
  { name: "contactEmail", label: "Contact email", type: "email", placeholder: "hello@yourboutique.com", autoComplete: "email" },
  { name: "phone", label: "Phone number", type: "tel", placeholder: "+91 98765 43210", autoComplete: "tel" },
  { name: "address", label: "Street address", placeholder: "Building, street and area", wide: true, autoComplete: "street-address" },
  { name: "city", label: "City", placeholder: "Your city", autoComplete: "address-level2" },
  { name: "state", label: "State / region", placeholder: "Your state", autoComplete: "address-level1" },
  { name: "postalCode", label: "Postal code", placeholder: "Postal code", autoComplete: "postal-code" },
  { name: "socialLink", label: "Website or social link", type: "url", placeholder: "https://instagram.com/yourboutique", autoComplete: "url", wide: true },
] as const;

const draftKey = "rentique:boutique-registration-draft";

export function RegistrationForm() {
  const service = useOnboardingService();
  const router = useRouter();
  const { status } = useSession();
  const needsAccount = service.mode === "live" && status === "unauthenticated";
  const { register, reset, handleSubmit, setError, clearErrors, formState: { errors, isSubmitting, isSubmitSuccessful } } = useForm<BoutiqueRegistration>({
    resolver: zodResolver(boutiqueRegistrationSchema), mode: "onTouched", defaultValues: { name: "", description: "", contactEmail: "", phone: "", address: "", city: "", state: "", postalCode: "", categories: [], socialLink: "" },
  });
  const locked = isSubmitting || (isSubmitSuccessful && !errors.root) || (service.mode === "live" && status === "loading");

  useEffect(() => {
    if (service.mode !== "live") return;
    try {
      const saved = sessionStorage.getItem(draftKey);
      if (!saved) return;
      const draft = boutiqueRegistrationSchema.safeParse(JSON.parse(saved));
      if (draft.success) reset(draft.data);
    } catch { /* The form remains usable when browser storage is unavailable. */ }
  }, [reset, service.mode]);

  function continueWithAccount(values: BoutiqueRegistration, destination: string) {
    try {
      sessionStorage.setItem(draftKey, JSON.stringify(values));
      router.push(destination);
    } catch {
      setError("root", { message: "Allow browser session storage to keep your boutique details while you sign in." });
    }
  }

  async function submit(values: BoutiqueRegistration) {
    clearErrors("root");
    if (needsAccount) {
      continueWithAccount(values, "/register?intent=boutique");
      return;
    }
    try {
      await service.createApplication(values);
      if (service.mode === "live") {
        try { sessionStorage.removeItem(draftKey); } catch { /* Submission has already succeeded. */ }
        await signOut({ redirect: false });
        window.dispatchEvent(new Event("rentique:session-change"));
        router.push("/login?intent=boutique&registered=boutique");
        router.refresh();
      } else {
        router.push("/boutique/pending");
      }
    } catch (error) {
      if (error instanceof OnboardingServiceError && error.fieldErrors) {
        for (const [field, message] of Object.entries(error.fieldErrors)) if (message) setError(field as keyof BoutiqueRegistration, { message }, { shouldFocus: true });
      }
      setError("root", { message: error instanceof OnboardingServiceError ? error.message : "We couldn't submit your application. Please try again." });
    }
  }

  function field(name: (typeof fields)[number]["name"]) {
    const config = fields.find((item) => item.name === name)!;
    return <div key={name} className={"wide" in config && config.wide ? styles.wide : undefined}>
      <label className={styles.label} htmlFor={name}>{config.label}{name === "socialLink" ? <span className={styles.optional}> · Optional</span> : " *"}</label>
      <Input {...register(name)} id={name} type={"type" in config ? config.type : "text"} autoComplete={config.autoComplete} placeholder={config.placeholder} className={styles.input} aria-invalid={Boolean(errors[name])} aria-describedby={errors[name] ? `${name}-error` : undefined} maxLength={name === "address" || name === "socialLink" ? 300 : name === "postalCode" ? 12 : 120} />
      {errors[name] && <p className={styles.error} id={`${name}-error`}>{errors[name]?.message}</p>}
    </div>;
  }

  return <div className={styles.grid}>
    <aside>
      <p className={styles.eyebrow}>For the beautifully individual</p>
      <h1 className={styles.title}>Your boutique.<br />A new chapter.</h1>
      <p className={styles.copy}>Bring your curated collection to a community that appreciates it. Let’s begin with the story behind your boutique.</p>
      <ol className={styles.steps}>
        <li><span className={styles.stepNumber}>01</span><div><strong>Introduce your boutique</strong><p>Tell us who you are and what makes your collection special.</p></div></li>
        <li><span className={styles.stepNumber}>02</span><div><strong>A considered review</strong><p>Your application will be reviewed before you join the collective.</p></div></li>
        <li><span className={styles.stepNumber}>03</span><div><strong>Make your debut</strong><p>Once approved, you can start managing your boutique.</p></div></li>
      </ol>
      {service.mode === "demo" && <div className={styles.note}><strong>Demo experience</strong><br />No application is sent for review. Details stay in this page session only and disappear on refresh. Use sample contact details.</div>}
    </aside>
    <div className={styles.card}>
      <h2 className={styles.cardTitle}>Join the collective</h2>
      <p className={styles.copy}>A little about your boutique. Fields marked * are required.</p>
      {needsAccount && <p className={`${styles.note} mt-5`}>Start with your boutique details below. Before submitting, create an owner account or sign in. Your details will be saved in this tab while you continue.</p>}
      <form noValidate onSubmit={handleSubmit(submit)} aria-busy={isSubmitting}>
        <fieldset disabled={locked}>
          <legend className={styles.section}>01 / Boutique & contact</legend>
          <div className={styles.fields}>
            {field("name")}
            <div className={styles.wide}><label className={styles.label} htmlFor="description">Your boutique’s story *</label>
              <textarea {...register("description")} id="description" className={`${styles.input} ${styles.textarea}`} placeholder="Share your style, your collections and what sets you apart…" maxLength={1000} aria-invalid={Boolean(errors.description)} aria-describedby="description-hint description-error" />
              <p id="description-hint" className="mt-1 text-xs text-[#776a73]">20–1,000 characters.</p>
              <p id="description-error" className={styles.error}>{errors.description?.message}</p>
            </div>
            {field("contactEmail")}{field("phone")}
          </div>
        </fieldset>
        <fieldset disabled={locked}><legend className={styles.section}>02 / Find your boutique</legend><div className={styles.fields}>{field("address")}{field("city")}{field("state")}{field("postalCode")}</div></fieldset>
        <fieldset disabled={locked} aria-describedby="categories-hint categories-error" aria-invalid={Boolean(errors.categories)}>
          <legend className={styles.section}>03 / Your collection</legend>
          <p id="categories-hint" className={styles.label}>Categories * <span className={styles.optional}>· Select all that apply</span></p>
          <div className={styles.categories}>{boutiqueCategories.map((category) => <label key={category} className={styles.category}><input type="checkbox" value={category} {...register("categories")} aria-invalid={Boolean(errors.categories)} aria-describedby="categories-hint categories-error" />{category}</label>)}</div>
          <p className={styles.error} id="categories-error">{errors.categories?.message}</p>
          <div className="mt-5">{field("socialLink")}</div>
        </fieldset>
        {errors.root && <p role="alert" className={`${styles.error} mt-5`}>{errors.root.message} <Link className={styles.textLink} href="/boutique/pending">View application status</Link></p>}
        {isSubmitSuccessful && !errors.root && <p role="status" className="mt-5 text-sm text-[#4c2544]">{needsAccount ? "Details saved. Opening account setup..." : "Application submitted. Opening sign in..."}</p>}
        <Button type="submit" disabled={locked} className={styles.submit}>{isSubmitting ? <><LoaderCircle className="animate-spin" />Continuing…</> : <>{needsAccount ? "Continue to create owner account" : "Submit boutique application"}<ArrowRight /></>}</Button>
        {needsAccount && <button type="button" disabled={locked} className={`${styles.textLink} mt-4 w-full text-sm underline`} onClick={handleSubmit((values) => continueWithAccount(values, "/login?intent=boutique"))}>Already have an account? Boutique sign in</button>}
        <p className={styles.finePrint}>Submitting an application does not grant management access.<br />Boutiques must be approved before management becomes available.</p>
      </form>
    </div>
  </div>;
}
