<<<<<<< HEAD
import { partyLabel } from "@/components/features/voter-shared/candidate-utils";
import { ArrowRight, Check, CheckCircle, Clock, UsersThree } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";

=======
import { Check } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";

import campusBackground from "@/assets/campus-admin-bg.png";
import { VOTER_BALLOT_PREVIEW } from "@/data/voter-ballot-preview";
>>>>>>> 74a2d47d756131abb6859b220084adc37dafd18d
import { useDocumentTitle } from "@/hooks/use-document-title";
import { getVoterDraft, getVoterToken, saveVoterDraft } from "@/lib/voter-session";
import { getVoterBallot } from "@/services/voter-auth-service";
import type { BallotCandidate, BallotPosition, VoterBallotResponse, VoterSelection } from "@/types/voter";

import "./voter-ballot-screen.css";
<<<<<<< HEAD
import { BallotSteps, CandidateAvatar, StudentLayout } from "@/components/features/voter-shared/student-layout";
import { CandidateComparison } from "@/components/features/voter-shared/candidate-comparison";
=======
>>>>>>> 74a2d47d756131abb6859b220084adc37dafd18d

type SelectionMap = Record<number, string[]>;

function displayPosition(name: string): string {
<<<<<<< HEAD
  if (name.toLowerCase() === "vice president") return "Vice President";
=======
  if (name.toLowerCase() === "vice president") return "Vice - President";
>>>>>>> 74a2d47d756131abb6859b220084adc37dafd18d
  if (name.toLowerCase() === "senator") return "Senators";
  return name;
}

