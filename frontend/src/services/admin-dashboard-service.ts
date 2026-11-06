import { apiRequest } from "@/services/api-client";
import type { DashboardData, ElectionSummary, ElectionsResponse } from "@/types/dashboard";
import type { StudentsResponse, VoterRecord } from "@/types/student";
import type { PositionsResponse } from "@/types/position";
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
  return apiRequest<DashboardData>(`/admin/dashboard?election_id=${electionId}`, {
    headers: authHeaders(token),
    cache: "no-store",
    signal,
  });
}

export function logoutAdmin(token: string): Promise<{ message: string }> {
  return apiRequest<{ message: string }>("/admin/logout", {
    method: "POST",
    headers: authHeaders(token),
  });
}

interface ListAdminStudentsOptions {
  electionId?: number;
  status?: string;
  search?: string;
  page?: number;
  perPage?: number;
  signal?: AbortSignal;
}

function listAdminStudents(
  token: string,
  options: ListAdminStudentsOptions = {},
): Promise<StudentsResponse> {
  const params = new URLSearchParams();
  if (options.electionId !== undefined) {
    params.set("election_id", String(options.electionId));
  }
  if (options.status) params.set("status", options.status);
  if (options.search) params.set("search", options.search);
  if (options.page !== undefined) params.set("page", String(options.page));
  if (options.perPage !== undefined) params.set("per_page", String(options.perPage));
  const query = params.size > 0 ? `?${params.toString()}` : "";

  return apiRequest<StudentsResponse>(`/admin/students${query}`, {
    headers: authHeaders(token),
    cache: "no-store",
    signal: options.signal,
  });
}

export async function listAllAdminStudents(
  token: string,
  options: Omit<ListAdminStudentsOptions, "page" | "perPage"> = {},
): Promise<VoterRecord[]> {
  const students: VoterRecord[] = [];
  let page = 1;

  while (true) {
    const response = await listAdminStudents(token, {
      ...options,
      page,
      perPage: 100,
    });
    students.push(...response.data);

    if (page >= response.last_page) return students;
    page += 1;
  }
}

export function listAdminPositions(
  token: string,
  electionId: number,
): Promise<PositionsResponse> {
  return apiRequest<PositionsResponse>(`/admin/positions?election_id=${electionId}`, {
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
