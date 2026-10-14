
import Link from "next/link";
import { ArrowRight, CalendarDays, Package } from "lucide-react";
import CustomerHeader from "@/components/layout/customer-header";
import CustomerFooter from "@/components/layout/customer-footer";
import { demoProducts } from "@/features/marketplace/demo-products";

type DemoRental = {
  id: string;
  productId: string;
  startDate: string;
  endDate: string;
  status: "Upcoming" | "Active" | "Completed";
};

const demoRentals: DemoRental[] = [
  {
    id: "rental-demo-101",
    productId: "demo-1",
    startDate: "12 Nov 2026",
    endDate: "16 Nov 2026",
    status: "Upcoming",
  },
  {
    id: "rental-demo-102",
    productId: "demo-2",
    startDate: "01 Oct 2026",
    endDate: "05 Oct 2026",
    status: "Completed",
  },
  {
    id: "rental-demo-103",
    productId: "demo-5",
    startDate: "14 Oct 2026",
    endDate: "18 Oct 2026",
    status: "Active",
  },
];

const statusStyles: Record<DemoRental["status"], string> = {
  Upcoming: "bg-blue-50 text-blue-700",
  Active: "bg-green-50 text-green-700",
  Completed: "bg-[#f3efe9] text-[#716971]",
};

export default function MyRentalsPage() {
  const rentals = demoRentals
    .map((rental) => ({
      ...rental,
      product: demoProducts.find(
        (product) => product.id === rental.productId,
      ),
    }))
    .filter((rental) => rental.product !== undefined);

  return (
    <div className="flex min-h-screen flex-col bg-[#f7f5f1]">
      <CustomerHeader />

      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-10 sm:px-8 sm:py-14">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#927c59]">
              Your account
            </p>
            <h1 className="mt-2 font-serif text-4xl text-[#4c2544] sm:text-5xl">
              My rentals
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-[#716971] sm:text-base">
              Keep track of your rental dates and the pieces you have enjoyed.
            </p>
          </div>

          <Link
            href="/marketplace"
            className="inline-flex w-fit items-center gap-2 rounded-full bg-[#4c2544] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#633358]"
          >
            Explore styles <ArrowRight size={17} />
          </Link>
        </div>

        <div className="mt-6 rounded-xl border border-[#e4dfd7] bg-[#fffdf9] px-4 py-3 text-sm leading-6 text-[#716971]">
          These are sample rental records for demonstration only. They are not
          actual bookings or confirmed availability.
        </div>

        {rentals.length === 0 ? (
          <section className="mt-8 rounded-2xl border border-[#e4dfd7] bg-[#fffdf9] px-6 py-14 text-center">
            <Package size={36} className="mx-auto text-[#927c59]" />
            <h2 className="mt-4 font-serif text-2xl text-[#4c2544]">
              No rentals yet
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#716971]">
              Your rental history will appear here when bookings are connected
              to your account.
            </p>
            <Link
              href="/marketplace"
              className="mt-6 inline-flex rounded-full bg-[#4c2544] px-5 py-3 text-sm font-medium text-white hover:bg-[#633358]"
            >
              Browse the marketplace
            </Link>
          </section>
        ) : (
          <div className="mt-8 grid gap-5">
            {rentals.map(({ id, startDate, endDate, status, product }) => {
              if (!product) return null;

              return (
                <article
                  key={id}
                  className="overflow-hidden rounded-2xl border border-[#e4dfd7] bg-[#fffdf9]"
                >
                  <div className="flex flex-col sm:flex-row">
                    <Link
                      href={`/marketplace/${product.id}`}
                      className="block shrink-0 sm:w-52"
                      aria-label={`View ${product.name}`}
                    >
                      <div
                        role="img"
                        aria-label={`Demo image for ${product.name}`}
                        className="aspect-[4/3] bg-[#eee7e5] bg-cover bg-center sm:aspect-auto sm:h-full sm:min-h-56"
                        style={{
                          backgroundImage: `url('${product.image}')`,
                        }}
                      />
                    </Link>

                    <div className="flex min-w-0 flex-1 flex-col justify-between gap-5 p-5 sm:p-6">
                      <div>
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <span
                            className={`rounded-full px-3 py-1.5 text-xs font-medium ${statusStyles[status]}`}
                          >
                            {status}
                          </span>
                          <span className="text-xs text-[#716971]">
                            Demo rental
                          </span>
                        </div>

                        <p className="mt-4 text-xs uppercase tracking-[0.12em] text-[#927c59]">
                          {product.category}
                        </p>
                        <h2 className="mt-1 font-serif text-2xl text-[#4c2544]">
                          {product.name}
                        </h2>
                        <p className="mt-1 text-sm text-[#716971]">
                          {product.collection}
                        </p>
                      </div>

                      <div className="grid gap-4 border-t border-[#e4dfd7] pt-4 sm:grid-cols-2">
                        <div>
                          <p className="flex items-center gap-2 text-xs text-[#716971]">
                            <CalendarDays size={15} />
                            Rental period
                          </p>
                          <p className="mt-1 text-sm font-medium text-[#302d31]">
                            {startDate} – {endDate}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-[#716971]">
                            Sample rental price
                          </p>
                          <p className="mt-1 text-lg font-semibold text-[#302d31]">
                            ₹{product.price.toLocaleString("en-IN")}
                            <span className="text-xs font-normal text-[#716971]">
                              {" "}/ {product.rentalPeriod}
                            </span>
                          </p>
                        </div>
                      </div>

                      <div>
                        <Link
                          href={`/marketplace/${product.id}`}
                          className="inline-flex items-center gap-2 text-sm font-medium text-[#4c2544] hover:text-[#927c59]"
                        >
                          View item details <ArrowRight size={16} />
                        </Link>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>

      <CustomerFooter />
    </div>
  );
}
