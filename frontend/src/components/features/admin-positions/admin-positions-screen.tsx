import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Plus, X } from "@phosphor-icons/react";

import { AdminSidebar } from "@/components/features/admin-dashboard/admin-sidebar";
import { AdminDataState, AdminElectionPicker } from "@/components/features/admin-dashboard/admin-data-state";
import { useAdminElectionDashboard } from "@/hooks/use-admin-election-dashboard";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { getAdminToken } from "@/lib/admin-session";
import {
  createAdminPosition,
  deleteAdminPosition,
  listAdminPositions,
  updateAdminPosition,
} from "@/services/admin-dashboard-service";
import { ApiError } from "@/services/api-client";
import type { PositionRecord } from "@/types/position";

import "../admin-dashboard/admin-dashboard-screen.css";
import "./admin-positions-screen.css";

type ModalMode = "add" | "edit";

export function AdminPositionsScreen() {
  const { dashboard, dataState, dataNotice, elections, selectedElectionId, selectElection } = useAdminElectionDashboard("draft");
  const [positions, setPositions] = useState<PositionRecord[]>([]);
  const [modalMode, setModalMode] = useState<ModalMode | null>(null);
  const [selectedPosition, setSelectedPosition] = useState<PositionRecord | null>(null);
  const [notice, setNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useDocumentTitle("Position | CPC Vote Admin");

  useEffect(() => {
    const token = getAdminToken();
    if (!token || dataState !== "live") return;

    let active = true;
    listAdminPositions(token, dashboard.election.id)
      .then(({ data }) => {
        if (active) setPositions(data);
      })
      .catch((error: unknown) => {
        if (active) setNotice(error instanceof Error ? error.message : "Unable to load positions.");
      });

    return () => {
      active = false;
    };
  }, [dashboard.election.id, dataState]);

  const candidateCounts = useMemo(() => {
    const counts = new Map<string, number>();
    dashboard.candidate_results.forEach((candidate) => {
      counts.set(candidate.position, (counts.get(candidate.position) ?? 0) + 1);
    });
    return counts;
  }, [dashboard.candidate_results]);

  const totalSeats = positions.reduce((sum, position) => sum + position.max_selections, 0);
  const totalCandidates = dashboard.candidate_results.length;
  const canEdit = dataState === "live" && dashboard.election.status === "draft";

  function openAddModal() {
    if (!canEdit) {
      setNotice("Select a draft election to add positions.");
      return;
    }
    setSelectedPosition(null);
    setModalMode("add");
    setNotice("");
  }

  function openEditModal(position: PositionRecord) {
    if (!canEdit) {
      setNotice("Select a draft election to edit positions.");
      return;
    }
    setSelectedPosition(position);
    setModalMode("edit");
    setNotice("");
  }

  function closeModal() {
    if (submitting) return;
    setModalMode(null);
    setSelectedPosition(null);
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") ?? "").trim();
    const maxSelections = Number(formData.get("max_selections"));

    if (!name || !Number.isInteger(maxSelections) || maxSelections < 1 || maxSelections > 50) {
      setNotice("Enter a position name and a max-per-vote value from 1 to 50.");
      return;
    }

    setSubmitting(true);
    const token = getAdminToken();

    if (!token || !canEdit) {
      setSubmitting(false);
      setNotice("Select a draft election before saving positions.");
      return;
    }

    try {
      if (modalMode === "edit" && selectedPosition) {
          const response = await updateAdminPosition(token, selectedPosition.id, {
            name,
            max_selections: maxSelections,
          });
          setPositions((current) => current.map((item) => item.id === response.data.id ? response.data : item));
          setNotice(response.message);
      } else {
          const response = await createAdminPosition(token, {
            election_id: dashboard.election.id,
            name,
            max_selections: maxSelections,
            display_order: positions.length + 1,
          });
          setPositions((current) => [...current, response.data]);
          setNotice(response.message);
      }
      closeModal();
    } catch (error) {
      setNotice(error instanceof ApiError ? error.message : "Unable to save the position right now.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(position: PositionRecord) {
    if (!canEdit) {
      setNotice("Select a draft election to delete positions.");
      return;
    }
    if (!window.confirm(`Delete ${position.name}?`)) return;

    const token = getAdminToken();
    try {
      if (!token) return;
      const response = await deleteAdminPosition(token, position.id);
      setNotice(response.message);
      setPositions((current) => current.filter((item) => item.id !== position.id));
    } catch (error) {
      setNotice(error instanceof ApiError ? error.message : "Unable to delete the position right now.");
    }
  }

  function handleUnavailable(label: string) {
    setNotice(`${label} management will be connected in the next screen.`);
  }

  if (dataState !== "live") {
    return (
      <main className="admin-dashboard admin-positions">
        <AdminSidebar active="position" onUnavailable={handleUnavailable} />
        <section className="admin-dashboard__content admin-positions__content">
          <AdminDataState message={dataNotice} state={dataState} />
        </section>
      </main>
    );
  }

  return (
    <main className="admin-dashboard admin-positions">
      <AdminSidebar active="position" onUnavailable={handleUnavailable} />

      <section className="admin-dashboard__content admin-positions__content">
        <header className="admin-positions__header">
          <h1>Position</h1>
          <AdminElectionPicker elections={elections} onChange={(id) => { setPositions([]); selectElection(id); }} selectedElectionId={selectedElectionId} />
          <button disabled={!canEdit} onClick={openAddModal} title={!canEdit ? "Select a draft election to make changes" : undefined} type="button"><Plus aria-hidden="true" weight="bold" />Add Position</button>
        </header>

        <section className="position-summary" aria-label="Position summary">
          <SummaryCard label="Total Position" value={positions.length} />
          <SummaryCard label="Total Candidates" value={totalCandidates} />
          <SummaryCard label="Total Seats" value={totalSeats} />
        </section>

        <section className="positions-table-card" aria-label="Election positions">
          <div className="positions-table__scroll">
            <table className="positions-table">
              <thead><tr><th>Position</th><th>Max Votes</th><th>Candidates</th><th>Actions</th></tr></thead>
              <tbody>
                {positions.map((position) => (
                  <tr key={position.id}>
                    <td><strong>{position.name}</strong></td>
                    <td>{position.max_selections}</td>
                    <td>{candidateCounts.get(position.name) ?? 0}</td>
                    <td>
                      <div className="position-actions">
                        <button disabled={!canEdit} onClick={() => openEditModal(position)} type="button">Edit</button>
                        <button className="position-actions__delete" disabled={!canEdit} onClick={() => handleDelete(position)} type="button">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <p aria-live="polite" className="admin-dashboard__notice" role="status">{notice || (!canEdit ? "This election is read-only. Select a draft election to manage positions." : dataNotice)}</p>
      </section>

      {modalMode && (
        <div className="position-modal__backdrop" role="presentation">
          <section aria-labelledby="position-modal-title" aria-modal="true" className="position-modal" role="dialog">
            <button aria-label="Close position dialog" className="position-modal__close" disabled={submitting} onClick={closeModal} type="button"><X aria-hidden="true" /></button>
            <h2 id="position-modal-title">{modalMode === "edit" ? "Edit Position" : "Add Position"}</h2>
            <form onSubmit={handleSave}>
              <label>Position Name<input autoFocus defaultValue={selectedPosition?.name ?? ""} maxLength={255} name="name" required /></label>
              <label>Max per vote<input defaultValue={selectedPosition?.max_selections ?? 1} max={50} min={1} name="max_selections" required type="number" /></label>
              <div className="position-modal__actions">
                <button disabled={submitting} onClick={closeModal} type="button">Cancel</button>
                <button disabled={submitting} type="submit">{submitting ? "Saving…" : "Save"}</button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return <article><strong>{value}</strong><p>{label}</p></article>;
}
