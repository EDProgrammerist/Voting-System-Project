import { apiDownload, apiRequest } from "@/services/api-client";
import type { AdminLoginCredentials } from "@/types/admin";
import type {
  ClassListInspection,
  ClassListPreview,
  ClassListResult,
  CommitteeLoginResponse,
  ClassSection,
  SectionsResponse,
} from "@/types/committee";
import type { ElectionsResponse } from "@/types/dashboard";
import type { StudentsResponse, VoterRecord } from "@/types/student";
const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
export const COMMITTEE_COURSES_CHANGED = "committee-courses-changed";

export function listCommitteeCourses(token: string, signal?: AbortSignal): Promise<{data: string[]}> {
  return apiRequest("/committee/courses", {headers: auth(token), signal, cache: "no-store"});
}
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
  options: { electionId?: number; sectionId?: number; status?: string; signal?: AbortSignal } = {},
): Promise<VoterRecord[]> {
  const records: VoterRecord[] = [];
  let page = 1;
  while (true) {
    const params = new URLSearchParams({ page: String(page), per_page: "100" });
    if (options.electionId !== undefined)
      params.set("election_id", String(options.electionId));
    if (options.status) params.set("status", options.status);
    if (options.sectionId !== undefined) params.set("section_id", String(options.sectionId));
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
  electionId?: number,
  sectionId?: number,
): Promise<ClassListPreview> {
  const body = new FormData();
  body.set("file", file);
  if (worksheet) body.set("worksheet", worksheet);
  if (electionId !== undefined) body.set("election_id", String(electionId));
  if (sectionId !== undefined) body.set("section_id", String(sectionId));
  return apiRequest("/committee/class-list/preview", {
    method: "POST",
    headers: auth(token),
    body,
    signal,
  });
}
export async function commitClassList(
  token: string,
  id: string,
  numericIdsConfirmed = false,
): Promise<ClassListResult> {
  const result = await apiRequest<ClassListResult>(`/committee/class-list/${encodeURIComponent(id)}/commit`, {
    method: "POST",
    headers: auth(token),
    body: JSON.stringify({ numeric_ids_confirmed: numericIdsConfirmed }),
  });
  window.dispatchEvent(new Event(COMMITTEE_COURSES_CHANGED));
  return result;
}

export function listCommitteeSections(token: string, electionId?: number, signal?: AbortSignal): Promise<SectionsResponse> {
  const params = new URLSearchParams();
  if (electionId !== undefined) params.set("election_id", String(electionId));
  return apiRequest(`/committee/sections?${params}`, { headers: auth(token), signal, cache: "no-store" });
}

export async function createCommitteeSection(token: string, section: {course: string; year_level: number; name: string}): Promise<{data: ClassSection}> {
  const result = await apiRequest<{data: ClassSection}>("/committee/sections", { method: "POST", headers: auth(token), body: JSON.stringify(section) });
  window.dispatchEvent(new Event(COMMITTEE_COURSES_CHANGED));
  return result;
}

export function exportCommitteeSection(token: string, sectionId: number, electionId?: number): Promise<Blob> {
  const params = new URLSearchParams();
  if (electionId !== undefined) params.set("election_id", String(electionId));
  return apiDownload(`/committee/sections/${sectionId}/export?${params}`, { headers: auth(token), cache: "no-store" });
}
