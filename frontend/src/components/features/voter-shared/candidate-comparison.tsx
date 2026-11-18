import { useEffect, useRef } from "react";
import { X } from "@phosphor-icons/react";
import type { BallotPosition } from "@/types/voter";
import { LineupCandidateProfile, PartylistBanner } from "./candidate-lineup";
import { partyLabel } from "./candidate-utils";
import "./candidate-comparison.css";

export function CandidateComparison({
  position,
  onClose,
}: {
  position: BallotPosition;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = `comparison-title-${position.id}`;
  useEffect(() => {
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    const current = dialog.current;
    document.body.style.overflow = "hidden";
    current?.showModal();
    return () => {
      current?.close();
      document.body.style.overflow = overflow;
      if (previous instanceof HTMLElement && previous.isConnected)
        previous.focus();
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      className="candidate-comparison"
      aria-labelledby={titleId}
      aria-describedby={`comparison-help-${position.id}`}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <header className="candidate-comparison__heading">
        <h2 id={titleId}>Compare candidates for {position.name}</h2>
        <button
          type="button"
          aria-label="Close comparison"
          onClick={onClose}
          autoFocus
        >
          <X aria-hidden="true" />
        </button>
      </header>
      <div className="candidate-comparison__body">
        <p
          className="candidate-comparison__help"
          id={`comparison-help-${position.id}`}
        >
          Compare candidate backgrounds and achievements side by side. Browsing
          here does not change your vote.
        </p>
        <div className="candidate-lineup">
          {position.candidates.map((candidate, index) => (
            <article
              className="lineup-party"
              data-tone={
                candidate.team === "TEAM_A"
                  ? "blue"
                  : candidate.team === "TEAM_B"
                    ? "red"
                    : index === 0
                      ? "red"
                      : "blue"
              }
              data-mirrored={index % 2 === 1}
              key={candidate.student_id}
              aria-label={candidate.full_name}
            >
              <header className="lineup-party__heading">
                <PartylistBanner candidate={candidate} />
                <h3>{partyLabel(candidate.team, candidate.partylist?.name)}</h3>
              </header>
              <LineupCandidateProfile
                candidate={candidate}
                position={position.name}
              />
            </article>
          ))}
        </div>
      </div>
    </dialog>
  );
}
