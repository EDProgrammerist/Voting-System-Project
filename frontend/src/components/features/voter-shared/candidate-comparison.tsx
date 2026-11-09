import { ArrowsLeftRight, CaretDown } from "@phosphor-icons/react";
import type { BallotPosition } from "@/types/voter";
import { LineupCandidateProfile } from "./candidate-lineup";
import { partyLabel } from "./candidate-utils";
import "./candidate-comparison.css";

export function CandidateComparison({
  position,
}: {
  position: BallotPosition;
}) {
  if (position.candidates.length < 2) return null;
  return (
    <details className="candidate-comparison">
      <summary>
        <ArrowsLeftRight aria-hidden="true" weight="light" />
        <span>Compare candidates for {position.name}</span>
        <CaretDown aria-hidden="true" />
      </summary>
      <div className="candidate-comparison__body">
        <p className="candidate-comparison__help">
          Compare candidate backgrounds and achievements side by side. Browsing
          here does not change your vote.
        </p>
        <div className="candidate-lineup">
          {position.candidates.map((candidate, index) => (
            <article
              className="lineup-party"
              data-tone={
                candidate.team === "TEAM_A"
                  ? "red"
                  : candidate.team === "TEAM_B"
                    ? "blue"
                    : index === 0
                      ? "red"
                      : "blue"
              }
              data-mirrored={index % 2 === 1}
              key={candidate.student_id}
              aria-label={`Candidate ${index + 1}: ${candidate.full_name}`}
            >
              <header className="lineup-party__heading">
                <h3>{partyLabel(candidate.team)}</h3>
                <span>Candidate {index + 1}</span>
              </header>
              <LineupCandidateProfile
                candidate={candidate}
                position={position.name}
              />
            </article>
          ))}
        </div>
      </div>
    </details>
  );
}
