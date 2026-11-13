import { clearAdminSession } from "@/lib/admin-session";
import { clearVoterSession } from "@/lib/voter-session";
import { clearCommitteeSession } from "@/lib/committee-session";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly payload?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request(
  endpoint: string,
  init?: RequestInit,
): Promise<Response> {
  const sendsFormData = init?.body instanceof FormData;
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(sendsFormData ? {} : { "Content-Type": "application/json" }),
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as unknown;
    const requestHeaders = new Headers(init?.headers);
    if (response.status === 401 && requestHeaders.has("Authorization")) {
      if (endpoint.startsWith("/committee/")) {
        clearCommitteeSession();
        if (window.location.pathname !== "/committee/login")
          window.location.replace("/committee/login");
      } else if (endpoint.startsWith("/admin/")) {
        clearAdminSession();
        if (window.location.pathname !== "/admin/login") {
          window.location.replace("/admin/login");
        }
      } else if (endpoint.startsWith("/voter/")) {
        clearVoterSession();
        if (window.location.pathname !== "/voter/login") {
          window.location.replace(
            window.location.pathname.startsWith("/vote/")
              ? window.location.pathname
              : "/voter/login",
          );
        }
      }
    }

    const message =
      payload &&
      typeof payload === "object" &&
      "message" in payload &&
      typeof payload.message === "string"
        ? payload.message
        : `Request failed with status ${response.status}.`;

    throw new ApiError(message, response.status, payload);
  }

  return response;
}

export async function apiRequest<T>(
  endpoint: string,
  init?: RequestInit,
): Promise<T> {
  const response = await request(endpoint, init);
  return (await response.json().catch(() => null)) as T;
}
