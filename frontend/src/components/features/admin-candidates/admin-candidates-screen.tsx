import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { MagnifyingGlass, Plus, User, X } from "@phosphor-icons/react";
import { useNavigate } from "react-router";

import { AdminSidebar } from "@/components/features/admin-dashboard/admin-sidebar";
import {
  AdminDataState,
  AdminElectionPicker,
} from "@/components/features/admin-dashboard/admin-data-state";
import { useAdminElectionDashboard } from "@/hooks/use-admin-election-dashboard";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { getAdminToken } from "@/lib/admin-session";
import {
  activateAdminElection,
  deleteAdminCandidate,
  listAdminCandidates,
  listAdminPositions,
  saveAdminCandidate,
} from "@/services/admin-dashboard-service";
import { ApiError } from "@/services/api-client";
import type { CandidateRecord } from "@/types/candidate";
import type { PositionRecord } from "@/types/position";

import "../admin-dashboard/admin-dashboard-screen.css";
import "../admin-dashboard/admin-overview.css";
import "../admin-dashboard/admin-management.css";
import "./admin-candidates-screen.css";

export function AdminCandidatesScreen() {
  const navigate = useNavigate();
  const {
    dashboard,
    dataState,
    dataNotice,
    elections,
    selectedElectionId,
    selectElection,
  } = useAdminElectionDashboard("draft");
  const [candidates, setCandidates] = useState<CandidateRecord[]>([]);
  const [positions, setPositions] = useState<PositionRecord[]>([]);
  const [query, setQuery] = useState("");
  const [positionFilter, setPositionFilter] = useState("all");
  const [selectedCandidate, setSelectedCandidate] =
    useState<CandidateRecord | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [activating, setActivating] = useState(false);
  const [recordsState, setRecordsState] = useState<
    "loading" | "ready" | "error"
  >("loading");
  const dialogRef = useRef<HTMLDialogElement>(null);

  useDocumentTitle("Candidates | CPC Vote Admin");

  useEffect(() => {
    const token = getAdminToken();
    if (!token || dataState !== "live") return;

    let active = true;
    Promise.all([
      listAdminCandidates(token, dashboard.election.id),
      listAdminPositions(token, dashboard.election.id),
    ])
      .then(([candidateResponse, positionResponse]) => {
        if (!active) return;
        setCandidates(candidateResponse.data);
        setPositions(positionResponse.data);
        setRecordsState("ready");
      })
      .catch((error: unknown) => {
        if (active) {
          setRecordsState("error");
          setNotice(
            error instanceof Error
              ? error.message
              : "Unable to load candidates.",
          );
        }
      });

    return () => {
      active = false;
    };
  }, [dashboard.election.id, dataState]);

  useEffect(() => {
    if (!modalOpen) return;
    const dialog = dialogRef.current;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog?.showModal();
    dialog?.querySelector<HTMLInputElement>('input[name="full_name"]')?.focus();
    return () => {
      dialog?.close();
      document.body.style.overflow = previousOverflow;
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected)
        previousFocus.focus();
    };
  }, [modalOpen]);

  const countsByPosition = useMemo(() => {
    const counts = new Map<number, number>();
    candidates.forEach((candidate) =>
      counts.set(
        candidate.position.id,
        (counts.get(candidate.position.id) ?? 0) + 1,
      ),
    );
    return counts;
  }, [candidates]);

  const filteredCandidates = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return candidates.filter((candidate) => {
      const matchesPosition =
        positionFilter === "all" ||
        candidate.position.id === Number(positionFilter);
      const matchesQuery =
        !normalized ||
        [
          candidate.full_name,
          candidate.student_id,
          candidate.team,
          candidate.motto ?? "",
        ].some((value) => value.toLowerCase().includes(normalized));
      return matchesPosition && matchesQuery;
    });
  }, [candidates, positionFilter, query]);
  const canEdit = dataState === "live" && dashboard.election.status === "draft";
  const canAddCandidate = canEdit && positions.length > 0;
  const canActivate =
    canEdit &&
    positions.length > 0 &&
    positions.every((position) => (countsByPosition.get(position.id) ?? 0) > 0);

  function openAddModal() {
    if (!canAddCandidate) {
      setNotice(
        canEdit
          ? "Default positions are still loading. Refresh the page and try again."
          : "Select a draft election to add candidates.",
      );
      return;
    }
    setSelectedCandidate(null);
    setNotice("");
    setModalOpen(true);
  }

  function openEditModal(candidate: CandidateRecord) {
    if (!canEdit) {
      setNotice("Select a draft election to edit candidates.");
      return;
    }
    setSelectedCandidate(candidate);
    setNotice("");
    setModalOpen(true);
  }

  function closeModal() {
    if (submitting) return;
    setModalOpen(false);
    setSelectedCandidate(null);
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const fullName = String(formData.get("full_name") ?? "").trim();
    const positionId = Number(formData.get("position_id"));
    const team = String(formData.get("team") ?? "");
    const position = positions.find((item) => item.id === positionId);

    if (!fullName || !position || !["TEAM_A", "TEAM_B"].includes(team)) {
      setNotice(
        "Enter a candidate name and choose a position and partylist before saving.",
      );
      return;
    }

    formData.set("election_id", String(dashboard.election.id));
    setSubmitting(true);
    const token = getAdminToken();

    if (!token || !canEdit) {
      setSubmitting(false);
      setNotice("Select a draft election before saving candidates.");
      return;
    }

    try {
      const response = await saveAdminCandidate(token, formData);

      setCandidates((current) => [
        ...current.filter(
          (item) => item.student_id !== response.data.student_id,
        ),
        response.data,
      ]);
      setNotice(response.message);
      setModalOpen(false);
      setSelectedCandidate(null);
    } catch (error) {
      setNotice(
        error instanceof ApiError
          ? error.message
          : "Unable to save the candidate right now.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(candidate: CandidateRecord) {
    if (!canEdit) {
      setNotice("Select a draft election to delete candidates.");
      return;
    }
    if (!window.confirm(`Remove ${candidate.full_name} from this election?`))
      return;

    const token = getAdminToken();
    if (!token) return;

    try {
      const response = await deleteAdminCandidate(
        token,
        candidate.student_id,
        dashboard.election.id,
      );
      setCandidates((current) =>
        current.filter((item) => item.student_id !== candidate.student_id),
      );
      setNotice(response.message);
    } catch (error) {
      setNotice(
        error instanceof ApiError
          ? error.message
          : "Unable to delete the candidate right now.",
      );
    }
  }

  async function handleActivate() {
    if (!canActivate) {
      setNotice(
        "Add at least one candidate to every position before activating the election.",
      );
      return;
    }
    if (
      !window.confirm(
        "Activate this election now? Positions and candidates become read-only after activation.",
      )
    )
      return;

    const token = getAdminToken();
    if (!token) return;

    setActivating(true);
    try {
      await activateAdminElection(token, dashboard.election.id);
      navigate("/admin/dashboard", { replace: true });
    } catch (error) {
      setNotice(
        error instanceof ApiError
          ? error.message
          : "Unable to activate the election right now.",
      );
      setActivating(false);
    }
  }

  if (dataState !== "live") {
    return (
      <main className="admin-dashboard admin-overview admin-management admin-candidates">
        <AdminSidebar active="candidates" overview />
        <section className="admin-dashboard__content admin-candidates__content">
          <AdminDataState message={dataNotice} state={dataState} />
        </section>
      </main>
    );
  }

  return (
    <main className="admin-dashboard admin-overview admin-management admin-candidates">
      <AdminSidebar active="candidates" overview />

      <section className="admin-dashboard__content admin-candidates__content">
        <header className="admin-candidates__header">
          <div>
            <h1>Candidates</h1>
            <p>
              Manage the candidates running in the {dashboard.election.name}.
            </p>
          </div>
          <AdminElectionPicker
            elections={elections}
            onChange={(id) => {
              setCandidates([]);
              setPositions([]);
              setRecordsState("loading");
              selectElection(id);
            }}
            selectedElectionId={selectedElectionId}
          />
          <button
            className="admin-candidates__activate"
            disabled={!canActivate || activating}
            onClick={handleActivate}
            title={
              !canActivate
                ? "Add at least one candidate to every position first"
                : undefined
            }
            type="button"
          >
            {activating ? "Activating…" : "Activate Election"}
          </button>
          <button
            disabled={!canAddCandidate}
            onClick={openAddModal}
            title={
              !canEdit
                ? "Select a draft election to make changes"
                : positions.length === 0
                  ? "Wait for the default positions to load"
                  : undefined
            }
            type="button"
          >
            <Plus aria-hidden="true" weight="bold" />
            Add Candidate
          </button>
        </header>

        <section aria-label="Candidate summary" className="candidate-summary">
          <SummaryCard label="Total Candidates" value={candidates.length} />
          {positions.map((position) => (
            <SummaryCard
              key={position.id}
              label={position.name}
              value={countsByPosition.get(position.id) ?? 0}
            />
          ))}
        </section>

        <section aria-label="Candidate filters" className="candidate-filters">
          <label>
            <span className="sr-only">Search candidates</span>
            <input
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search"
              type="search"
              value={query}
            />
            <MagnifyingGlass aria-hidden="true" />
          </label>
          <label>
            <span className="sr-only">Filter by position</span>
            <select
              aria-label="Filter by position"
              onChange={(event) => setPositionFilter(event.target.value)}
              value={positionFilter}
            >
              <option value="all">All Position</option>
              {positions.map((position) => (
                <option key={position.id} value={position.id}>
                  {position.name}
                </option>
              ))}
            </select>
          </label>
        </section>

        <section aria-label="Candidates" className="candidate-grid">
          {filteredCandidates.map((candidate) => (
            <article className="candidate-card" key={candidate.student_id}>
              <div className="candidate-card__avatar">
                {candidate.profile_photo_url ? (
                  <img alt="" src={candidate.profile_photo_url} />
                ) : (
                  <User aria-hidden="true" weight="fill" />
                )}
              </div>
              <div className="candidate-card__body">
                <div>
                  <p className="candidate-card__eyebrow">
                    {candidate.position.name}
                  </p>
                  <h2>{candidate.full_name}</h2>
                  <p>
                    {candidate.team === "TEAM_A"
                      ? "Partylist A"
                      : candidate.team === "TEAM_B"
                        ? "Partylist B"
                        : candidate.team}
                  </p>
                  <small>
                    {candidate.motto ?? "Platform details to follow."}
                  </small>
                </div>
                <div className="candidate-card__actions">
                  <button
                    disabled={!canEdit}
                    onClick={() => openEditModal(candidate)}
                    type="button"
                  >
                    Edit
                  </button>
                  <button
                    disabled={!canEdit}
                    onClick={() => handleDelete(candidate)}
                    type="button"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </article>
          ))}
          {filteredCandidates.length === 0 && (
            <div className="candidate-grid__empty" role="status">
              <User aria-hidden="true" />
              <h2>
                {recordsState === "loading"
                  ? "Loading candidates…"
                  : recordsState === "error"
                    ? "Candidate records unavailable"
                    : candidates.length === 0
                      ? "No candidates added yet"
                      : "No matching candidates"}
              </h2>
              <p>
                {recordsState === "loading"
                  ? "Fetching candidates and available positions."
                  : recordsState === "error"
                    ? notice
                    : candidates.length === 0
                      ? canEdit
                        ? "Choose Add Candidate to create the first profile for this election."
                        : "No candidates are registered for this election."
                      : "Try a different name or position filter."}
              </p>
            </div>
          )}
        </section>

        <p aria-live="polite" className="admin-dashboard__notice" role="status">
          {modalOpen
            ? ""
            : notice ||
              (!canEdit
                ? "This election is read-only. Select a draft election to manage candidates."
                : dataNotice)}
        </p>
      </section>

      {modalOpen && (
        <dialog
          ref={dialogRef}
          aria-labelledby="candidate-modal-title"
          className="candidate-modal"
          onCancel={(event) => {
            event.preventDefault();
            closeModal();
          }}
          onClick={(event) => {
            if (event.target !== event.currentTarget) return;
            const bounds = event.currentTarget.getBoundingClientRect();
            if (
              event.clientX < bounds.left ||
              event.clientX > bounds.right ||
              event.clientY < bounds.top ||
              event.clientY > bounds.bottom
            )
              closeModal();
          }}
        >
          <button
            aria-label="Close candidate dialog"
            className="candidate-modal__close"
            disabled={submitting}
            onClick={closeModal}
            type="button"
          >
            <X aria-hidden="true" />
          </button>
          <h2 id="candidate-modal-title">
            {selectedCandidate ? "Edit Candidate" : "Add Candidate"}
          </h2>
          <p className="candidate-modal__intro">
            Enter the candidate’s position, platform, photo, and achievements.
          </p>
          <form onSubmit={handleSave}>
            <label>
              Full Name
              <input
                autoFocus
                defaultValue={selectedCandidate?.full_name ?? ""}
                maxLength={255}
                name="full_name"
                placeholder="Enter candidate full name"
                required
              />
            </label>
            {selectedCandidate && (
              <input
                name="student_id"
                type="hidden"
                value={selectedCandidate.student_id}
              />
            )}
            <label>
              Position
              <select
                aria-label="Position"
                defaultValue={selectedCandidate?.position.id ?? ""}
                name="position_id"
                required
              >
                <option disabled value="">
                  Select a position
                </option>
                {positions.map((position) => (
                  <option key={position.id} value={position.id}>
                    {position.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Partylist
              <select
                aria-label="Partylist"
                defaultValue={selectedCandidate?.team ?? ""}
                name="team"
                required
              >
                <option disabled value="">
                  Select a partylist
                </option>
                <option value="TEAM_A">Partylist A</option>
                <option value="TEAM_B">Partylist B</option>
              </select>
            </label>
            <label>
              Platform
              <textarea
                defaultValue={selectedCandidate?.motto ?? ""}
                maxLength={255}
                name="motto"
                placeholder="Candidate platform or motto"
                rows={3}
              />
            </label>
            <label>
              Profile photo
              <input
                accept="image/jpeg,image/png,image/webp"
                name="profile_photo"
                type="file"
              />
            </label>
            <div className="candidate-modal__field">
              <label htmlFor="candidate-achievements">Achievements</label>
              <textarea
                defaultValue={selectedCandidate?.achievements ?? ""}
                id="candidate-achievements"
                maxLength={5000}
                name="achievements"
                placeholder="Awards, projects, and accomplishments"
                rows={4}
              />
            </div>
            {notice && (
              <p className="candidate-modal__notice" role="alert">
                {notice}
              </p>
            )}
            <div className="candidate-modal__actions">
              <button disabled={submitting} onClick={closeModal} type="button">
                Cancel
              </button>
              <button disabled={submitting} type="submit">
                {submitting ? "Saving…" : "Save"}
              </button>
            </div>
          </form>
        </dialog>
      )}
    </main>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <article>
      <p>{label}</p>
      <strong>{value}</strong>
    </article>
  );
}
