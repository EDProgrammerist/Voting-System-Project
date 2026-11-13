import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router";

import {
  clearVoterSession,
  getVoterToken,
  isVoterPasswordRequired,
  setVoterTallyOnly,
  setVoterPasswordRequired,
  syncVoterElection,
} from "@/lib/voter-session";
import { getVoterSession } from "@/services/voter-auth-service";
import { AuthLoading, PageSkeleton } from "@/components/common/page-skeleton";

export default function RequireVoter() {
  const token = getVoterToken();
  const { pathname } = useLocation();
  const [attempt, setAttempt] = useState(0);
  const key = `${token}:${pathname}:${attempt}`;
  const [access, setAccess] = useState<{
    key: string;
    tallyOnly: boolean;
    passwordRequired?: boolean;
    error?: string;
  } | null>(null);
  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    getVoterSession(token, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) {
          syncVoterElection(data.election);
          setVoterTallyOnly(data.tally_only);
          setVoterPasswordRequired(data.password_change_required);
          setAccess({
            key,
            tallyOnly: data.tally_only,
            passwordRequired: data.password_change_required,
          });
        }
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted)
          setAccess({
            key,
            tallyOnly: true,
            error:
              error instanceof Error
                ? error.message
                : "Unable to verify your session.",
          });
      });
    return () => controller.abort();
  }, [key, token]);
  if (!token) return <Navigate to="/voter/login" replace />;
  if (access?.key !== key)
    return pathname === "/voter/password" || isVoterPasswordRequired() ? (
      <AuthLoading />
    ) : (
      <PageSkeleton
        kind={
          pathname.endsWith("/review")
            ? "review"
            : pathname.endsWith("/tally")
              ? "tally"
              : "ballot"
        }
        label="Verifying voter access"
      />
    );
  if (access.error)
    return (
      <section className="student-empty">
        <p role="alert">{access.error}</p>
        <button onClick={() => setAttempt((value) => value + 1)}>
          Try again
        </button>
        <a href="/voter/login" onClick={clearVoterSession}>
          Return to login
        </a>
      </section>
    );
  if (access.passwordRequired && pathname !== "/voter/password")
    return <Navigate to="/voter/password" replace />;
  if (!access.passwordRequired && pathname === "/voter/password")
    return (
      <Navigate
        to={access.tallyOnly ? "/voter/tally" : "/voter/ballot"}
        replace
      />
    );
  if (
    !access.passwordRequired &&
    access.tallyOnly &&
    pathname !== "/voter/tally"
  )
    return <Navigate to="/voter/tally" replace />;
  return <Outlet />;
}
