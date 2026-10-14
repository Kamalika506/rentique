"use client";

import { Suspense, useEffect, useState } from "react";
import { getProviders, signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api-client";
import Link from "next/link";
import { ArrowRight, Eye, EyeOff, LockKeyhole } from "lucide-react";
import CustomerHeader from "@/components/layout/customer-header";
import CustomerFooter from "@/components/layout/customer-footer";

export default function LoginPage() {
  return <Suspense fallback={<main className="p-8" role="status">Loading sign in...</main>}><LoginForm /></Suspense>;
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const boutiqueIntent = params.get("intent") === "boutique";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState(params.get("registered") === "boutique" ? "Your boutique application has been saved. Sign in to open your dashboard." : "");
  const [error, setError] = useState("");

  const [busy, setBusy] = useState(false);
  const [googleEnabled, setGoogleEnabled] = useState(false);
  useEffect(() => { getProviders().then(providers => setGoogleEnabled(Boolean(providers?.google))).catch(() => {}); }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setMessage("");
    setError("");

    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setBusy(true);
    try {
      const result = await signIn("credentials", { email: email.trim().toLowerCase(), password, redirect: false });
      if (result?.error) { setError("Email or password is incorrect."); return; }
      const account = await api<{ role: string }>("/api/profile");
      window.dispatchEvent(new Event("rentique:session-change"));
      const callback = params.get("callbackUrl"), safeCallback = callback && /^\/(marketplace(?:\/[^?#\\]*)?|styling|wishlist|my-rentals|profile)(?:[?#].*)?$/.test(callback) ? callback : "/profile";
      router.push(account.role === "ADMIN" ? "/admin" : account.role === "BOUTIQUE_OWNER" ? "/boutique/dashboard" : boutiqueIntent ? "/boutique/register" : safeCallback);
      router.refresh();
    } catch { setError("Unable to sign in. Please try again."); }
    finally { setBusy(false); }
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#f7f5f1] text-[#302d31]">
      <CustomerHeader />

      <main className="flex flex-1 items-center justify-center px-5 py-12 sm:py-16">
        <section className="w-full max-w-md rounded-3xl border border-[#e4dfd7] bg-[#fffdf9] p-6 shadow-sm sm:p-10">
          <div className="mb-7 flex size-12 items-center justify-center rounded-2xl bg-[#f3efe9] text-[#4c2544]">
            <LockKeyhole size={23} />
          </div>

          <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#927c59]">
            Welcome back
          </p>

          <h1 className="mt-3 font-serif text-4xl text-[#4c2544]">
            {boutiqueIntent ? "Boutique sign in" : "Sign in to Rentique"}
          </h1>

          <p className="mt-3 text-sm leading-6 text-[#716971]">
            {boutiqueIntent ? "Sign in to continue your boutique registration or open your dashboard." : "Sign in to manage your account, wishlist, and rentals."}
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-medium"
              >
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setError("");
                  setMessage("");
                }}
                placeholder="you@example.com"
                className="h-12 w-full rounded-xl border border-[#d9d1c9] bg-white px-4 text-sm outline-none transition placeholder:text-[#a49ba2] focus:border-[#4c2544] focus:ring-2 focus:ring-[#4c2544]/10"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-medium"
              >
                Password
              </label>

              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    setError("");
                    setMessage("");
                  }}
                  placeholder="Enter your password"
                  className="h-12 w-full rounded-xl border border-[#d9d1c9] bg-white px-4 pr-12 text-sm outline-none transition placeholder:text-[#a49ba2] focus:border-[#4c2544] focus:ring-2 focus:ring-[#4c2544]/10"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute inset-y-0 right-0 flex items-center px-4 text-[#716971] hover:text-[#4c2544]"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <p role="alert" className="text-sm text-red-700">
                {error}
              </p>
            )}

            {message && (
              <p role="status" className="rounded-xl bg-[#f3efe9] p-3 text-sm leading-6 text-[#4c2544]">
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#4c2544] px-5 text-sm font-medium text-white transition hover:bg-[#633358] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4c2544]"
            >
              {busy ? "Signing in?" : "Sign in"} <ArrowRight size={17} />
            </button>
          </form>
          <div className="mt-5 flex flex-wrap justify-center gap-4 text-sm"><Link href="/forgot-password" className="underline">Forgot password?</Link><Link href="/verify-email" className="underline">Verify email</Link></div>
          {googleEnabled && <button onClick={() => void signIn("google", { callbackUrl: boutiqueIntent ? "/auth/continue?intent=boutique" : "/auth/continue" })} className="mt-5 w-full rounded-full border border-[#d7cec5] p-3 text-sm">Continue with Google</button>}

          <p className="mt-7 text-center text-sm text-[#716971]">
            New to Rentique?{" "}
            <Link
              href={boutiqueIntent ? "/register?intent=boutique" : "/register"}
              className="font-semibold text-[#4c2544] underline-offset-4 hover:underline"
            >
              {boutiqueIntent ? "Create a boutique account" : "Create an account"}
            </Link>
          </p>

          <p className="mt-5 text-center text-xs leading-5 text-[#8a8188]">
            Use your Rentique account to manage rentals or your boutique.
          </p>
        </section>
      </main>

      <CustomerFooter />
    </div>
  );
}
