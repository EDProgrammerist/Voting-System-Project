import { useEffect, useState } from "react";

import { ADMIN_DASHBOARD_PREVIEW } from "@/data/admin-dashboard-preview";
import { getAdminToken } from "@/lib/admin-session";
import { getAdminDashboard, listAdminElections } from "@/services/admin-dashboard-service";
import type { DashboardData } from "@/types/dashboard";

export type DashboardDataState = "preview" | "loading" | "live";

export function useAdminElectionDashboard() {
  const [dashboard, setDashboard] = useState<DashboardData>(ADMIN_DASHBOARD_PREVIEW);
  const [dataState, setDataState] = useState<DashboardDataState>(
    () => (getAdminToken() ? "loading" : "preview"),
  );
  const [dataNotice, setDataNotice] = useState("");

  useEffect(() => {
    const token = getAdminToken();
    if (!token) return;

    let active = true;
    listAdminElections(token)
      .then(({ data }) => {
        const election = data.find((item) => item.status === "active") ?? data[0];
        if (!election) throw new Error("No election is available yet.");
        return getAdminDashboard(token, election.id);
      })
      .then((data) => {
        if (active) {
          setDashboard(data);
          setDataState("live");
        }
      })
      .catch(() => {
        if (active) {
          setDataState("preview");
          setDataNotice("Live election data is unavailable. Showing preview results.");
        }
      });

    return () => {
      active = false;
    };
  }, []);

  return { dashboard, dataState, dataNotice };
}
