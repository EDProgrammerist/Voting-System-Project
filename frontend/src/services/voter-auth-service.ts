import { apiRequest } from "@/services/api-client";
import type {
  VoterBallotResponse,
  VoterLoginCredentials,
  VoterLoginResponse,
  VoterVotePayload,
  VoterVoteResponse,
} from "@/types/voter";

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
