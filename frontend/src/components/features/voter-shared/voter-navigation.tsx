import { useState, useSyncExternalStore } from "react";
import { NavLink, useNavigate } from "react-router";
import { ChartBar, CheckSquareOffset, SignOut } from "@phosphor-icons/react";
import {
  clearVoterSession,
  getVoterToken,
  isVoterTallyOnly,
  isVoterPasswordRequired,
  subscribeVoterAccess,
} from "@/lib/voter-session";
import { logoutVoter } from "@/services/voter-auth-service";
import "./voter-shared.css";

export function VoterNavigation() {
  const tallyOnly = useSyncExternalStore(
    subscribeVoterAccess,
    isVoterTallyOnly,
  );
  const passwordRequired = useSyncExternalStore(
    subscribeVoterAccess,
    isVoterPasswordRequired,
  );
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function logout() {
    setBusy(true);
    setError("");
    try {
      const token = getVoterToken();
      if (token) await logoutVoter(token);
      clearVoterSession();
      navigate("/voter/login", { replace: true });
    } catch {
      setError("Unable to sign out. Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <a className="student-skip" href="#student-main">
        Skip to content
      </a>
      <nav aria-label="Student navigation" className="voter-nav">
        <span className="voter-nav__brand">
          <CheckSquareOffset aria-hidden="true" weight="light" />
          <span>
            <strong>CPC</strong> Vote
          </span>
        </span>
        <div className="voter-nav__links">
          {!tallyOnly && !passwordRequired && (
            <NavLink to="/voter/ballot">
              <CheckSquareOffset aria-hidden="true" weight="light" />
              Voting Ballot
            </NavLink>
          )}
          {!passwordRequired && (
            <NavLink to="/voter/tally">
              <ChartBar aria-hidden="true" weight="light" />
              Live Tally
            </NavLink>
          )}
        </div>
        <button
          className="voter-nav__logout"
          disabled={busy}
          onClick={() => void logout()}
          type="button"
        >
          <SignOut aria-hidden="true" weight="light" />
          {busy ? "Signing out…" : "Logout"}
        </button>
      </nav>
      {error && <p role="alert">{error}</p>}
    </>
  );
}
