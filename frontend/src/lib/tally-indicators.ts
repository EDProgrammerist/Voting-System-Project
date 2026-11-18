import type { VoterTallyResponse } from "@/types/voter";

type Candidate = VoterTallyResponse["positions"][number]["candidates"][number];

export const CLOSE_RACE_VOTE_GAP = 5;

export function getStableCandidates(candidates: Candidate[]): Candidate[] {
  return [...candidates].sort(
    (a, b) =>
      a.team.localeCompare(b.team) ||
      a.student_id.localeCompare(b.student_id, undefined, { numeric: true }),
  );
}

export function getVoteIncreases(
  current: VoterTallyResponse,
  previous: VoterTallyResponse | null,
): Record<string, number> {
  if (
    !previous ||
    current.election.id !== previous.election.id ||
    current.election.status !== "active"
  )
    return {};
  const counts = new Map<string, number>(
    previous.positions.flatMap((position) =>
      position.candidates.map(
        (candidate) =>
          [`${position.id}:${candidate.student_id}`, candidate.votes] as const,
      ),
    ),
  );
  const increases: Record<string, number> = {};
  for (const position of current.positions) {
    for (const candidate of position.candidates) {
      const key = `${position.id}:${candidate.student_id}`;
      const oldCount = counts.get(key);
      if (oldCount !== undefined && candidate.votes > oldCount)
        increases[key] = candidate.votes - oldCount;
    }
  }
  return increases;
}

export function getCloseChallenger(
  candidate: Candidate,
  candidates: Candidate[],
) {
  if (candidate.votes === 0) return null;
  const challenger = candidates
    .filter(
      (other) =>
        other.student_id !== candidate.student_id &&
        other.votes <= candidate.votes,
    )
    .sort((a, b) => b.votes - a.votes)[0];
  if (!challenger) return null;
  const gap = candidate.votes - challenger.votes;
  return gap <= CLOSE_RACE_VOTE_GAP ? { candidate: challenger, gap } : null;
}
