import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp } from "@phosphor-icons/react";

import { AdminSidebar } from "@/components/features/admin-dashboard/admin-sidebar";
import { AdminDataState, AdminElectionPicker } from "@/components/features/admin-dashboard/admin-data-state";
import { useAdminElectionDashboard } from "@/hooks/use-admin-election-dashboard";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { getAdminToken } from "@/lib/admin-session";
import { listAdminPositions, updateAdminPosition } from "@/services/admin-dashboard-service";
import { ApiError } from "@/services/api-client";
import type { PositionRecord } from "@/types/position";

import "../admin-dashboard/admin-dashboard-screen.css";
import "./admin-ballot-position-screen.css";

export function AdminBallotPositionScreen() {
  const { dashboard, dataState, dataNotice, elections, selectedElectionId, selectElection } = useAdminElectionDashboard("draft");
  const [positions, setPositions] = useState<PositionRecord[]>([]);
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);

  useDocumentTitle("Ballot Position | CPC Vote Admin");

  useEffect(() => {
    const token = getAdminToken();
    if (!token || dataState !== "live") return;

    let active = true;
    listAdminPositions(token, dashboard.election.id)
      .then(({ data }) => {
        if (active) setPositions([...data].sort((a, b) => a.display_order - b.display_order));
      })
      .catch((error: unknown) => {
        if (active) setNotice(error instanceof Error ? error.message : "Unable to load ballot positions.");
      });

    return () => { active = false; };
  }, [dashboard.election.id, dataState]);

  const canEdit = dataState === "live" && dashboard.election.status === "draft";

  async function movePosition(index: number, direction: -1 | 1) {
    const targetIndex = index + direction;
    if (saving || !canEdit || targetIndex < 0 || targetIndex >= positions.length) return;

    const original = positions;
    const reordered = [...positions];
    [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];
    const normalized = reordered.map((position, order) => ({ ...position, display_order: order + 1 }));
    const token = getAdminToken();

    setSaving(true);
    setNotice("");
    setPositions(normalized);

    try {
      if (!token) return;
      const changed = normalized.filter((position) => {
        const previous = original.find((item) => item.id === position.id);
        return previous?.display_order !== position.display_order;
      });
      for (const position of changed) {
        await updateAdminPosition(token, position.id, { display_order: position.display_order });
      }
      const response = await listAdminPositions(token, dashboard.election.id);
      setPositions([...response.data].sort((a, b) => a.display_order - b.display_order));
      setNotice("Ballot order saved successfully.");
    } catch (error) {
      if (token) {
        const response = await listAdminPositions(token, dashboard.election.id).catch(() => null);
        if (response) setPositions([...response.data].sort((a, b) => a.display_order - b.display_order));
      }
      setNotice(error instanceof ApiError ? error.message : "Unable to save the ballot order right now.");
    } finally {
      setSaving(false);
    }
  }

  function handleUnavailable(label: string) {
    setNotice(`${label} management is not available yet.`);
  }

  if (dataState !== "live") {
    return (
      <main className="admin-dashboard admin-ballot-position">
        <AdminSidebar active="ballot" onUnavailable={handleUnavailable} />
        <section className="admin-dashboard__content admin-ballot-position__content">
          <AdminDataState message={dataNotice} state={dataState} />
        </section>
      </main>
    );
  }

  return (
    <main className="admin-dashboard admin-ballot-position">
      <AdminSidebar active="ballot" onUnavailable={handleUnavailable} />

      <section className="admin-dashboard__content admin-ballot-position__content">
        <section aria-labelledby="ballot-position-title" className="ballot-order-card">
          <h1 id="ballot-position-title">Order positions appear on the ballot.</h1>
          <AdminElectionPicker elections={elections} onChange={(id) => { setPositions([]); selectElection(id); }} selectedElectionId={selectedElectionId} />

          <div className="ballot-order-table" role="table" aria-label="Ballot position order">
            <div className="ballot-order-table__header" role="row">
              <span role="columnheader">Order</span>
              <span role="columnheader">Position</span>
              <span aria-hidden="true" />
            </div>

            <div className="ballot-order-table__body">
              {positions.map((position, index) => (
                <div className="ballot-order-table__row" key={position.id} role="row">
                  <strong role="cell">{index + 1}</strong>
                  <span role="cell">{position.name === "Senator" ? "Senators" : position.name}</span>
                  <div className="ballot-order-table__actions" role="cell">
                    <button aria-label={`Move ${position.name} up`} disabled={saving || !canEdit || index === 0} onClick={() => movePosition(index, -1)} type="button"><ArrowUp aria-hidden="true" weight="bold" /></button>
                    <button aria-label={`Move ${position.name} down`} disabled={saving || !canEdit || index === positions.length - 1} onClick={() => movePosition(index, 1)} type="button"><ArrowDown aria-hidden="true" weight="bold" /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <p aria-live="polite" className="admin-dashboard__notice" role="status">{notice || (!canEdit ? "This election is read-only. Select a draft election to reorder its ballot." : dataNotice)}</p>
      </section>
    </main>
  );
}
