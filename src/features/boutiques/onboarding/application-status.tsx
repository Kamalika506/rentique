"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { CircleCheck, Clock3, LoaderCircle, ShieldCheck, CircleX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOnboardingService } from "./provider";
import { canPresentManagement, type ApplicationStatus, type BoutiqueApplication } from "./service";
import styles from "./onboarding.module.css";

const messages = {
  PENDING: { title: "A beautiful beginning.", badge: "Awaiting review", copy: "Your boutique application is pending. Management functions remain unavailable while your application is reviewed.", Icon: Clock3 },
  APPROVED: { title: "Welcome to the collective.", badge: "Application approved", copy: "Your boutique has been approved. Your next chapter begins with preparing your collection for Rentique.", Icon: CircleCheck },
  REJECTED: { title: "Your application needs attention.", badge: "Application not approved", copy: "Your boutique application was not approved. Review the feedback below before contacting the review team about next steps.", Icon: CircleX },
};

function StatusCard({ application, demo, preview = false }: { application: BoutiqueApplication; demo: boolean; preview?: boolean }) {
  const message = messages[application.status];
  const showManagement = canPresentManagement(application, demo ? "demo" : "live") && !preview;
  return <section className={styles.card} aria-label={preview ? `${application.status.toLowerCase()} example` : "Application status"}>
    <div className={styles.badge}><span className="size-1.5 rounded-full bg-[#a88750]" />{message.badge}{preview ? " · Preview" : demo ? " · Demo" : ""}</div>
    <message.Icon className={styles.statusIcon} size={36} strokeWidth={1.3} />
    <h2 className={styles.statusTitle}>{message.title}</h2>
    <p className={styles.copy}>{message.copy}</p>
    {application.status === "PENDING" && !preview && <p role="status" className="mt-4 text-sm text-[#4c2544]">{demo ? "Demo application created successfully. No real review has been requested." : "Your application has been received."}</p>}
    <dl className={styles.summary}>
      <div><dt>Boutique</dt><dd>{application.details.name}</dd></div><div><dt>Contact email</dt><dd>{application.details.contactEmail}</dd></div>
      <div><dt>Application reference</dt><dd>{application.id}</dd></div><div><dt>Submitted</dt><dd>{new Date(application.submittedAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata" })}</dd></div>
    </dl>
    {application.status === "REJECTED" && <div className={styles.note}><strong>Review feedback</strong><p>{application.rejectionReason || "No detailed feedback was provided. Please contact the review team through the agreed support channel."}</p></div>}
    <div className="mt-5 flex items-start gap-3 text-xs leading-6 text-[#6d6269]"><ShieldCheck size={18} className="mt-1 shrink-0" /><p>{showManagement ? "Approval is confirmed. The backend must verify your ownership and permissions for every management operation." : "Management access is unavailable. Approval and ownership must be verified by Rentique’s backend for every management operation."}</p></div>
    {showManagement && <Link className={`${styles.textLink} mt-5 inline-block`} href="/boutique/dashboard">Open boutique dashboard</Link>}
  </section>;
}

const exampleDetails = { name: "The Silk Atelier", description: "Thoughtfully curated occasion wear and contemporary heirlooms.", contactEmail: "atelier@example.com", phone: "+91 98765 43210", address: "12 Atelier Lane", city: "Jaipur", state: "Rajasthan", postalCode: "302001", categories: ["Ethnic wear" as const], socialLink: "" };

export function ApplicationStatusScreen() {
  const service = useOnboardingService();
  const [application, setApplication] = useState<BoutiqueApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [example, setExample] = useState<ApplicationStatus>("APPROVED");
  const [request, setRequest] = useState(0);
  const refresh = useCallback(() => { setLoading(true); setError(""); setRequest((value) => value + 1); }, []);
  useEffect(() => {
    let active = true;
    service.getCurrentApplication().then((result) => { if (active) { setApplication(result); setLoading(false); } }).catch(() => { if (active) { setError("We couldn't load your application. Please try again."); setLoading(false); } });
    return () => { active = false; };
  }, [service, request]);

  return <div className={styles.statusWrap}>
    <p className={styles.eyebrow}>Your place in the collective</p><h1 className={styles.title}>Application status</h1>
    {service.mode === "demo" && <div className={`${styles.note} mb-6`}><strong>Non-persistent demo</strong><br />Applications exist only during this page session. Refreshing or reopening the site clears them. Demo approval previews never enable management.</div>}
    {loading ? <div className={styles.card} role="status"><LoaderCircle className="mb-4 animate-spin text-[#4c2544]" /><p className={styles.copy}>Checking your application…</p></div>
      : error ? <div className={styles.card}><p role="alert" className={styles.error}>{error}</p><Button onClick={refresh} className="mt-5">Try again</Button></div>
      : application ? <><StatusCard application={application} demo={service.mode === "demo"} /><div className={styles.actions}><Button variant="outline" onClick={refresh}>Check for updates</Button><Link href="/boutique/register" className={`${styles.textLink} text-sm`}>Back to registration</Link></div></>
      : <div className={styles.card}><h2 className={styles.cardTitle}>Let’s start with your story.</h2><p className={styles.copy}>{service.mode === "demo" ? "No application is available in this demo session. If you refreshed the page, your previous demo details were cleared." : "You have not submitted a boutique application yet."}</p><Link href="/boutique/register" className={`${styles.textLink} mt-6 inline-block text-sm`}>Register your boutique →</Link></div>}
    {service.mode === "demo" && <details className={styles.preview}><summary>Explore approval & rejection UI · Demo examples</summary><p className={`${styles.copy} mt-4`}>These sample outcomes do not change your application or grant access.</p><div className={styles.actions}>{(["PENDING", "APPROVED", "REJECTED"] as const).map((status) => <Button key={status} size="sm" variant={example === status ? "default" : "outline"} aria-pressed={example === status} onClick={() => setExample(status)}>{status.toLowerCase()}</Button>)}</div><div className="mt-5"><StatusCard preview demo application={{ id: "demo-example", details: exampleDetails, status: example, submittedAt: "2026-10-11T00:00:00.000Z", rejectionReason: example === "REJECTED" ? "Example feedback: please provide a fuller collection description and verify the boutique address." : undefined }} /></div></details>}
  </div>;
}
