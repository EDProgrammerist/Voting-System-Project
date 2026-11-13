import { partyLabel } from "./candidate-utils";
import type { BallotCandidate } from "@/types/voter";
import { CandidateAvatar } from "./student-layout";

export function CandidateProfile({ candidate }: { candidate: BallotCandidate }) {
  return <article className="student-candidate">
    <header>
      <CandidateAvatar name={candidate.full_name} photo={candidate.profile_photo_url} />
      <div><h3>{candidate.full_name}</h3><span className="party-label">{partyLabel(candidate.team, candidate.partylist?.name)}</span></div>
    </header>
    {candidate.motto && <p className="student-candidate__platform">{candidate.motto}</p>}
    <h4>Profile</h4><p>{candidate.profile || "No profile has been provided yet."}</p>
    <h4>Achievements</h4><p>{candidate.achievements || "No achievements have been provided yet."}</p>
  </article>;
}
