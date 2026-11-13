import type {
  VoterElection,
  VoterIdentity,
  VoterSelection,
  VoterQrEntry,
} from "@/types/voter";

const VOTER_TOKEN_KEY = "voter_access_token";
const VOTER_IDENTITY_KEY = "voter_identity";
const VOTER_ELECTION_KEY = "voter_election";
const VOTER_DRAFT_KEY = "voter_ballot_draft";
const VOTER_TALLY_ONLY_KEY = "voter_tally_only";
const VOTER_PASSWORD_REQUIRED_KEY = "voter_password_change_required";
const VOTER_QR_ENTRY_KEY = "voter_qr_entry";
const VOTER_ACCESS_EVENT = "voter-access-change";

export function subscribeVoterAccess(listener: () => void): () => void {
  window.addEventListener(VOTER_ACCESS_EVENT, listener);
  return () => window.removeEventListener(VOTER_ACCESS_EVENT, listener);
}

export function getVoterQrEntry(): VoterQrEntry | null {
  try {
    const value: unknown = JSON.parse(
      sessionStorage.getItem(VOTER_QR_ENTRY_KEY) ?? "null",
    );
    if (
      value &&
      typeof value === "object" &&
      "code" in value &&
      typeof value.code === "string" &&
      "election" in value &&
      value.election &&
      typeof value.election === "object" &&
      "id" in value.election &&
      typeof value.election.id === "number" &&
      "name" in value.election &&
      typeof value.election.name === "string"
    )
      return value as VoterQrEntry;
  } catch {
    /* An invalid saved scan is discarded. */
  }
  sessionStorage.removeItem(VOTER_QR_ENTRY_KEY);
  return null;
}

export function setVoterQrEntry(entry: VoterQrEntry): void {
  sessionStorage.setItem(VOTER_QR_ENTRY_KEY, JSON.stringify(entry));
}

export function clearVoterQrEntry(): void {
  sessionStorage.removeItem(VOTER_QR_ENTRY_KEY);
}

export function isVoterPasswordRequired(): boolean {
  return sessionStorage.getItem(VOTER_PASSWORD_REQUIRED_KEY) === "true";
}

export function setVoterPasswordRequired(value: boolean): void {
  sessionStorage.setItem(VOTER_PASSWORD_REQUIRED_KEY, String(value));
  window.dispatchEvent(new Event(VOTER_ACCESS_EVENT));
}

export function syncVoterElection(election: VoterElection): void {
  if (getVoterElection()?.id !== election.id)
    sessionStorage.removeItem(VOTER_DRAFT_KEY);
  sessionStorage.setItem(VOTER_ELECTION_KEY, JSON.stringify(election));
}

export function isVoterTallyOnly(): boolean {
  return sessionStorage.getItem(VOTER_TALLY_ONLY_KEY) === "true";
}

export function setVoterTallyOnly(value: boolean): void {
  sessionStorage.setItem(VOTER_TALLY_ONLY_KEY, String(value));
  if (value) sessionStorage.removeItem(VOTER_DRAFT_KEY);
  window.dispatchEvent(new Event(VOTER_ACCESS_EVENT));
}

export function saveVoterSession(
  token: string,
  student: VoterIdentity,
  election: VoterElection,
  tallyOnly = false,
  passwordRequired = false,
): void {
  sessionStorage.removeItem(VOTER_DRAFT_KEY);
  setVoterTallyOnly(tallyOnly);
  setVoterPasswordRequired(passwordRequired);
  sessionStorage.setItem(VOTER_TOKEN_KEY, token);
  sessionStorage.setItem(VOTER_IDENTITY_KEY, JSON.stringify(student));
  sessionStorage.setItem(VOTER_ELECTION_KEY, JSON.stringify(election));
}

export function clearVoterSession(): void {
  clearVoterQrEntry();
  sessionStorage.removeItem(VOTER_PASSWORD_REQUIRED_KEY);
  sessionStorage.removeItem(VOTER_TALLY_ONLY_KEY);
  sessionStorage.removeItem(VOTER_TOKEN_KEY);
  sessionStorage.removeItem(VOTER_IDENTITY_KEY);
  sessionStorage.removeItem(VOTER_ELECTION_KEY);
  sessionStorage.removeItem(VOTER_DRAFT_KEY);
}

export function getVoterToken(): string | null {
  return sessionStorage.getItem(VOTER_TOKEN_KEY);
}

function getVoterElection(): VoterElection | null {
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
