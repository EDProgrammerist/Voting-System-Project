import { apiRequest } from "@/services/api-client";
import type {
  VoterBallotResponse,
  VoterLoginCredentials,
  VoterLoginResponse,
  VoterVotePayload,
  VoterVoteResponse,
<<<<<<< HEAD
  VoterTallyResponse,
} from "@/types/voter";

export function getVoterTally(token: string, signal?: AbortSignal): Promise<VoterTallyResponse> {
  return apiRequest<VoterTallyResponse>("/voter/tally", { headers: { Authorization: `Bearer ${token}` }, signal, cache: "no-store" });
}

export function logoutVoter(token: string): Promise<{ message: string }> {
  return apiRequest("/voter/logout", { method: "POST", headers: { Authorization: `Bearer ${token}` } });
}

=======
} from "@/types/voter";

>>>>>>> 74a2d47d756131abb6859b220084adc37dafd18d
export function loginVoter(credentials: VoterLoginCredentials): Promise<VoterLoginResponse> {
  return apiRequest<VoterLoginResponse>("/voter/login", {
    method: "POST",
    body: JSON.stringify(credentials),
  });
}

export function getVoterBallot(token: string): Promise<VoterBallotResponse> {
  return apiRequest<VoterBallotResponse>("/voter/ballot", {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function submitVoterVote(token: string, payload: VoterVotePayload): Promise<VoterVoteResponse> {
  return apiRequest<VoterVoteResponse>("/voter/vote", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
}
