export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, { cache: "no-store", ...options, headers: { ...(options?.body instanceof FormData ? {} : { "Content-Type": "application/json" }), ...options?.headers } });
  const body = await response.json();
  if (!response.ok) throw new HttpError(response.status, body.error ?? "Request failed. Please try again.");
  return body as T;
}
export const jsonRequest = (method: string, body: unknown): RequestInit => ({ method, body: JSON.stringify(body) });
