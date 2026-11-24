import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { setVoterTallyOnly } from "@/lib/voter-session";
import { ApiError } from "@/services/api-client";
import { getVoterBallot } from "@/services/voter-auth-service";
import type { VoterBallotResponse } from "@/types/voter";

export function useVoterBallot(token: string | null, paused = false) {
  const navigate = useNavigate();
  const [ballot, setBallot] = useState<VoterBallotResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token || paused) return;
    const controller = new AbortController();
    let inFlight = false;
    async function refresh() {
      if (inFlight || document.hidden) return;
      inFlight = true;
      try {
        const data = await getVoterBallot(token!, controller.signal);
        if (!controller.signal.aborted) {
          setBallot(data);
          setError("");
        }
      } catch (err) {
        if (controller.signal.aborted) return;
        if (
          err instanceof ApiError &&
          err.status === 403 &&
          err.payload &&
          typeof err.payload === "object" &&
          "tally_only" in err.payload &&
          err.payload.tally_only === true
        ) {
          setVoterTallyOnly(true);
          navigate("/voter/tally", { replace: true });
          return;
        }
        setError(
          err instanceof Error
            ? err.message
            : "Unable to refresh your ballot. Retrying automatically.",
        );
      } finally {
        inFlight = false;
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void refresh();
    const timer = window.setInterval(() => void refresh(), 5_000);
    const onVisible = () => void refresh();
    window.addEventListener("focus", onVisible);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      controller.abort();
      window.clearInterval(timer);
      window.removeEventListener("focus", onVisible);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [token, paused, navigate]);

  return { ballot, loading, error };
}
