import { apiRequest } from "@/services/api-client";
import type {
  DashboardData,
  ElectionSummary,
  ElectionsResponse,
} from "@/types/dashboard";
import type { PositionsResponse } from "@/types/position";
import type {
  CandidateMutationResponse,
  CandidatesResponse,
} from "@/types/candidate";

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

export function activateAdminElection(
  token: string,
  electionId: number,
): Promise<{ message: string; data: ElectionSummary }> {
  return apiRequest<{ message: string; data: ElectionSummary }>(
    `/admin/elections/${electionId}/activate`,
    {
      method: "POST",
      headers: authHeaders(token),
    },
  );
}

export function getAdminDashboard(
  token: string,
  electionId: number,
  signal?: AbortSignal,
): Promise<DashboardData> {
  return apiRequest<DashboardData>(
    `/admin/dashboard?election_id=${electionId}`,
    {
      headers: authHeaders(token),
      cache: "no-store",
      signal,
    },
  );
}

export function logoutAdmin(token: string): Promise<{ message: string }> {
  return apiRequest<{ message: string }>("/admin/logout", {
    method: "POST",
    headers: authHeaders(token),
  });
}

export function listAdminPositions(
  token: string,
  electionId: number,
): Promise<PositionsResponse> {
  return apiRequest<PositionsResponse>(
    `/admin/positions?election_id=${electionId}`,
    {
      headers: authHeaders(token),
    },
  );
}

export function listAdminCandidates(
  token: string,
  electionId: number,
): Promise<CandidatesResponse> {
  return apiRequest<CandidatesResponse>(
    `/admin/candidates?election_id=${electionId}`,
    {
      headers: authHeaders(token),
    },
  );
}

export function saveAdminCandidate(
  token: string,
  payload: FormData,
): Promise<CandidateMutationResponse> {
  return apiRequest<CandidateMutationResponse>("/admin/candidates", {
    method: "POST",
    headers: authHeaders(token),
    body: payload,
  });
}

export function deleteAdminCandidate(
  token: string,
  studentId: string,
  electionId: number,
): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(`/admin/candidates/${studentId}`, {
    method: "DELETE",
    headers: authHeaders(token),
    body: JSON.stringify({ election_id: electionId }),
  });
}
