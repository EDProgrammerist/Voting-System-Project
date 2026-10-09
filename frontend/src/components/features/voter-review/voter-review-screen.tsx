import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";

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

function displayPosition(name: string): string {
  return name.toLowerCase() === "senator" ? "Senators" : name;
}

export function VoterReviewScreen() {
  const navigate = useNavigate();
  const token = getVoterToken();
  const sessionElection = getVoterElection();
  const storedDraft = getVoterDraft();
  const [ballot, setBallot] = useState<VoterBallotResponse>(VOTER_BALLOT_PREVIEW);
  const [selections] = useState<VoterSelection[]>(() =>
    storedDraft.length > 0 ? storedDraft : token ? [] : previewSelections(VOTER_BALLOT_PREVIEW),
  );
  const [loading, setLoading] = useState(Boolean(token));
  const [submitting, setSubmitting] = useState(false);
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
    () => ballot.positions.map((position) => ({
      ...position,
      selectedCandidates: position.candidates.filter((candidate) =>
        selections.some(
          (selection) =>
            selection.position_id === position.id &&
            selection.candidate_student_id === candidate.student_id,
        ),
      ),
    })),
    [ballot.positions, selections],
  );

  const selectionComplete = reviewedPositions.every(
    (position) => position.candidates.length === 0 || position.selectedCandidates.length > 0,
  );

  async function handleConfirm() {
    if (!selectionComplete) {
      setMessage("Your ballot is incomplete. Go back and choose at least one candidate for every position.");
      return;
    }

    if (!token) {
      navigate("/voter/thank-you", { replace: true });
      return;
    }

    setSubmitting(true);
    setMessage("");

    try {
      const response = await submitVoterVote(token, {
        election_id: sessionElection?.id ?? ballot.election.id,
        selections,
      });
      clearVoterSession();
      navigate("/voter/thank-you", {
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

function ReviewPosition({
  position,
}: {
  position: BallotPosition & { selectedCandidates: BallotPosition["candidates"] };
}) {
  return (
    <section className="review-position">
      <h2>{displayPosition(position.name)}</h2>
      <p>
        {position.selectedCandidates.length > 0
          ? position.selectedCandidates.map((candidate) => candidate.full_name).join(", ")
          : "No candidate selected"}
      </p>
    </section>
  );
}
