import { useEffect, useState } from "react";

import { ADMIN_DASHBOARD_PREVIEW } from "@/data/admin-dashboard-preview";
import { getAdminToken } from "@/lib/admin-session";
import { getAdminDashboard, listAdminElections } from "@/services/admin-dashboard-service";
import type { DashboardData, ElectionSummary } from "@/types/dashboard";

export type DashboardDataState = "loading" | "live" | "error";
export type PreferredElectionStatus = "active" | "draft";

export function useAdminElectionDashboard(preferredStatus: PreferredElectionStatus = "active") {
  const [dashboard, setDashboard] = useState<DashboardData>(ADMIN_DASHBOARD_PREVIEW);
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

    let active = true;
    getAdminDashboard(token, selectedElectionId)
      .then((data) => {
        if (active) {
          setDashboard(data);
          setDataState("live");
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setDataState("error");
          setDataNotice(error instanceof Error ? error.message : "Unable to load election data.");
        }
      });

    return () => {
      active = false;
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
