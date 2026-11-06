import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";

<<<<<<< HEAD
import { useDocumentTitle } from "@/hooks/use-document-title";
import {
  setVoterTallyOnly,
  getVoterDraft,
  getVoterToken,
} from "@/lib/voter-session";
import { getVoterBallot, submitVoterVote } from "@/services/voter-auth-service";
import type { BallotPosition, VoterBallotResponse, VoterSelection, SignaturePoint } from "@/types/voter";
import { CandidateProfile } from "@/components/features/voter-shared/candidate-profile";
import { VoteVerification } from "@/components/features/voter-shared/vote-verification";
import { BallotSteps, StudentLayout } from "@/components/features/voter-shared/student-layout";
import { ArrowLeft, ArrowRight, CheckCircle, LockSimple } from "@phosphor-icons/react";

import "./voter-review-screen.css";

=======
import campusBackground from "@/assets/campus-admin-bg.png";
import { VOTER_BALLOT_PREVIEW } from "@/data/voter-ballot-preview";
import { useDocumentTitle } from "@/hooks/use-document-title";
import {
  clearVoterSession,
  getVoterDraft,
  getVoterElection,
  getVoterToken,
} from "@/lib/voter-session";
import { getVoterBallot, submitVoterVote } from "@/services/voter-auth-service";
import type { BallotPosition, VoterBallotResponse, VoterSelection } from "@/types/voter";

import "./voter-review-screen.css";

function previewSelections(ballot: VoterBallotResponse): VoterSelection[] {
  return ballot.positions.flatMap((position) =>
    position.candidates.slice(0, position.max_selections).map((candidate) => ({
      position_id: position.id,
      candidate_student_id: candidate.student_id,
    })),
  );
}

>>>>>>> 74a2d47d756131abb6859b220084adc37dafd18d
function displayPosition(name: string): string {
  return name.toLowerCase() === "senator" ? "Senators" : name;
}

