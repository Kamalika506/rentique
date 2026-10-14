import { api, HttpError, jsonRequest } from "@/lib/api-client";
import { BookingServiceError, type BoutiqueBookingService } from "../booking-management/service";
import { ProductServiceError, type BoutiqueProductService } from "../inventory/service";
import { validateImageFiles } from "../inventory/image-upload";
import { OnboardingServiceError, type BoutiqueOnboardingService } from "../onboarding/service";
import { DashboardServiceError, type BoutiqueDashboardService } from "../dashboard/service";
import type { BoutiqueAnalyticsService } from "@/features/analytics/service";

const code = (error: unknown) => error instanceof HttpError ? error.status === 409 ? "CONFLICT" : error.status === 404 ? "NOT_FOUND" : error.status === 400 ? "VALIDATION" : [401, 403].includes(error.status) ? "FORBIDDEN" : "UNAVAILABLE" : "UNAVAILABLE";
const message = (error: unknown) => error instanceof Error ? error.message : "Service unavailable.";
export function createLiveBookingService(): BoutiqueBookingService {
  const service: BoutiqueBookingService = {
    mode: "live", boutique: { id: "", name: "Boutique workspace" }, referenceDate: new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }), timezone: "Asia/Kolkata",
    listBookings: query => bookingApi(`/api/boutique/bookings?${new URLSearchParams(Object.entries(query).filter(([, value]) => Boolean(value)) as [string, string][])}`),
    async getBooking(id) { const result = await bookingApi<Awaited<ReturnType<BoutiqueBookingService["getBooking"]>>>(`/api/boutique/bookings?id=${encodeURIComponent(id)}`); service.boutique.id = result.boutiqueId; return result; },
    decideBooking: (id, decision, version, reason) => service.applyLifecycleAction(id, decision === "CONFIRM" ? { action: "CONFIRM" } : { action: "REJECT", reason: reason ?? "" }, version),
    applyLifecycleAction: (id, command, version) => bookingApi("/api/boutique/bookings", jsonRequest("PATCH", { id, command, version })),
    getCalendar: month => bookingApi(`/api/boutique/calendar?month=${encodeURIComponent(month)}`),
  };
  return service;
}
async function bookingApi<T>(path: string, options?: RequestInit): Promise<T> { try { return await api<T>(path, options); } catch (error) { throw new BookingServiceError(code(error), message(error)); } }
async function productApi<T>(path: string, options?: RequestInit): Promise<T> { try { return await api<T>(path, options); } catch (error) { throw new ProductServiceError(code(error), message(error)); } }
export function createLiveProductService(): BoutiqueProductService {
  const service: BoutiqueProductService = { mode: "live", boutique: { id: "", name: "Boutique workspace" },
    async listProducts() { const result = await productApi<Awaited<ReturnType<BoutiqueProductService["listProducts"]>>>("/api/boutique/products"); if (result[0]) service.boutique.id = result[0].boutiqueId; return result; },
    async getProduct(id) { const result = await productApi<Awaited<ReturnType<BoutiqueProductService["getProduct"]>>>(`/api/boutique/products?id=${encodeURIComponent(id)}`); service.boutique.id = result.boutiqueId; return result; },
    createProduct: input => productApi("/api/boutique/products", jsonRequest("POST", { input })),
    updateProduct: (id, input, version) => productApi("/api/boutique/products", jsonRequest("PUT", { id, input, version })),
    setArchived: (id, archived, version) => productApi("/api/boutique/products", jsonRequest("PATCH", { id, archived, version })),
    async uploadImages(files, options) { validateImageFiles(files); const body = new FormData(); files.forEach(file => body.append("files", file)); if (options?.productId) body.set("productId", options.productId); return productApi("/api/boutique/images", { method: "POST", body, signal: options?.signal }); },
  };
  return service;
}
export function createLiveOnboardingService(): BoutiqueOnboardingService {
  const request = async <T,>(options?: RequestInit): Promise<T> => { try { return await api<T>("/api/boutique/application", options); } catch (error) { throw new OnboardingServiceError(message(error)); } };
  return { mode: "live", getCurrentApplication: () => request(), createApplication: input => request(jsonRequest("POST", input)) };
}
export function createLiveDashboardService(): BoutiqueDashboardService {
  return { mode: "live", async getSnapshot() { try { return await api("/api/boutique/dashboard"); } catch (error) { throw new DashboardServiceError(code(error) === "FORBIDDEN" ? "FORBIDDEN" : "UNAVAILABLE", message(error)); } } };
}
export function createLiveAnalyticsService(): BoutiqueAnalyticsService { return { mode: "live", getDataset: () => api("/api/boutique/analytics") }; }
