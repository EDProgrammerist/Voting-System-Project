import { useEffect, useState } from "react";

import { getAdminToken } from "@/lib/admin-session";
import { getAdminDashboard } from "@/services/admin-dashboard-service";
import type { DashboardData } from "@/types/dashboard";
import { useAdminElection } from "@/hooks/use-admin-election";

export type DashboardDataState = "loading" | "live" | "error";

const EMPTY_DASHBOARD: DashboardData = {
  election: {
    id: 0,
    name: "",
    status: "draft",
    starts_at: null,
    ends_at: null,
  },
  turnout: {
    eligible_students: 0,
    already_voted: 0,
    not_yet_voted: 0,
    percentage: 0,
    by_course: [],
  },
  team_totals: { TEAM_A: 0, TEAM_B: 0 },
  candidate_results: [],
  results_by_position: {},
};

const LIVE_REFRESH_INTERVAL_MS = 5_000;

export function useAdminElectionDashboard() {
  const selection = useAdminElection();
  const { selectedElectionId } = selection;
  const [dashboard, setDashboard] = useState<DashboardData>(EMPTY_DASHBOARD);
  const [loadedElectionId, setLoadedElectionId] = useState<number | null>(null);
  const [dataState, setDataState] = useState<DashboardDataState>("loading");
  const [dataNotice, setDataNotice] = useState("");

  useEffect(() => {
    const token = getAdminToken();
    if (
      !token ||
      selectedElectionId === null ||
      selection.state !== "ready" ||
      !selection.election
    )
      return;
    const adminToken = token;
    const electionId = selectedElectionId;

    let active = true;
    let requestInFlight = false;
    let controller: AbortController | null = null;

    async function refreshDashboard(initialLoad = false) {
      if (!active || requestInFlight) return;

      requestInFlight = true;
      const requestController = new AbortController();
      controller = requestController;

      try {
        const data = await getAdminDashboard(
          adminToken,
          electionId,
          requestController.signal,
        );

        if (!active) return;
        setDashboard(data);
        setLoadedElectionId(electionId);
        setDataState("live");
        setDataNotice("");
      } catch (error) {
        if (!active || requestController.signal.aborted) return;

        if (initialLoad) {
          setLoadedElectionId(electionId);
          setDataState("error");
          setDataNotice(
            error instanceof Error
              ? error.message
              : "Unable to load election data.",
          );
        } else {
          setDataNotice(
            "Live updates are temporarily unavailable. Retrying automatically…",
          );
        }
      } finally {
        requestInFlight = false;
      }
    }

    function refreshWhenVisible() {
      if (!document.hidden) void refreshDashboard();
    }

    void refreshDashboard(true);
    const interval = window.setInterval(
      refreshWhenVisible,
      LIVE_REFRESH_INTERVAL_MS,
    );
    window.addEventListener("focus", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      active = false;
      controller?.abort();
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshWhenVisible);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [selectedElectionId, selection.state, selection.election]);

  let visibleState: DashboardDataState = dataState;
  if (
    selection.state === "error" ||
    (selection.state === "ready" && !selection.election)
  ) {
    visibleState = "error";
  } else if (
    selection.state === "loading" ||
    loadedElectionId !== selectedElectionId
  ) {
    visibleState = "loading";
  }

  return {
    dashboard,
    dataState: visibleState,
    dataNotice:
      selection.error ||
      (selection.state === "ready" && !selection.election
        ? "No election is available yet."
        : dataNotice),
    elections: selection.elections,
    selectedElectionId,
    selectElection: selection.selectElection,
  };
}
