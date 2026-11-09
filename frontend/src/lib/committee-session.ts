import type { CommitteeUser } from "@/types/committee";
export function getCommitteeToken(): string | null {
  return sessionStorage.getItem("committee_access_token");
}
export function getCommitteeUser(): CommitteeUser | null {
  try {
    return JSON.parse(
      sessionStorage.getItem("committee_user") ?? "null",
    ) as CommitteeUser | null;
  } catch {
    return null;
  }
}
export function saveCommitteeSession(token: string, user: CommitteeUser): void {
  sessionStorage.setItem("committee_access_token", token);
  sessionStorage.setItem("committee_user", JSON.stringify(user));
}
export function clearCommitteeSession(): void {
  sessionStorage.removeItem("committee_access_token");
  sessionStorage.removeItem("committee_user");
}
