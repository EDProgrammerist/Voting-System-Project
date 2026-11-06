import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router";

import { clearVoterSession, getVoterToken, setVoterTallyOnly, syncVoterElection } from "@/lib/voter-session";
import { getVoterTally } from "@/services/voter-auth-service";

export default function RequireVoter() {
  const token = getVoterToken();
  const { pathname } = useLocation();
  const [attempt, setAttempt] = useState(0);
  const key = `${token}:${pathname}:${attempt}`;
  const [access, setAccess] = useState<{ key: string; tallyOnly: boolean; error?: string } | null>(null);
  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    getVoterTally(token, controller.signal).then((data) => {
      if (!controller.signal.aborted) { syncVoterElection(data.election); setVoterTallyOnly(data.tally_only); setAccess({ key, tallyOnly: data.tally_only }); }
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) setAccess({ key, tallyOnly: true, error: error instanceof Error ? error.message : "Unable to verify your session." });
    });
    return () => controller.abort();
  }, [key, token]);
  if (!token) return <Navigate to="/voter/login" replace />;
  if (access?.key !== key) return <main className="student-page" role="status">Verifying voter access…</main>;
  if (access.error) return <main className="student-page"><p role="alert">{access.error}</p><button onClick={() => setAttempt((value) => value + 1)}>Try again</button><a href="/voter/login" onClick={clearVoterSession}>Return to login</a></main>;
  if (access.tallyOnly && pathname !== "/voter/tally") return <Navigate to="/voter/tally" replace />;
  return <Outlet />;
}
