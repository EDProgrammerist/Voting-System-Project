import { apiRequest } from "@/services/api-client";
import type { DashboardData, ElectionsResponse } from "@/types/dashboard";
import type { StudentsResponse } from "@/types/student";
import type {
  PositionMutationResponse,
  PositionPayload,
  PositionsResponse,
} from "@/types/position";
import type { CandidateMutationResponse, CandidatesResponse } from "@/types/candidate";

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

export function listAdminStudents(token: string): Promise<StudentsResponse> {
  return apiRequest<StudentsResponse>("/admin/students", {
    headers: authHeaders(token),
  });
}

export function listAdminPositions(
  token: string,
  electionId: number,
): Promise<PositionsResponse> {
  return apiRequest<PositionsResponse>(`/admin/positions?election_id=${electionId}`, {
    headers: authHeaders(token),
  });
}

export function createAdminPosition(
  token: string,
  payload: Required<PositionPayload>,
): Promise<PositionMutationResponse> {
  return apiRequest<PositionMutationResponse>("/admin/positions", {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
}

export function updateAdminPosition(
  token: string,
  positionId: number,
  payload: PositionPayload,
): Promise<PositionMutationResponse> {
  return apiRequest<PositionMutationResponse>(`/admin/positions/${positionId}`, {
    method: "PUT",
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
}

export function deleteAdminPosition(
  token: string,
  positionId: number,
): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(`/admin/positions/${positionId}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
}

export function listAdminCandidates(
  token: string,
  electionId: number,
): Promise<CandidatesResponse> {
  return apiRequest<CandidatesResponse>(`/admin/candidates?election_id=${electionId}`, {
    headers: authHeaders(token),
  });
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
