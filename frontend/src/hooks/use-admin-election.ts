import { useEffect, useState, useSyncExternalStore } from "react";
import {
  getAdminElectionId,
  selectAdminElection,
  subscribeAdminElection,
} from "@/lib/admin-election";
import { getAdminToken } from "@/lib/admin-session";
import { listAdminElections } from "@/services/admin-dashboard-service";
import type { ElectionSummary } from "@/types/dashboard";

export function useAdminElection(attempt = 0) {
  const selectedElectionId = useSyncExternalStore(
    subscribeAdminElection,
    getAdminElectionId,
    () => null,
  );
  const [result, setResult] = useState<{
    attempt: number;
    elections: ElectionSummary[];
    state: "loading" | "ready" | "error";
    error: string;
  }>({ attempt: -1, elections: [], state: "loading", error: "" });

  useEffect(() => {
    const token = getAdminToken();
    if (!token) return;
    let active = true;
    listAdminElections(token)
      .then(({ data }) => {
        if (!active) return;
        const selected =
          data.find((item) => item.id === getAdminElectionId()) ??
          data.find((item) => item.status === "active") ??
          data[0];
        if (selected) selectAdminElection(selected.id);
        setResult({ attempt, elections: data, state: "ready", error: "" });
      })
      .catch((error: unknown) => {
        if (active)
          setResult({
            attempt,
            elections: [],
            state: "error",
            error:
              error instanceof Error
                ? error.message
                : "Unable to load elections.",
          });
      });
    return () => {
      active = false;
    };
  }, [attempt]);

  return {
    elections: result.elections,
    election: result.elections.find((item) => item.id === selectedElectionId),
    selectedElectionId,
    state: result.attempt === attempt ? result.state : "loading",
    error: result.error,
    selectElection: (id: number) => {
      if (result.elections.some((item) => item.id === id))
        selectAdminElection(id);
    },
  };
}
