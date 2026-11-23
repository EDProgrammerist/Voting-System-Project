const ELECTION_KEY = "admin_election_id";
const ELECTION_EVENT = "admin-election-change";

export function getAdminElectionId(): number | null {
  const value = Number(sessionStorage.getItem(ELECTION_KEY));
  return Number.isSafeInteger(value) && value > 0 ? value : null;
}

export function selectAdminElection(id: number): void {
  if (!Number.isSafeInteger(id) || id <= 0 || getAdminElectionId() === id)
    return;
  sessionStorage.setItem(ELECTION_KEY, String(id));
  window.dispatchEvent(new Event(ELECTION_EVENT));
}

export function clearAdminElection(): void {
  sessionStorage.removeItem(ELECTION_KEY);
  window.dispatchEvent(new Event(ELECTION_EVENT));
}

export function subscribeAdminElection(listener: () => void): () => void {
  window.addEventListener(ELECTION_EVENT, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(ELECTION_EVENT, listener);
    window.removeEventListener("storage", listener);
  };
}
