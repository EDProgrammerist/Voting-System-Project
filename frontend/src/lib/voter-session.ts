import type { VoterElection, VoterIdentity, VoterSelection } from "@/types/voter";

const VOTER_TOKEN_KEY = "voter_access_token";
const VOTER_IDENTITY_KEY = "voter_identity";
const VOTER_ELECTION_KEY = "voter_election";
const VOTER_DRAFT_KEY = "voter_ballot_draft";

export function saveVoterSession(
  token: string,
  student: VoterIdentity,
  election: VoterElection,
): void {
  sessionStorage.setItem(VOTER_TOKEN_KEY, token);
  sessionStorage.setItem(VOTER_IDENTITY_KEY, JSON.stringify(student));
  sessionStorage.setItem(VOTER_ELECTION_KEY, JSON.stringify(election));
}

export function clearVoterSession(): void {
  sessionStorage.removeItem(VOTER_TOKEN_KEY);
  sessionStorage.removeItem(VOTER_IDENTITY_KEY);
  sessionStorage.removeItem(VOTER_ELECTION_KEY);
  sessionStorage.removeItem(VOTER_DRAFT_KEY);
}

export function getVoterToken(): string | null {
  return sessionStorage.getItem(VOTER_TOKEN_KEY);
}

export function getVoterElection(): VoterElection | null {
  const value = sessionStorage.getItem(VOTER_ELECTION_KEY);
  if (!value) return null;

  try {
    return JSON.parse(value) as VoterElection;
  } catch {
    sessionStorage.removeItem(VOTER_ELECTION_KEY);
    return null;
  }
}

export function getVoterDraft(): VoterSelection[] {
  const value = sessionStorage.getItem(VOTER_DRAFT_KEY);
  if (!value) return [];

  try {
    const draft = JSON.parse(value) as unknown;
    return Array.isArray(draft) ? (draft as VoterSelection[]) : [];
  } catch {
    sessionStorage.removeItem(VOTER_DRAFT_KEY);
    return [];
  }
}

export function saveVoterDraft(selections: VoterSelection[]): void {
  sessionStorage.setItem(VOTER_DRAFT_KEY, JSON.stringify(selections));
}
