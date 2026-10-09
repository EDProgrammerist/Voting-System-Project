import { apiRequest } from "@/services/api-client";
import type { DashboardData, ElectionsResponse } from "@/types/dashboard";

function authHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
  };
}

export function listAdminElections(token: string): Promise<ElectionsResponse> {
  return apiRequest<ElectionsResponse>("/admin/elections", {
    headers: authHeaders(token),
  });
}

export function getAdminDashboard(
  token: string,
  electionId: number,
): Promise<DashboardData> {
  return apiRequest<DashboardData>(`/admin/dashboard?election_id=${electionId}`, {
    headers: authHeaders(token),
  });
}

export function logoutAdmin(token: string): Promise<{ message: string }> {
  return apiRequest<{ message: string }>("/admin/logout", {
    method: "POST",
    headers: authHeaders(token),
  });
}