export function VoterReviewScreen() {
  const navigate = useNavigate();
  const token = getVoterToken();
<<<<<<< HEAD
  const storedDraft = getVoterDraft();
  const [ballot, setBallot] = useState<VoterBallotResponse | null>(null);
  const [selections] = useState<VoterSelection[]>(storedDraft);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [signature, setSignature] = useState<SignaturePoint[][]>([]);
  const [thumbmark, setThumbmark] = useState(false);
=======
  const sessionElection = getVoterElection();
  const storedDraft = getVoterDraft();
  const [ballot, setBallot] = useState<VoterBallotResponse>(VOTER_BALLOT_PREVIEW);
  const [selections] = useState<VoterSelection[]>(() =>
    storedDraft.length > 0 ? storedDraft : token ? [] : previewSelections(VOTER_BALLOT_PREVIEW),
  );
  const [loading, setLoading] = useState(Boolean(token));
  const [submitting, setSubmitting] = useState(false);
>>>>>>> 74a2d47d756131abb6859b220084adc37dafd18d
  const [message, setMessage] = useState("");

  useDocumentTitle("Review Vote | CPC Vote");

  useEffect(() => {
    if (!token) return;

    let active = true;
    getVoterBallot(token)
      .then((response) => {
        if (active) setBallot(response);
      })
      .catch((error: unknown) => {
        if (active) setMessage(error instanceof Error ? error.message : "Unable to load your ballot.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [token]);

  const reviewedPositions = useMemo(
<<<<<<< HEAD
    () => (ballot?.positions ?? []).map((position) => ({
=======
    () => ballot.positions.map((position) => ({
>>>>>>> 74a2d47d756131abb6859b220084adc37dafd18d
      ...position,
      selectedCandidates: position.candidates.filter((candidate) =>
        selections.some(
          (selection) =>
            selection.position_id === position.id &&
            selection.candidate_student_id === candidate.student_id,
        ),
      ),
    })),
<<<<<<< HEAD
    [ballot, selections],
  );

  const selectionComplete = ballot !== null
    && ballot.can_submit_vote
    && reviewedPositions.length > 0
    && reviewedPositions.every(
      (position) => position.candidates.length > 0 && position.selectedCandidates.length > 0,
    );

  async function handleConfirm() {
    if (submitting) return;
    if (signature.length === 0 || !thumbmark) {
      setMessage("Add your signature and confirm your on-screen thumbmark before submitting.");
      return;
    }
=======
    [ballot.positions, selections],
  );

  const selectionComplete = reviewedPositions.every(
    (position) => position.candidates.length === 0 || position.selectedCandidates.length > 0,
  );

  async function handleConfirm() {
>>>>>>> 74a2d47d756131abb6859b220084adc37dafd18d
    if (!selectionComplete) {
      setMessage("Your ballot is incomplete. Go back and choose at least one candidate for every position.");
      return;
    }

<<<<<<< HEAD
    if (!token || !ballot) {
      navigate("/voter/login", { replace: true });
=======
    if (!token) {
      navigate("/voter/thank-you", { replace: true });
>>>>>>> 74a2d47d756131abb6859b220084adc37dafd18d
      return;
    }

    setSubmitting(true);
    setMessage("");

    try {
      const response = await submitVoterVote(token, {
<<<<<<< HEAD
        election_id: ballot.election.id,
        selections,
        signature,
        thumbmark_confirmed: thumbmark,
      });
      setVoterTallyOnly(true);
      navigate("/voter/tally", {
=======
        election_id: sessionElection?.id ?? ballot.election.id,
        selections,
      });
      clearVoterSession();
      navigate("/voter/thank-you", {
>>>>>>> 74a2d47d756131abb6859b220084adc37dafd18d
        replace: true,
        state: { confirmationMessage: response.message },
      });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Your vote could not be submitted.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
<<<<<<< HEAD
    return <main className="student-loading" aria-live="polite">Loading your review…</main>;
  }

  if (!ballot) {
    return (
      <main className="student-loading" aria-live="polite">
        {message || "Unable to load your ballot review."}
      </main>
    );
  }

  return (
    <StudentLayout title="Review your vote" description="Take a final look at your choices. You cannot change your vote after confirming.">
      <BallotSteps review />
      <div className="review-layout">
        <div><div className="voter-review__positions">{reviewedPositions.map((position) => <ReviewPosition key={position.id} position={position} />)}</div>
          <VoteVerification signature={signature} onSignature={setSignature} thumbmark={thumbmark} onThumbmark={setThumbmark} disabled={submitting} />
        </div>
        <aside className="review-checklist" aria-label="Confirmation checklist"><LockSimple aria-hidden="true" weight="light" /><h2>One last check</h2><p>Make sure your choices reflect your voice.</p><ul>
          <li><CheckCircle aria-hidden="true" weight={selectionComplete ? "fill" : "light"} /><span>Review your selected candidates</span></li>
          <li data-complete={signature.length > 0}><CheckCircle aria-hidden="true" weight={signature.length ? "fill" : "light"} /><span>Add your electronic signature</span></li>
          <li data-complete={thumbmark}><CheckCircle aria-hidden="true" weight={thumbmark ? "fill" : "light"} /><span>Confirm your on-screen thumbmark</span></li>
        </ul><p className="review-checklist__note">Your ballot is submitted only when you press Confirm Vote.</p></aside>
      </div>
      <div className="voter-review__actions"><button className="student-button student-button--secondary" disabled={submitting} onClick={() => navigate("/voter/ballot")} type="button"><ArrowLeft aria-hidden="true" />Go Back</button><button className="student-button" disabled={submitting || !selectionComplete || !signature.length || !thumbmark} onClick={handleConfirm} type="button">{submitting ? "Confirming..." : "Confirm Vote"}<ArrowRight aria-hidden="true" /></button></div>
      <p aria-live="polite" className="student-error" role="status">{message}</p>
    </StudentLayout>
  );
}


=======
    return <main className="voter-review voter-review--loading" aria-live="polite">Loading your review…</main>;
  }

  return (
    <main className="voter-review">
      <img alt="" className="voter-review__background" src={campusBackground} />
      <div className="voter-review__overlay" />

      <section className="voter-review__stage" aria-labelledby="voter-review-title">
        <div className="voter-review__panel">
          <header className="voter-review__header">
            <h1 id="voter-review-title">Review your vote</h1>
            <p>You cannot change your vote after confirming.</p>
          </header>

          <div className="voter-review__positions">
            {reviewedPositions.map((position) => (
              <ReviewPosition key={position.id} position={position} />
            ))}
          </div>
        </div>

        <div className="voter-review__actions">
          <button
            className="voter-review__back"
            disabled={submitting}
            onClick={() => navigate("/voter/ballot")}
            type="button"
          >
            Go Back
          </button>
          <button
            className="voter-review__confirm"
            disabled={submitting || !selectionComplete}
            onClick={handleConfirm}
            type="button"
          >
            {submitting ? "Confirming…" : "Confirm Vote"}
          </button>
        </div>

        <p
          aria-live="polite"
          className="voter-review__status"
          data-state={message ? "error" : "idle"}
          role="status"
        >
          {message}
        </p>
      </section>
    </main>
  );
}

>>>>>>> 74a2d47d756131abb6859b220084adc37dafd18d
function ReviewPosition({
  position,
}: {
  position: BallotPosition & { selectedCandidates: BallotPosition["candidates"] };
}) {
  return (
    <section className="review-position">
      <h2>{displayPosition(position.name)}</h2>
<<<<<<< HEAD
      <div className="review-position__candidates">{position.selectedCandidates.length > 0 ? position.selectedCandidates.map((candidate) => <CandidateProfile candidate={candidate} key={candidate.student_id} />) : <p>No candidate selected</p>}</div>
=======
      <p>
        {position.selectedCandidates.length > 0
          ? position.selectedCandidates.map((candidate) => candidate.full_name).join(", ")
          : "No candidate selected"}
      </p>
>>>>>>> 74a2d47d756131abb6859b220084adc37dafd18d
    </section>
  );
}
