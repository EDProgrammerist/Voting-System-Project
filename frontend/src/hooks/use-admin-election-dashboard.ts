import { useEffect, useState } from "react";

import { getAdminToken } from "@/lib/admin-session";
import { getAdminDashboard, listAdminElections } from "@/services/admin-dashboard-service";
import type { DashboardData, ElectionSummary } from "@/types/dashboard";

export type DashboardDataState = "loading" | "live" | "error";
export type PreferredElectionStatus = "active" | "draft";

const EMPTY_DASHBOARD: DashboardData = {
  election: { id: 0, name: "", status: "draft", starts_at: null, ends_at: null },
  turnout: { eligible_students: 0, already_voted: 0, not_yet_voted: 0, percentage: 0, by_course: [] },
  team_totals: { TEAM_A: 0, TEAM_B: 0 },
  candidate_results: [],
  results_by_position: {},
};

const LIVE_REFRESH_INTERVAL_MS = 2_000;

export function useAdminElectionDashboard(preferredStatus: PreferredElectionStatus = "active") {
  const [dashboard, setDashboard] = useState<DashboardData>(EMPTY_DASHBOARD);
  const [elections, setElections] = useState<ElectionSummary[]>([]);
  const [selectedElectionId, setSelectedElectionId] = useState<number | null>(null);
  const [dataState, setDataState] = useState<DashboardDataState>("loading");
  const [dataNotice, setDataNotice] = useState("");

  useEffect(() => {
    const token = getAdminToken();
    if (!token) return;

    let active = true;
    listAdminElections(token).then(({ data }) => {
      if (!active) return;
      const election = data.find((item) => item.status === preferredStatus)
        ?? data.find((item) => item.status === "active")
        ?? data[0];
      setElections(data);
      if (!election) {
        setDataState("error");
        setDataNotice("No election is available yet.");
        return;
      }
      setSelectedElectionId(election.id);
    }).catch((error: unknown) => {
      if (active) {
        setDataState("error");
        setDataNotice(error instanceof Error ? error.message : "Unable to load elections.");
      }
    });

    return () => {
      active = false;
    };
  }, [preferredStatus]);

  useEffect(() => {
    const token = getAdminToken();
    if (!token || selectedElectionId === null) return;
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
        setDataState("live");
        setDataNotice("");
      } catch (error) {
        if (!active || requestController.signal.aborted) return;

        if (initialLoad) {
          setDataState("error");
          setDataNotice(error instanceof Error ? error.message : "Unable to load election data.");
        } else {
          setDataNotice("Live updates are temporarily unavailable. Retrying automatically…");
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
  }, [selectedElectionId]);

  function selectElection(electionId: number) {
    setDataState("loading");
    setDataNotice("");
    setSelectedElectionId(electionId);
  }

  return {
    dashboard,
    dataState,
    dataNotice,
    elections,
    selectedElectionId,
    selectElection,
  };
}
