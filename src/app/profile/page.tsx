
"use client";

import { useEffect, useState } from "react";
import { SignOutButton } from "@/components/layout/sign-out-button";
import { api, jsonRequest } from "@/lib/api-client";
import Link from "next/link";
import { ArrowRight, Heart, Package, UserRound } from "lucide-react";
import CustomerHeader from "@/components/layout/customer-header";
import CustomerFooter from "@/components/layout/customer-footer";
import { ReservationRequirements } from "@/features/marketplace/reservation-review";

type Customer = {
  name: string;
  email: string;
  phone: string;
  role?: string;
  emailVerified?: boolean;
};

export default function ProfilePage() {
  const [customer, setCustomer] = useState<Customer>({
    name: "",
    email: "",
    phone: "",
  });

  const [form, setForm] = useState<Customer>(customer);
  const [isEditing, setIsEditing] = useState(false);
  const [savedMessage, setSavedMessage] = useState("");

  const [loadError, setLoadError] = useState("");
  useEffect(() => { let active = true; api<Customer>("/api/profile").then(data => { if (active) { setCustomer(data); setForm(data); } }).catch(error => { if (active) setLoadError(error.message); }); return () => { active = false; }; }, []);
  function startEditing() {
    setForm(customer);
    setSavedMessage("");
    setIsEditing(true);
  }

  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const updated = await api<Customer>("/api/profile", jsonRequest("PATCH", { name: form.name, phone: form.phone }));
      setCustomer(updated); setIsEditing(false); setSavedMessage("Profile updated.");
    } catch (error) { setSavedMessage(error instanceof Error ? error.message : "Profile could not be saved."); }
  }

  function cancelEditing() {
    setForm(customer);
    setIsEditing(false);
    setSavedMessage("");
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#f7f5f1]">
      <CustomerHeader />

      <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-10 sm:px-8 sm:py-14">
        <div className="mb-8">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#927c59]">
            Your account
          </p>
          <h1 className="mt-2 font-serif text-4xl text-[#4c2544] sm:text-5xl">
            My profile
          </h1>
          <p className="mt-3 text-sm leading-6 text-[#716971] sm:text-base">
            Manage your account details and explore your Rentique activity.
          </p>
        </div>

        {loadError && <p role="alert" className="mb-6">{loadError} <Link className="underline" href="/login">Sign in</Link></p>}
        {customer.email && <div className="mb-6 flex flex-wrap gap-5">
          {customer.role === "BOUTIQUE_OWNER" && <Link className="underline" href="/boutique/dashboard">Open boutique workspace</Link>}
          {customer.role === "ADMIN" && <Link className="underline" href="/admin/boutiques">Review boutique applications</Link>}
          <Link className="underline" href="/change-password">Change password</Link>
          <SignOutButton className="underline" />
        </div>}
        {customer.role !== "ADMIN" && <ReservationRequirements />}
        <section className="rounded-2xl border border-[#e4dfd7] bg-[#fffdf9] p-6 sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
            <div className="flex size-16 shrink-0 items-center justify-center rounded-full bg-[#f3efe9] text-[#4c2544]">
              <UserRound size={30} />
            </div>

            <div className="min-w-0 flex-1">
              {!isEditing ? (
                <>
                  <h2 className="text-xl font-semibold text-[#302d31]">
                    {customer.name}
                  </h2>
                  <p className="mt-1 break-words text-sm text-[#716971]">
                    {customer.email}
                  </p>
                  <p className="mt-1 text-sm text-[#716971]">
                    Phone: {customer.phone || "Not added"}
                  </p>
                  <p className="mt-3 inline-flex rounded-full bg-[#f3efe9] px-3 py-1 text-xs text-[#4c2544]">
                    {customer.role?.replaceAll("_", " ")}
                  </p>
                </>
              ) : (
                <form onSubmit={saveProfile} className="space-y-4">
                  <div>
                    <label
                      htmlFor="customer-name"
                      className="mb-1.5 block text-sm font-medium text-[#302d31]"
                    >
                      Full name
                    </label>
                    <input
                      id="customer-name"
                      name="name"
                      type="text"
                      required
                      maxLength={80}
                      value={form.name}
                      onChange={(event) =>
                        setForm({ ...form, name: event.target.value })
                      }
                      className="w-full rounded-xl border border-[#e4dfd7] bg-white px-4 py-3 text-sm text-[#302d31] outline-none focus:border-[#4c2544] focus:ring-2 focus:ring-[#4c2544]/10"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="customer-email"
                      className="mb-1.5 block text-sm font-medium text-[#302d31]"
                    >
                      Email address
                    </label>
                    <input
                      id="customer-email"
                      readOnly
                      name="email"
                      type="email"
                      required
                      maxLength={254}
                      value={form.email}
                      onChange={(event) =>
                        setForm({ ...form, email: event.target.value })
                      }
                      className="w-full rounded-xl border border-[#e4dfd7] bg-white px-4 py-3 text-sm text-[#302d31] outline-none focus:border-[#4c2544] focus:ring-2 focus:ring-[#4c2544]/10"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="customer-phone"
                      className="mb-1.5 block text-sm font-medium text-[#302d31]"
                    >
                      Phone number (optional)
                    </label>
                    <input
                      id="customer-phone"
                      name="phone"
                      type="tel"
                      maxLength={20}
                      value={form.phone}
                      onChange={(event) =>
                        setForm({ ...form, phone: event.target.value })
                      }
                      className="w-full rounded-xl border border-[#e4dfd7] bg-white px-4 py-3 text-sm text-[#302d31] outline-none focus:border-[#4c2544] focus:ring-2 focus:ring-[#4c2544]/10"
                    />
                  </div>

                  <div className="flex flex-wrap gap-3 pt-2">
                    <button
                      type="submit"
                      className="rounded-full bg-[#4c2544] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#633358]"
                    >
                      Save changes
                    </button>
                    <button
                      type="button"
                      onClick={cancelEditing}
                      className="rounded-full border border-[#e4dfd7] px-5 py-2.5 text-sm font-medium text-[#4c2544] transition hover:bg-[#f3efe9]"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>

            {!isEditing && (
              <button
                type="button"
                onClick={startEditing}
                className="rounded-full border border-[#e4dfd7] px-5 py-2.5 text-sm font-medium text-[#4c2544] transition hover:bg-[#f3efe9]"
              >
                Edit profile
              </button>
            )}
          </div>

          {savedMessage && (
            <p
              role="status"
              className="mt-5 rounded-xl bg-[#edf5ed] px-4 py-3 text-sm text-[#285c35]"
            >
              {savedMessage}
            </p>
          )}
        </section>

        {customer.role !== "ADMIN" && (
          <div className="mt-8 grid gap-5 sm:grid-cols-2">
            <Link
              href="/wishlist"
              className="group rounded-2xl border border-[#e4dfd7] bg-[#fffdf9] p-6 transition hover:-translate-y-0.5 hover:shadow-md sm:p-7"
            >
              <div className="flex items-center justify-between">
                <div className="flex size-12 items-center justify-center rounded-xl bg-[#f3efe9] text-[#4c2544]">
                  <Heart size={23} />
                </div>
                <ArrowRight
                  size={20}
                  className="text-[#927c59] transition group-hover:translate-x-1"
                />
              </div>
              <h2 className="mt-5 text-xl font-semibold text-[#4c2544]">
                My wishlist
              </h2>
              <p className="mt-2 text-sm leading-6 text-[#716971]">
                View the fashion pieces you have saved for later.
              </p>
            </Link>

            <Link
              href="/my-rentals"
              className="group rounded-2xl border border-[#e4dfd7] bg-[#fffdf9] p-6 transition hover:-translate-y-0.5 hover:shadow-md sm:p-7"
            >
              <div className="flex items-center justify-between">
                <div className="flex size-12 items-center justify-center rounded-xl bg-[#f3efe9] text-[#4c2544]">
                  <Package size={23} />
                </div>
                <ArrowRight
                  size={20}
                  className="text-[#927c59] transition group-hover:translate-x-1"
                />
              </div>

              <h2 className="mt-5 text-xl font-semibold text-[#4c2544]">
                My rentals
              </h2>
              <p className="mt-2 text-sm leading-6 text-[#716971]">
                View your rental history, rental periods, and booking status.
              </p>
            </Link>
          </div>
        )}

        <div className="mt-8">
          <Link
            href={customer.role === "BOUTIQUE_OWNER" ? "/boutique/dashboard" : customer.role === "ADMIN" ? "/admin" : "/marketplace"}
            className="inline-flex items-center gap-2 text-sm font-medium text-[#4c2544] hover:text-[#927c59]"
          >
            {customer.role === "BOUTIQUE_OWNER" ? "Back to boutique workspace" : customer.role === "ADMIN" ? "Back to admin workspace" : "Explore the marketplace"} <ArrowRight size={17} />
          </Link>
        </div>
      </main>

      <CustomerFooter />
    </div>
  );
}
