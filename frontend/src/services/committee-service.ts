import { apiRequest } from "@/services/api-client";
import type { AdminLoginCredentials } from "@/types/admin";
import type {
  ClassListInspection,
  ClassListPreview,
  ClassListResult,
  CommitteeLoginResponse,
} from "@/types/committee";
import type { ElectionsResponse } from "@/types/dashboard";
import type { StudentsResponse, VoterRecord } from "@/types/student";
const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
export function loginCommittee(
  credentials: AdminLoginCredentials,
): Promise<CommitteeLoginResponse> {
  return apiRequest("/committee/login", {
    method: "POST",
    body: JSON.stringify(credentials),
  });
}
export function logoutCommittee(token: string): Promise<{ message: string }> {
  return apiRequest("/committee/logout", {
    method: "POST",
    headers: auth(token),
  });
}
export function listCommitteeElections(
  token: string,
): Promise<ElectionsResponse> {
  return apiRequest("/committee/elections", {
    headers: auth(token),
    cache: "no-store",
  });
}
export async function listAllCommitteeStudents(
  token: string,
  options: { electionId?: number; status?: string; signal?: AbortSignal } = {},
): Promise<VoterRecord[]> {
  const records: VoterRecord[] = [];
  let page = 1;
  while (true) {
    const params = new URLSearchParams({ page: String(page), per_page: "100" });
    if (options.electionId !== undefined)
      params.set("election_id", String(options.electionId));
    if (options.status) params.set("status", options.status);
    const response = await apiRequest<StudentsResponse>(
      `/committee/students?${params}`,
      { headers: auth(token), signal: options.signal, cache: "no-store" },
    );
    records.push(...response.data);
    if (page >= response.last_page) return records;
    page++;
  }
}
export function inspectClassList(
  token: string,
  file: File,
  signal?: AbortSignal,
): Promise<ClassListInspection> {
  const body = new FormData();
  body.set("file", file);
  return apiRequest("/committee/class-list/inspect", {
    method: "POST",
    headers: auth(token),
    body,
    signal,
  });
}
export function previewClassList(
  token: string,
  file: File,
  worksheet?: string,
  signal?: AbortSignal,
): Promise<ClassListPreview> {
  const body = new FormData();
  body.set("file", file);
  if (worksheet) body.set("worksheet", worksheet);
  return apiRequest("/committee/class-list/preview", {
    method: "POST",
    headers: auth(token),
    body,
    signal,
  });
}
export function commitClassList(
  token: string,
  id: string,
  numericIdsConfirmed = false,
): Promise<ClassListResult> {
  return apiRequest(`/committee/class-list/${encodeURIComponent(id)}/commit`, {
    method: "POST",
    headers: auth(token),
    body: JSON.stringify({ numeric_ids_confirmed: numericIdsConfirmed }),
  });
}
