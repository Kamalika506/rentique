"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { api, jsonRequest } from "@/lib/api-client";
import Link from "next/link";
import { ArrowRight, Eye, EyeOff, UserRound } from "lucide-react";
import CustomerHeader from "@/components/layout/customer-header";
import CustomerFooter from "@/components/layout/customer-footer";

export default function RegisterPage() {
  return <Suspense fallback={<main className="p-8" role="status">Loading registration...</main>}><RegisterForm /></Suspense>;
}

function RegisterForm() {
  const router = useRouter();
  const boutiqueIntent = useSearchParams().get("intent") === "boutique";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setMessage("");
    setError("");

    if (password.length < 8) {
      setError("Your password must contain at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Your passwords do not match.");
      return;
    }

    setBusy(true);
    try {
      const registration = await api<{ verificationEmailSent: boolean }>("/api/register", jsonRequest("POST", { name, email, password }));
      if (boutiqueIntent) {
        const result = await signIn("credentials", { email: email.trim().toLowerCase(), password, redirect: false });
        if (result?.error) { setMessage("Account created. Sign in below to continue boutique registration."); return; }
        window.dispatchEvent(new Event("rentique:session-change"));
        router.push("/boutique/register");
        router.refresh();
        return;
      }
      setMessage(registration.verificationEmailSent ? "Account created. Check your email for a verification link, then sign in." : "Account created. You can now sign in.");
      setPassword(""); setConfirmPassword("");
    } catch (error) { setError(error instanceof Error ? error.message : "Registration failed."); }
    finally { setBusy(false); }
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#f7f5f1] text-[#302d31]">
      <CustomerHeader />

      <main className="flex flex-1 items-center justify-center px-5 py-12 sm:py-16">
        <section className="w-full max-w-md rounded-3xl border border-[#e4dfd7] bg-[#fffdf9] p-6 shadow-sm sm:p-10">
          <div className="mb-7 flex size-12 items-center justify-center rounded-2xl bg-[#f3efe9] text-[#4c2544]">
            <UserRound size={23} />
          </div>

          <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#927c59]">
            Your next favourite look
          </p>

          <h1 className="mt-3 font-serif text-4xl text-[#4c2544]">
            {boutiqueIntent ? "Create your boutique account" : "Join Rentique"}
          </h1>

          <p className="mt-3 text-sm leading-6 text-[#716971]">
            {boutiqueIntent ? "Create an owner account, then tell us about your boutique." : "Create your account to explore fashion rentals and manage your favourite looks."}
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label htmlFor="name" className="mb-2 block text-sm font-medium">
                Full name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                required
                minLength={2}
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  setError("");
                  setMessage("");
                }}
                placeholder="Your full name"
                className="h-12 w-full rounded-xl border border-[#d9d1c9] bg-white px-4 text-sm outline-none transition placeholder:text-[#a49ba2] focus:border-[#4c2544] focus:ring-2 focus:ring-[#4c2544]/10"
              />
            </div>

            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-medium">
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
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    setError("");
                    setMessage("");
                  }}
                  placeholder="At least 8 characters"
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

            <div>
              <label
                htmlFor="confirmPassword"
                className="mb-2 block text-sm font-medium"
              >
                Confirm password
              </label>

              <div className="relative">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(event) => {
                    setConfirmPassword(event.target.value);
                    setError("");
                    setMessage("");
                  }}
                  placeholder="Enter your password again"
                  className="h-12 w-full rounded-xl border border-[#d9d1c9] bg-white px-4 pr-12 text-sm outline-none transition placeholder:text-[#a49ba2] focus:border-[#4c2544] focus:ring-2 focus:ring-[#4c2544]/10"
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowConfirmPassword((visible) => !visible)
                  }
                  aria-label={
                    showConfirmPassword
                      ? "Hide password confirmation"
                      : "Show password confirmation"
                  }
                  className="absolute inset-y-0 right-0 flex items-center px-4 text-[#716971] hover:text-[#4c2544]"
                >
                  {showConfirmPassword ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
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
              {busy ? "Creating account?" : "Create account"} <ArrowRight size={17} />
            </button>
          </form>

          <p className="mt-7 text-center text-sm text-[#716971]">
            Already have an account?{" "}
            <Link
              href={boutiqueIntent ? "/login?intent=boutique" : "/login"}
              className="font-semibold text-[#4c2544] underline-offset-4 hover:underline"
            >
              Sign in
            </Link>
          </p>

          <p className="mt-5 text-center text-xs leading-5 text-[#8a8188]">
            {boutiqueIntent ? "After submitting your boutique registration, sign in to access your dashboard." : "After creating an account, sign in to place rental requests and manage your account."}
          </p>
        </section>
      </main>

      <CustomerFooter />
    </div>
  );
}
