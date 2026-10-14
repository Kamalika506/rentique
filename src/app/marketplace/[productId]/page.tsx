"use client";

import { Suspense, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react";
import CustomerHeader from "@/components/layout/customer-header";
import CustomerFooter from "@/components/layout/customer-footer";
import { demoProducts } from "@/features/marketplace/demo-products";

export default function ProductDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#f7f5f1] p-8 text-[#302d31]">
          Loading product details...
        </div>
      }
    >
      <ProductDetailContent />
    </Suspense>
  );
}

function ProductDetailContent() {
  const params = useParams<{ productId: string }>();
  const product = demoProducts.find((item) => item.id === params.productId);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [message, setMessage] = useState("");

  const today = new Date().toLocaleDateString("en-CA");

  const rentalDays =
    startDate && endDate && endDate >= startDate
      ? Math.floor(
          (new Date(`${endDate}T00:00:00`).getTime() -
            new Date(`${startDate}T00:00:00`).getTime()) /
            (1000 * 60 * 60 * 24)
        ) + 1
      : 0;

  const listedRentalDays = Number.parseInt(
    product?.rentalPeriod ?? "",
    10
  );
  const estimatedTotal =
    product && rentalDays > 0 && listedRentalDays > 0
      ? Math.round((product.price / listedRentalDays) * rentalDays)
      : 0;

  function handleBookingRequest() {
    setMessage("");

    if (!startDate || !endDate) {
      setMessage("Please select your rental start and end dates.");
      return;
    }

    if (startDate < today) {
      setMessage("The rental start date cannot be in the past.");
      return;
    }

    if (endDate < startDate) {
      setMessage("The end date must be on or after the start date.");
      return;
    }

    setMessage(
      "Your dates have been selected. Booking is a demo only and has not been saved."
    );
  }

  if (!product) {
    return (
      <div className="flex min-h-screen flex-col bg-[#f7f5f1] text-[#302d31]">
        <CustomerHeader />
        <main className="flex flex-1 items-center justify-center px-5 py-16">
          <div className="max-w-md text-center">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#927c59]">
              Product not found
            </p>
            <h1 className="mt-3 font-serif text-4xl text-[#4c2544]">
              This look isn't available in our demo.
            </h1>
            <p className="mt-4 text-sm leading-6 text-[#716971]">
              The product may not exist in the current sample collection.
            </p>
            <Link
              href="/marketplace"
              className="mt-7 inline-flex items-center gap-2 rounded-full bg-[#4c2544] px-6 py-3 text-sm font-medium text-white hover:bg-[#633358]"
            >
              <ArrowLeft size={17} />
              Back to marketplace
            </Link>
          </div>
        </main>
        <CustomerFooter />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#f7f5f1] text-[#302d31]">
      <CustomerHeader />

      <main className="mx-auto w-full max-w-7xl flex-1 px-5 py-8 sm:px-8 sm:py-12">
        <Link
          href="/marketplace"
          className="inline-flex items-center gap-2 text-sm text-[#716971] hover:text-[#4c2544]"
        >
          <ArrowLeft size={17} />
          Back to collection
        </Link>

        <div className="mt-7 grid gap-8 lg:grid-cols-2 lg:gap-14">
          <div
            role="img"
            aria-label={`Demo fashion image for ${product.name}`}
            className="aspect-[4/5] w-full rounded-3xl bg-[#eee7e5] bg-cover bg-center"
            style={{ backgroundImage: `url('${product.image}')` }}
          />

          <section className="py-2 lg:py-6">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#927c59]">
              {product.category}
            </p>

            <h1 className="mt-3 font-serif text-4xl leading-tight text-[#4c2544] sm:text-5xl">
              {product.name}
            </h1>

            <p className="mt-3 text-sm text-[#716971]">
              {product.collection}
            </p>

            <div className="mt-6 border-y border-[#e4dfd7] py-5">
              <p className="text-xs text-[#716971]">
                Sample rental price
              </p>
              <p className="mt-1 text-3xl font-semibold text-[#302d31]">
                ₹{product.price.toLocaleString("en-IN")}
                <span className="text-sm font-normal text-[#716971]">
                  {" "}
                  / {product.rentalPeriod}
                </span>
              </p>
              <p className="mt-2 text-xs leading-5 text-[#8a8188]">
                Illustrative demo price. Final prices and rental periods must
                come from the live inventory API.
              </p>
            </div>

            <h2 className="mt-7 font-serif text-2xl text-[#4c2544]">
              About this look
            </h2>
            <p className="mt-3 text-sm leading-7 text-[#716971]">
              {product.description}
            </p>

            <div className="mt-6 flex flex-col gap-3 text-sm text-[#514a50]">
              <p className="flex items-center gap-3">
                <CalendarDays size={18} className="text-[#927c59]" />
                Choose your preferred rental dates
              </p>
              <p className="flex items-center gap-3">
                <ShieldCheck size={18} className="text-[#927c59]" />
                Availability has not been verified
              </p>
            </div>

            <div className="mt-8 rounded-2xl border border-[#e4dfd7] bg-[#fffdf9] p-5 sm:p-6">
              <h2 className="font-serif text-2xl text-[#4c2544]">
                Plan your rental
              </h2>

              <p className="mt-2 text-sm leading-6 text-[#716971]">
                Select dates to preview your rental period. This does not
                reserve the product.
              </p>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="start-date"
                    className="mb-2 block text-sm font-medium"
                  >
                    Start date
                  </label>
                  <input
                    id="start-date"
                    type="date"
                    min={today}
                    value={startDate}
                    onChange={(event) => {
                      setStartDate(event.target.value);
                      setMessage("");
                    }}
                    className="h-12 w-full min-w-0 rounded-xl border border-[#d9d1c9] bg-white px-3 text-sm outline-none focus:border-[#4c2544] focus:ring-2 focus:ring-[#4c2544]/10"
                  />
                </div>

                <div>
                  <label
                    htmlFor="end-date"
                    className="mb-2 block text-sm font-medium"
                  >
                    End date
                  </label>
                  <input
                    id="end-date"
                    type="date"
                    min={startDate || today}
                    value={endDate}
                    onChange={(event) => {
                      setEndDate(event.target.value);
                      setMessage("");
                    }}
                    className="h-12 w-full min-w-0 rounded-xl border border-[#d9d1c9] bg-white px-3 text-sm outline-none focus:border-[#4c2544] focus:ring-2 focus:ring-[#4c2544]/10"
                  />
                </div>
              </div>

              {rentalDays > 0 && (
                <div className="mt-4 rounded-xl bg-[#f3efe9] p-4">
                  <p className="text-sm font-medium text-[#4c2544]">
                    Rental summary
                  </p>

                  <div className="mt-3 space-y-2 text-sm text-[#716971]">
                    <div className="flex justify-between gap-3">
                      <span>Selected duration</span>
                      <span className="font-medium text-[#302d31]">
                        {rentalDays} {rentalDays === 1 ? "day" : "days"}
                      </span>
                    </div>

                    <div className="flex justify-between gap-3">
                      <span>Listed price ({product.rentalPeriod})</span>
                      <span className="font-medium text-[#302d31]">
                        ₹{product.price.toLocaleString("en-IN")}
                      </span>
                    </div>

                    <div className="flex justify-between gap-3 border-t border-[#e4dfd7] pt-3">
                      <span className="font-semibold text-[#4c2544]">
                        Estimated total
                      </span>
                      <span className="text-lg font-semibold text-[#4c2544]">
                        ₹{estimatedTotal.toLocaleString("en-IN")}
                      </span>
                    </div>
                  </div>

                  <p className="mt-3 text-xs leading-5 text-[#8a8188]">
                    Illustrative estimate based on a proportional daily rate.
                    Actual pricing, fees, and availability have not been verified.
                  </p>
                </div>
              )}


              {message && (
                <p
                  role="status"
                  className="mt-4 rounded-xl bg-[#f3efe9] p-3 text-sm leading-6 text-[#4c2544]"
                >
                  {message}
                </p>
              )}

              <button
                type="button"
                onClick={handleBookingRequest}
                className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#4c2544] px-5 text-sm font-medium text-white transition hover:bg-[#633358] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4c2544]"
              >
                Preview rental dates <ArrowRight size={17} />
              </button>

              <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-[#8a8188]">
                <CheckCircle2 size={15} className="mt-0.5 shrink-0" />
                Demo only. No booking, payment, or availability check is
                performed.
              </p>
            </div>
          </section>
        </div>
      </main>

      <CustomerFooter />
    </div>
  );
}