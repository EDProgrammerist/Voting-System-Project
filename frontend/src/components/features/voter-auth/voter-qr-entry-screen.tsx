import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import {
  clearVoterQrEntry,
  clearVoterSession,
  getVoterToken,
  setVoterQrEntry,
} from "@/lib/voter-session";
import {
  getVoterSession,
  logoutVoter,
  resolveVoterQr,
} from "@/services/voter-auth-service";
import { useDocumentTitle } from "@/hooks/use-document-title";
import type { VoterQrEntry } from "@/types/voter";
import "@/components/features/voter-shared/voter-shared.css";

export default function VoterQrEntryScreen() {
  const { code = "" } = useParams();
  const navigate = useNavigate();
  const [attempt, setAttempt] = useState(0);
  const [error, setError] = useState("");
  const [otherElection, setOtherElection] = useState<VoterQrEntry | null>(null);
  const [busy, setBusy] = useState(false);
  useDocumentTitle("Scan to vote | CPC Vote");

  useEffect(() => {
    const controller = new AbortController();
    async function resolve() {
      try {
        const response = await resolveVoterQr(code, controller.signal);
        if (controller.signal.aborted) return;
        const entry = { code, election: response.election };
        const token = getVoterToken();
        if (token) {
          const session = await getVoterSession(token, controller.signal);
          if (controller.signal.aborted) return;
          if (session.election.id !== entry.election.id) {
            setOtherElection(entry);
            return;
          }
          setVoterQrEntry(entry);
          navigate(
            session.password_change_required
              ? "/voter/password"
              : session.tally_only
                ? "/voter/tally"
                : "/voter/ballot",
            { replace: true },
          );
        } else {
          setVoterQrEntry(entry);
          navigate("/voter/login", { replace: true });
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          clearVoterQrEntry();
          setError(
            err instanceof Error
              ? err.message
              : "Unable to open this voting QR code.",
          );
        }
      }
    }
    void resolve();
    return () => controller.abort();
  }, [attempt, code, navigate]);

  async function changeElection() {
    if (!otherElection) return;
    setBusy(true);
    try {
      const token = getVoterToken();
      if (token) await logoutVoter(token);
      clearVoterSession();
      setVoterQrEntry(otherElection);
      navigate("/voter/login", { replace: true });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to sign out. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="student-page">
      <section className="student-container">
        <header className="student-heading">
          <h1>Scan to vote</h1>
        </header>
        {otherElection ? (
          <div className="student-notice">
            <div>
              <strong>{otherElection.election.name}</strong>
              <p>
                You are signed in for another election. Sign out to continue to
                this election’s student login.
              </p>
              <button
                type="button"
                className="student-button"
                disabled={busy}
                onClick={changeElection}
              >
                {busy ? "Signing out..." : "Sign out and continue"}
              </button>
              {error && <p role="alert">{error}</p>}
            </div>
          </div>
        ) : error ? (
          <div className="student-notice" role="alert">
            <div>
              <strong>Unable to open the voting link</strong>
              <p>{error}</p>
              <button
                type="button"
                className="student-button"
                onClick={() => {
                  setError("");
                  setAttempt((value) => value + 1);
                }}
              >
                Try again
              </button>
              <p>
                <Link to="/voter/login" onClick={clearVoterQrEntry}>
                  Return to student login
                </Link>
              </p>
            </div>
          </div>
        ) : (
          <p role="status">
            Checking the election and opening student login...
          </p>
        )}
      </section>
    </main>
  );
}
