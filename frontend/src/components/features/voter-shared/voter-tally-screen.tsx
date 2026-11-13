import { partyLabel } from "./candidate-utils";
import { useEffect, useState } from "react";
import { useLocation } from "react-router";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { getVoterToken, setVoterTallyOnly } from "@/lib/voter-session";
import { getVoterTally } from "@/services/voter-auth-service";
import type { VoterTallyResponse } from "@/types/voter";
import { CandidateAvatar, StudentLayout } from "./student-layout";
import { BallotReference } from "./ballot-reference";
import { PageSkeleton } from "@/components/common/page-skeleton";
import {
  ChartBar,
  CheckCircle,
  Clock,
  LockSimple,
} from "@phosphor-icons/react";

export default function VoterTallyScreen() {
  const [tally, setTally] = useState<VoterTallyResponse | null>(null);
  const [error, setError] = useState("");
  const location = useLocation();
  const confirmation = (
    location.state as { confirmationMessage?: string } | null
  )?.confirmationMessage;
  useDocumentTitle("Live Tally | CPC Vote");
  useEffect(() => {
    const token = getVoterToken();
    if (!token) return;
    const controller = new AbortController();
    let inFlight = false;
    async function refresh() {
      if (inFlight || document.hidden) return;
      inFlight = true;
      try {
        const data = await getVoterTally(token!, controller.signal);
        if (!controller.signal.aborted) {
          setVoterTallyOnly(data.tally_only);
          setTally(data);
          setError("");
        }
      } catch (err) {
        if (!controller.signal.aborted)
          setError(
            err instanceof Error ? err.message : "Unable to refresh results.",
          );
      } finally {
        inFlight = false;
      }
    }
    void refresh();
    const interval = window.setInterval(() => void refresh(), 5000);
    const onVisible = () => void refresh();
    window.addEventListener("focus", onVisible);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      controller.abort();
      window.clearInterval(interval);
      window.removeEventListener("focus", onVisible);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);
  const isClosed = tally?.election.status === "closed";
  const isPreview = tally?.election.status === "draft";
  if (!tally && !error) return <PageSkeleton kind="tally" label="Loading live election results" />;
  return (
    <StudentLayout
      title="Live Tally"
      description={
        tally?.election.name ??
        "Follow the results of your student election, all in one place."
      }
      status={
        <span className="student-status">
          <span className="student-status__dot" />
          {isClosed
            ? "Election closed"
            : isPreview
              ? "Election preview"
              : "Live results"}
        </span>
      }
    >
      {confirmation && (
        <div className="student-notice student-notice--success" role="status">
          <CheckCircle aria-hidden="true" weight="light" />
          <div>
            <strong>Your voice has been counted</strong>
            <p>{confirmation}</p>
          </div>
        </div>
      )}
      <BallotReference reference={tally?.ballot_reference} />
      {tally?.tally_only && (
        <div className="student-notice">
          <LockSimple aria-hidden="true" weight="light" />
          <div>
            <strong>
              {tally.ballot_reference?.attendance_recorded
                ? "Your ballot is complete"
                : "Live Tally access"}
            </strong>
            <p>
              Your account has viewing access to Live Tally. Submitted ballots
              cannot be changed.
            </p>
          </div>
        </div>
      )}
      <div className="tally-toolbar">
        <span className="student-status">
          <Clock aria-hidden="true" weight="light" />
          {isClosed
            ? "Final recorded results"
            : "Results refresh every 5 seconds"}
        </span>
        <p aria-live="polite" role="status">
          {error
            ? `${tally ? "Updates paused. Displaying the last received results. " : ""}${error} Retrying automatically.`
            : tally
              ? `Last updated: ${new Date(tally.updated_at).toLocaleTimeString()}`
              : "Loading results..."}
        </p>
      </div>
      {tally?.positions.map((position) => (
        <section className="student-tally" key={position.id}>
          <header className="student-tally__heading">
            <h2>{position.name}</h2>
            <span>
              {position.candidates.length}{" "}
              {position.candidates.length === 1 ? "candidate" : "candidates"}
            </span>
          </header>
          {position.candidates.length ? (
            <table>
              <thead>
                <tr>
                  <th scope="col">Candidate</th>
                  <th scope="col">Partylist</th>
                  <th scope="col">Votes</th>
                </tr>
              </thead>
              <tbody>
                {position.candidates.map((candidate) => (
                  <tr key={candidate.student_id}>
                    <td>
                      <div className="tally-candidate">
                        <CandidateAvatar name={candidate.full_name} />
                        <div>
                          <strong>{candidate.full_name}</strong>
                          <small>{partyLabel(candidate.team, candidate.partylist?.name)}</small>
                        </div>
                      </div>
                    </td>
                    <td>{partyLabel(candidate.team, candidate.partylist?.name)}</td>
                    <td>{candidate.votes.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="student-empty">
              <ChartBar aria-hidden="true" weight="light" />
              <div>
                <h3>Results will appear here</h3>
                <p>No candidates for this position.</p>
              </div>
            </div>
          )}
        </section>
      ))}
    </StudentLayout>
  );
}
