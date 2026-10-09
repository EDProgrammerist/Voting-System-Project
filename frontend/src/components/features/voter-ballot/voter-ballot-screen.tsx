import { Check } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";

import campusBackground from "@/assets/campus-admin-bg.png";
import { VOTER_BALLOT_PREVIEW } from "@/data/voter-ballot-preview";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { getVoterDraft, getVoterToken, saveVoterDraft } from "@/lib/voter-session";
import { getVoterBallot } from "@/services/voter-auth-service";
import type { BallotCandidate, BallotPosition, VoterBallotResponse, VoterSelection } from "@/types/voter";

import "./voter-ballot-screen.css";

type SelectionMap = Record<number, string[]>;

function displayPosition(name: string): string {
  if (name.toLowerCase() === "vice president") return "Vice - President";
  if (name.toLowerCase() === "senator") return "Senators";
  return name;
}

export function VoterBallotScreen() {
  const navigate = useNavigate();
  const token = getVoterToken();
  const [ballot, setBallot] = useState<VoterBallotResponse>(VOTER_BALLOT_PREVIEW);
  const [selections, setSelections] = useState<SelectionMap>(() =>
    getVoterDraft().reduce<SelectionMap>((current, selection) => {
      current[selection.position_id] = [
        ...(current[selection.position_id] ?? []),
        selection.candidate_student_id,
      ];
      return current;
    }, {}),
  );
  const [loading, setLoading] = useState(Boolean(token));
  const [message, setMessage] = useState("");

  useDocumentTitle("Vote | CPC Vote");

  useEffect(() => {
    if (!token) return;
    let active = true;
    getVoterBallot(token)
      .then((response) => { if (active) setBallot(response); })
      .catch((error: unknown) => {
        if (active) setMessage(error instanceof Error ? error.message : "Unable to load your ballot.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [token]);

  const topPositions = ballot.positions.slice(0, 2);
  const remainingPositions = ballot.positions.slice(2);
  function toggleCandidate(position: BallotPosition, candidate: BallotCandidate) {
    setMessage("");
    setSelections((current) => {
      const selected = current[position.id] ?? [];
      if (position.max_selections === 1) {
        return { ...current, [position.id]: selected[0] === candidate.student_id ? [] : [candidate.student_id] };
      }
      if (selected.includes(candidate.student_id)) {
        return { ...current, [position.id]: selected.filter((id) => id !== candidate.student_id) };
      }
      if (selected.length >= position.max_selections) {
        setMessage(`You can select up to ${position.max_selections} candidates for ${displayPosition(position.name)}.`);
        return current;
      }
      return { ...current, [position.id]: [...selected, candidate.student_id] };
    });
  }

  function handleReview() {
    const missing = ballot.positions.filter((position) =>
      position.candidates.length > 0 && (selections[position.id]?.length ?? 0) === 0,
    );
    if (missing.length > 0) {
      setMessage(`Choose at least one candidate for ${missing.map((position) => displayPosition(position.name)).join(", ")}.`);
      return;
    }

    const draft: VoterSelection[] = Object.entries(selections).flatMap(([positionId, candidates]) =>
      candidates.map((candidateId) => ({
        position_id: Number(positionId),
        candidate_student_id: candidateId,
      })),
    );
    saveVoterDraft(draft);
    navigate("/voter/review");
  }

  if (loading) {
    return <main className="voter-ballot voter-ballot--loading" aria-live="polite">Loading your ballot…</main>;
  }

  return (
    <main className="voter-ballot">
      <img alt="" className="voter-ballot__background" src={campusBackground} />
      <div className="voter-ballot__overlay" />
      <div className="voter-ballot__content">
        <section className="voter-ballot__top" aria-label="Executive positions">
          {topPositions.map((position) => (
            <PositionGroup key={position.id} position={position} selected={selections[position.id] ?? []} toggle={toggleCandidate} />
          ))}
        </section>

        {remainingPositions.map((position) => (
          <PositionGroup key={position.id} position={position} selected={selections[position.id] ?? []} toggle={toggleCandidate} wide />
        ))}

        <button className="voter-ballot__review" onClick={handleReview} type="button">Review Vote</button>
        <p aria-live="polite" className="voter-ballot__status" role="status">{message}</p>
      </div>
    </main>
  );
}

function PositionGroup({
  position,
  selected,
  toggle,
  wide = false,
}: {
  position: BallotPosition;
  selected: string[];
  toggle: (position: BallotPosition, candidate: BallotCandidate) => void;
  wide?: boolean;
}) {
  return (
    <section className={wide ? "ballot-position ballot-position--wide" : "ballot-position"}>
      <h2>{displayPosition(position.name)}</h2>
      <p className="sr-only">Select up to {position.max_selections}</p>
      <div className="ballot-position__options">
        {position.candidates.map((candidate) => {
          const checked = selected.includes(candidate.student_id);
          return (
            <button
              aria-pressed={checked}
              className="ballot-option"
              data-checked={checked}
              key={candidate.student_id}
              onClick={() => toggle(position, candidate)}
              type="button"
            >
              {wide && <span className="ballot-option__check" aria-hidden="true">{checked && <Check weight="bold" />}</span>}
              <strong>{candidate.full_name}</strong>
              <small>{candidate.team === "TEAM_A" ? "Partylist A" : candidate.team === "TEAM_B" ? "Partylist B" : candidate.team}</small>
              {!wide && checked && <Check aria-hidden="true" className="ballot-option__selected" weight="bold" />}
            </button>
          );
        })}
      </div>
    </section>
  );
}
