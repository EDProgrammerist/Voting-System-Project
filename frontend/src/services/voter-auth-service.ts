import { apiRequest } from "@/services/api-client";
import type {
  VoterBallotResponse,
  VoterLoginCredentials,
  VoterLoginResponse,
  VoterVotePayload,
  VoterVoteResponse,
  VoterTallyResponse,
  VoterSessionResponse,
} from "@/types/voter";

export function getVoterSession(
  token: string,
  signal?: AbortSignal,
): Promise<VoterSessionResponse> {
  return apiRequest("/voter/session", {
    headers: { Authorization: `Bearer ${token}` },
    signal,
    cache: "no-store",
  });
}

export function createVoterPassword(
  token: string,
  password: string,
  confirmation: string,
): Promise<VoterLoginResponse> {
  return apiRequest("/voter/password", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ password, password_confirmation: confirmation }),
  });
}

export function getVoterTally(
  token: string,
  signal?: AbortSignal,
): Promise<VoterTallyResponse> {
  return apiRequest<VoterTallyResponse>("/voter/tally", {
    headers: { Authorization: `Bearer ${token}` },
    signal,
    cache: "no-store",
  });
}

export function logoutVoter(token: string): Promise<{ message: string }> {
  return apiRequest("/voter/logout", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function loginVoter(
  credentials: VoterLoginCredentials,
): Promise<VoterLoginResponse> {
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

export function submitVoterVote(
  token: string,
  payload: VoterVotePayload,
): Promise<VoterVoteResponse> {
  return apiRequest<VoterVoteResponse>("/voter/vote", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
}
