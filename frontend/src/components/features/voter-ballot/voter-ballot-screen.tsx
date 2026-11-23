import { partyLabel } from "@/components/features/voter-shared/candidate-utils";
import { ArrowRight, Check, CheckCircle, Clock, UsersThree } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";

import { useDocumentTitle } from "@/hooks/use-document-title";
import { getVoterDraft, getVoterToken, saveVoterDraft } from "@/lib/voter-session";
import { useVoterBallot } from "@/hooks/use-voter-ballot";
import type { BallotCandidate, BallotPosition, VoterSelection } from "@/types/voter";

import "./voter-ballot-screen.css";
import { BallotSteps, CandidateAvatar, StudentLayout } from "@/components/features/voter-shared/student-layout";
import { CandidateComparison } from "@/components/features/voter-shared/candidate-comparison";
import { BallotReference } from "@/components/features/voter-shared/ballot-reference";
import { PageSkeleton } from "@/components/common/page-skeleton";

type SelectionMap = Record<number, string[]>;

function displayPosition(name: string): string {
  if (name.toLowerCase() === "vice president") return "Vice President";
  if (name.toLowerCase() === "senator") return "Senators";
  return name;
}

export function VoterBallotScreen() {
  const navigate = useNavigate();
  const token = getVoterToken();
  const { ballot, loading, error: ballotError } = useVoterBallot(token);
  const [selections, setSelections] = useState<SelectionMap>(() =>
    getVoterDraft().reduce<SelectionMap>((current, selection) => {
      current[selection.position_id] = [
        ...(current[selection.position_id] ?? []),
        selection.candidate_student_id,
      ];
      return current;
    }, {}),
  );
  const [message, setMessage] = useState("");

  useDocumentTitle("Vote | CPC Vote");

  useEffect(() => {
    saveVoterDraft(Object.entries(selections).flatMap(([positionId, candidates]) => candidates.map((id) => ({ position_id: Number(positionId), candidate_student_id: id }))));
  }, [selections]);

  if (loading) {
    return <PageSkeleton kind="ballot" label="Loading your ballot" />;
  }

  if (!ballot) {
    return (
      <section className="student-empty" role="alert">
        {ballotError || message || "Unable to load your ballot."}
      </section>
    );
  }

  const loadedBallot = ballot;
  const completedPositions = loadedBallot.positions.filter((position) => (selections[position.id]?.length ?? 0) > 0).length;
  const canReview = loadedBallot.can_submit_vote && !ballotError && loadedBallot.positions.length > 0;
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
    if (!canReview) return;
    const draft: VoterSelection[] = Object.entries(selections).flatMap(([positionId, candidates]) =>
      candidates.map((candidateId) => ({
        position_id: Number(positionId),
        candidate_student_id: candidateId,
      })),
    );
    saveVoterDraft(draft);
    navigate("/voter/review");
  }

  return (
    <StudentLayout title="Voting Ballot" description="Choose your representatives with confidence. Compare their profiles, make your selections, then review your ballot.">
      <BallotSteps />
      <BallotReference reference={loadedBallot.ballot_reference} />
      {!loadedBallot.can_submit_vote && <div className="student-notice" role="status"><Clock aria-hidden="true" weight="light" /><div><strong>Take a look around</strong><p>You can browse the ballot and candidate profiles now. Vote submission becomes available when the election opens and candidates are ready.</p></div></div>}
      <div className="ballot-layout">
        <div className="ballot-offices">{loadedBallot.positions.map((position) => <PositionGroup key={position.id} position={position} selected={selections[position.id] ?? []} toggle={toggleCandidate} />)}</div>
        <aside className="ballot-summary" aria-label="Your ballot summary">
          <div className="ballot-summary__title"><CheckCircle aria-hidden="true" weight="light" /><h2>Your ballot</h2></div>
          <p className="ballot-summary__count"><strong>{completedPositions}</strong> of {loadedBallot.positions.length} positions selected</p>
          <ul>{loadedBallot.positions.map((position) => {
            const chosen = position.candidates.filter((candidate) => selections[position.id]?.includes(candidate.student_id));
            return <li key={position.id} data-complete={chosen.length > 0}><CheckCircle aria-hidden="true" weight={chosen.length ? "fill" : "light"} /><div><strong>{displayPosition(position.name)}</strong><span>{chosen.length ? chosen.map((candidate) => candidate.full_name).join(", ") : "No selection (abstain)"}</span></div></li>;
          })}</ul>
          <button className="student-button" disabled={!canReview} onClick={handleReview} type="button">Review Vote<ArrowRight aria-hidden="true" /></button>
          <p className="ballot-summary__help">{!loadedBallot.can_submit_vote ? "You can explore while the election is being prepared." : "Selections are optional. Submitting a blank or partial ballot still records your attendance."}</p>
          <p aria-live="polite" className="student-error" role="status">{message || ballotError}</p>
        </aside>
      </div>
    </StudentLayout>
  );
}


function PositionGroup({
  position,
  selected,
  toggle,
}: {
  position: BallotPosition;
  selected: string[];
  toggle: (position: BallotPosition, candidate: BallotCandidate) => void;
}) {
  const [comparing, setComparing] = useState(false);
  return (
    <section className="ballot-position">
      <header className="ballot-position__heading"><div><h2>{displayPosition(position.name)}</h2><p>Select up to {position.max_selections} {position.max_selections === 1 ? "candidate" : "candidates"}. Click a name to compare.</p></div><span className="ballot-position__counter" data-complete={selected.length > 0}>{selected.length} / {position.max_selections} selected</span></header>
      <div className="ballot-position__options">
        {position.candidates.map((candidate) => {
          const checked = selected.includes(candidate.student_id);
          return <div className="ballot-option" data-checked={checked} key={candidate.student_id}>
            <CandidateAvatar name={candidate.full_name} photo={candidate.profile_photo_url} />
            <div className="ballot-option__identity"><button className="ballot-option__name" type="button" aria-label={`Compare candidates for ${candidate.full_name}`} aria-haspopup="dialog" onClick={() => setComparing(true)}><strong>{candidate.full_name}</strong></button><small>{partyLabel(candidate.team, candidate.partylist?.name)}</small></div>
            <button className="ballot-option__select" aria-label={`${checked ? "Deselect" : "Select"} ${candidate.full_name}`} aria-pressed={checked} onClick={() => toggle(position, candidate)} type="button"><span aria-hidden="true" className="ballot-option__check">{checked && <Check weight="bold" />}</span><span>{checked ? "Selected" : "Select"}</span></button>
          </div>;
        })}
      </div>
      {position.candidates.length === 0 && <div className="student-empty"><UsersThree aria-hidden="true" weight="light" /><div><h3>Candidates coming soon</h3><p>No candidates have been added yet.</p></div></div>}
      {comparing && <CandidateComparison position={position} onClose={() => setComparing(false)} />}
    </section>
  );
}
