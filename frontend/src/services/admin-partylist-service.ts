import { apiRequest } from "@/services/api-client";
import type { PartylistRecord, PartylistsResponse } from "@/types/partylist";

export function deleteAdminPartylist(
  token: string,
  id: number,
): Promise<{ message: string }> {
  return apiRequest(`/admin/partylists/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function listAdminPartylists(
  token: string,
  electionId: number,
  signal?: AbortSignal,
): Promise<PartylistsResponse> {
  return apiRequest(`/admin/partylists?election_id=${electionId}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
    signal,
  });
}

export function saveAdminPartylist(
  token: string,
  payload: FormData,
  id?: number,
): Promise<{ message: string; data: PartylistRecord }> {
  if (id !== undefined) payload.set("_method", "PUT");
  return apiRequest(
    id === undefined ? "/admin/partylists" : `/admin/partylists/${id}`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: payload,
    },
  );
}
