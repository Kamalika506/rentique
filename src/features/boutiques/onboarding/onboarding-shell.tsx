import Link from "next/link";
import styles from "./onboarding.module.css";

export function OnboardingShell({ children }: { children: React.ReactNode }) {
  return <div className={styles.shell}>
    <header className={styles.header}>
      <Link href="/boutique/register" className={styles.brand}>rentique<span className="text-[#a88750]">.</span></Link>
      <nav className={styles.nav} aria-label="Boutique onboarding"><Link href="/boutique/register">Become a partner</Link><Link href="/boutique/pending">Application status</Link></nav>
    </header>
    <main className={styles.main}>{children}</main>
    <footer className={styles.footer}><span>RENTIQUE · THE BOUTIQUE COLLECTIVE</span><span>Considered collections. Exceptional occasions.</span></footer>
  </div>;
}