export function VoterBallotScreen() {
  const navigate = useNavigate();
  const token = getVoterToken();
<<<<<<< HEAD
  const [ballot, setBallot] = useState<VoterBallotResponse | null>(null);
=======
  const [ballot, setBallot] = useState<VoterBallotResponse>(VOTER_BALLOT_PREVIEW);
>>>>>>> 74a2d47d756131abb6859b220084adc37dafd18d
  const [selections, setSelections] = useState<SelectionMap>(() =>
    getVoterDraft().reduce<SelectionMap>((current, selection) => {
      current[selection.position_id] = [
        ...(current[selection.position_id] ?? []),
        selection.candidate_student_id,
      ];
      return current;
    }, {}),
  );
<<<<<<< HEAD
  const [loading, setLoading] = useState(true);
=======
  const [loading, setLoading] = useState(Boolean(token));
>>>>>>> 74a2d47d756131abb6859b220084adc37dafd18d
  const [message, setMessage] = useState("");

  useDocumentTitle("Vote | CPC Vote");

  useEffect(() => {
<<<<<<< HEAD
    saveVoterDraft(Object.entries(selections).flatMap(([positionId, candidates]) => candidates.map((id) => ({ position_id: Number(positionId), candidate_student_id: id }))));
  }, [selections]);

  useEffect(() => {
    if (!token) return;

=======
    if (!token) return;
>>>>>>> 74a2d47d756131abb6859b220084adc37dafd18d
    let active = true;
    getVoterBallot(token)
      .then((response) => { if (active) setBallot(response); })
      .catch((error: unknown) => {
        if (active) setMessage(error instanceof Error ? error.message : "Unable to load your ballot.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [token]);

<<<<<<< HEAD
  if (loading) {
    return <main className="student-loading" aria-live="polite">Loading your ballot…</main>;
  }

  if (!ballot) {
    return (
      <main className="student-loading" aria-live="polite">
        {message || "Unable to load your ballot."}
      </main>
    );
  }

  const loadedBallot = ballot;
  const completedPositions = loadedBallot.positions.filter((position) => (selections[position.id]?.length ?? 0) > 0).length;
  const canReview = loadedBallot.can_submit_vote && loadedBallot.positions.length > 0 && completedPositions === loadedBallot.positions.length;
=======
  const topPositions = ballot.positions.slice(0, 2);
  const remainingPositions = ballot.positions.slice(2);
>>>>>>> 74a2d47d756131abb6859b220084adc37dafd18d
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
<<<<<<< HEAD
    if (!loadedBallot.can_submit_vote) return;
    const missing = loadedBallot.positions.filter((position) =>
=======
    const missing = ballot.positions.filter((position) =>
>>>>>>> 74a2d47d756131abb6859b220084adc37dafd18d
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

<<<<<<< HEAD
  return (
    <StudentLayout title="Voting Ballot" description="Choose your representatives with confidence. Compare their profiles, make your selections, then review your ballot.">
      <BallotSteps />
      {!loadedBallot.can_submit_vote && <div className="student-notice" role="status"><Clock aria-hidden="true" weight="light" /><div><strong>Take a look around</strong><p>You can browse the ballot and candidate profiles now. Vote submission becomes available when the election opens and candidates are ready.</p></div></div>}
      <div className="ballot-layout">
        <div className="ballot-offices">{loadedBallot.positions.map((position) => <PositionGroup key={position.id} position={position} selected={selections[position.id] ?? []} toggle={toggleCandidate} />)}</div>
        <aside className="ballot-summary" aria-label="Your ballot summary">
          <div className="ballot-summary__title"><CheckCircle aria-hidden="true" weight="light" /><h2>Your ballot</h2></div>
          <p className="ballot-summary__count"><strong>{completedPositions}</strong> of {loadedBallot.positions.length} positions selected</p>
          <ul>{loadedBallot.positions.map((position) => {
            const chosen = position.candidates.filter((candidate) => selections[position.id]?.includes(candidate.student_id));
            return <li key={position.id} data-complete={chosen.length > 0}><CheckCircle aria-hidden="true" weight={chosen.length ? "fill" : "light"} /><div><strong>{displayPosition(position.name)}</strong><span>{chosen.length ? chosen.map((candidate) => candidate.full_name).join(", ") : "No selection yet"}</span></div></li>;
          })}</ul>
          <button className="student-button" disabled={!canReview} onClick={handleReview} type="button">Review Vote<ArrowRight aria-hidden="true" /></button>
          <p className="ballot-summary__help">{!loadedBallot.can_submit_vote ? "You can explore while the election is being prepared." : canReview ? "You can still make changes on the next screen." : "Select at least one candidate for each position to continue."}</p>
          <p aria-live="polite" className="student-error" role="status">{message}</p>
        </aside>
      </div>
    </StudentLayout>
  );
}


=======
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

>>>>>>> 74a2d47d756131abb6859b220084adc37dafd18d
function PositionGroup({
  position,
  selected,
  toggle,
<<<<<<< HEAD
=======
  wide = false,
>>>>>>> 74a2d47d756131abb6859b220084adc37dafd18d
}: {
  position: BallotPosition;
  selected: string[];
  toggle: (position: BallotPosition, candidate: BallotCandidate) => void;
<<<<<<< HEAD
}) {
  return (
    <section className="ballot-position">
      <header className="ballot-position__heading"><div><h2>{displayPosition(position.name)}</h2><p>Select up to {position.max_selections} {position.max_selections === 1 ? "candidate" : "candidates"}</p></div><span className="ballot-position__counter" data-complete={selected.length > 0}>{selected.length} / {position.max_selections} selected</span></header>
      <div className="ballot-position__options">
        {position.candidates.map((candidate) => {
          const checked = selected.includes(candidate.student_id);
          return <button aria-pressed={checked} className="ballot-option" data-checked={checked} key={candidate.student_id} onClick={() => toggle(position, candidate)} type="button">
            <CandidateAvatar name={candidate.full_name} photo={candidate.profile_photo_url} />
            <span className="ballot-option__identity"><strong>{candidate.full_name}</strong><small>{partyLabel(candidate.team)}</small></span>
            <span aria-hidden="true" className="ballot-option__check">{checked && <Check weight="bold" />}</span>
          </button>;
        })}
      </div>
      {position.candidates.length === 0 && <div className="student-empty"><UsersThree aria-hidden="true" weight="light" /><div><h3>Candidates coming soon</h3><p>No candidates have been added yet.</p></div></div>}
      <CandidateComparison position={position} />
=======
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
>>>>>>> 74a2d47d756131abb6859b220084adc37dafd18d
    </section>
  );
}
