import { useEffect, useMemo, useState, type FormEvent } from "react";
import { MagnifyingGlass, Plus, User, X } from "@phosphor-icons/react";

import { AdminSidebar } from "@/components/features/admin-dashboard/admin-sidebar";
import { AdminDataState, AdminElectionPicker } from "@/components/features/admin-dashboard/admin-data-state";
import { useAdminElectionDashboard } from "@/hooks/use-admin-election-dashboard";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { getAdminToken } from "@/lib/admin-session";
import { listAdminCandidates, listAdminPositions, listAdminStudents, saveAdminCandidate } from "@/services/admin-dashboard-service";
import { ApiError } from "@/services/api-client";
import type { CandidateRecord } from "@/types/candidate";
import type { PositionRecord } from "@/types/position";
import type { StudentRecord } from "@/types/student";

import "../admin-dashboard/admin-dashboard-screen.css";
import "./admin-candidates-screen.css";

export function AdminCandidatesScreen() {
  const { dashboard, dataState, dataNotice, elections, selectedElectionId, selectElection } = useAdminElectionDashboard("draft");
  const [candidates, setCandidates] = useState<CandidateRecord[]>([]);
  const [positions, setPositions] = useState<PositionRecord[]>([]);
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [query, setQuery] = useState("");
  const [positionFilter, setPositionFilter] = useState("all");
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateRecord | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useDocumentTitle("Candidates | CPC Vote Admin");

  useEffect(() => {
    const token = getAdminToken();
    if (!token || dataState !== "live") return;

    let active = true;
    Promise.all([
      listAdminCandidates(token, dashboard.election.id),
      listAdminPositions(token, dashboard.election.id),
      listAdminStudents(token),
    ])
      .then(([candidateResponse, positionResponse, studentResponse]) => {
        if (!active) return;
        setCandidates(candidateResponse.data);
        setPositions(positionResponse.data);
        setStudents(studentResponse.data.filter((student) => student.academic_status === "enrolled"));
      })
      .catch((error: unknown) => {
        if (active) setNotice(error instanceof Error ? error.message : "Unable to load candidates.");
      });

    return () => { active = false; };
  }, [dashboard.election.id, dataState]);

  const countsByPosition = useMemo(() => {
    const counts = new Map<string, number>();
    candidates.forEach((candidate) => counts.set(candidate.position.name, (counts.get(candidate.position.name) ?? 0) + 1));
    return counts;
  }, [candidates]);

  const filteredCandidates = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return candidates.filter((candidate) => {
      const matchesPosition = positionFilter === "all" || candidate.position.id === Number(positionFilter);
      const matchesQuery = !normalized || [candidate.full_name, candidate.student_id, candidate.team, candidate.motto ?? ""]
        .some((value) => value.toLowerCase().includes(normalized));
      return matchesPosition && matchesQuery;
    });
  }, [candidates, positionFilter, query]);
  const canEdit = dataState === "live" && dashboard.election.status === "draft";

  function openAddModal() {
    if (!canEdit) {
      setNotice("Select a draft election to add candidates.");
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
    const studentId = String(formData.get("student_id") ?? "");
    const positionId = Number(formData.get("position_id"));
    const team = String(formData.get("team") ?? "");
    const student = students.find((item) => item.student_id === studentId);
    const position = positions.find((item) => item.id === positionId);

    if (!student || !position || !["TEAM_A", "TEAM_B"].includes(team)) {
      setNotice("Choose a student, position, and partylist before saving.");
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

      const photo = formData.get("profile_photo");
      const profilePhotoUrl = photo instanceof File && photo.size > 0 ? URL.createObjectURL(photo) : selectedCandidate?.profile_photo_url ?? null;
      const savedCandidate: CandidateRecord = {
        student_id: student.student_id,
        full_name: student.full_name,
        profile_photo_url: profilePhotoUrl,
        motto: String(formData.get("motto") ?? "").trim() || null,
        team,
        position: { id: position.id, name: position.name },
      };
      setCandidates((current) => [...current.filter((item) => item.student_id !== studentId), savedCandidate]);
      setNotice(response.message);
      setModalOpen(false);
      setSelectedCandidate(null);
    } catch (error) {
      setNotice(error instanceof ApiError ? error.message : "Unable to save the candidate right now.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleUnavailable(label: string) {
    setNotice(`${label} management will be connected in the next screen.`);
  }

  const summaryPositions = ["President", "Vice President", "Senator"];

  if (dataState !== "live") {
    return (
      <main className="admin-dashboard admin-candidates">
        <AdminSidebar active="candidates" onUnavailable={handleUnavailable} />
        <section className="admin-dashboard__content admin-candidates__content">
          <AdminDataState message={dataNotice} state={dataState} />
        </section>
      </main>
    );
  }

  return (
    <main className="admin-dashboard admin-candidates">
      <AdminSidebar active="candidates" onUnavailable={handleUnavailable} />

      <section className="admin-dashboard__content admin-candidates__content">
        <header className="admin-candidates__header">
          <div><h1>Candidates</h1><p>Manage the candidates running in the {dashboard.election.name}.</p></div>
          <AdminElectionPicker elections={elections} onChange={(id) => { setCandidates([]); setPositions([]); selectElection(id); }} selectedElectionId={selectedElectionId} />
          <button disabled={!canEdit} onClick={openAddModal} title={!canEdit ? "Select a draft election to make changes" : undefined} type="button"><Plus aria-hidden="true" weight="bold" />Add Candidate</button>
        </header>

        <section aria-label="Candidate summary" className="candidate-summary">
          <SummaryCard label="Total Candidates" value={candidates.length} />
          {summaryPositions.map((positionName) => <SummaryCard key={positionName} label={positionName === "Senator" ? "Senators" : positionName} value={countsByPosition.get(positionName) ?? 0} />)}
        </section>

        <section aria-label="Candidate filters" className="candidate-filters">
          <label><span className="sr-only">Search candidates</span><input onChange={(event) => setQuery(event.target.value)} placeholder="Search" type="search" value={query} /><MagnifyingGlass aria-hidden="true" /></label>
          <label><span className="sr-only">Filter by position</span><select onChange={(event) => setPositionFilter(event.target.value)} value={positionFilter}><option value="all">All Position</option>{positions.map((position) => <option key={position.id} value={position.id}>{position.name}</option>)}</select></label>
        </section>

        <section aria-label="Candidates" className="candidate-grid">
          {filteredCandidates.map((candidate) => (
            <article className="candidate-card" key={candidate.student_id}>
              <div className="candidate-card__banner" />
              <div className="candidate-card__avatar">
                {candidate.profile_photo_url ? <img alt="" src={candidate.profile_photo_url} /> : <User aria-hidden="true" weight="fill" />}
              </div>
              <div className="candidate-card__body">
                <div><p className="candidate-card__eyebrow">{candidate.position.name}</p><h2>{candidate.full_name}</h2><p>{candidate.team === "TEAM_A" ? "Partylist A" : candidate.team === "TEAM_B" ? "Partylist B" : candidate.team}</p><small>{candidate.motto ?? "Platform details to follow."}</small></div>
                <div className="candidate-card__actions"><button disabled={!canEdit} onClick={() => openEditModal(candidate)} type="button">Edit</button><button disabled title="Candidate deletion requires a backend endpoint" type="button">Delete</button></div>
              </div>
            </article>
          ))}
          {filteredCandidates.length === 0 && <p className="candidate-grid__empty">No candidates match this search.</p>}
        </section>

        <p aria-live="polite" className="admin-dashboard__notice" role="status">{notice || (!canEdit ? "This election is read-only. Select a draft election to manage candidates." : dataNotice)}</p>
      </section>

      {modalOpen && (
        <div className="candidate-modal__backdrop" role="presentation">
          <section aria-labelledby="candidate-modal-title" aria-modal="true" className="candidate-modal" role="dialog">
            <button aria-label="Close candidate dialog" className="candidate-modal__close" disabled={submitting} onClick={closeModal} type="button"><X aria-hidden="true" /></button>
            <h2 id="candidate-modal-title">{selectedCandidate ? "Edit Candidate" : "Add Candidate"}</h2>
            <form onSubmit={handleSave}>
              <label>Full Name<select autoFocus defaultValue={selectedCandidate?.student_id ?? ""} disabled={Boolean(selectedCandidate)} name="student_id" required><option disabled value="">Select a student</option>{students.map((student) => <option key={student.student_id} value={student.student_id}>{student.full_name} · {student.student_id}</option>)}</select>{selectedCandidate && <input name="student_id" type="hidden" value={selectedCandidate.student_id} />}</label>
              <label>Position<select defaultValue={selectedCandidate?.position.id ?? ""} name="position_id" required><option disabled value="">Select a position</option>{positions.map((position) => <option key={position.id} value={position.id}>{position.name}</option>)}</select></label>
              <label>Partylist<select defaultValue={selectedCandidate?.team ?? ""} name="team" required><option disabled value="">Select a partylist</option><option value="TEAM_A">Partylist A</option><option value="TEAM_B">Partylist B</option></select></label>
              <label>Platform<textarea defaultValue={selectedCandidate?.motto ?? ""} maxLength={255} name="motto" placeholder="Candidate platform or motto" rows={3} /></label>
              <label>Upload<input accept="image/jpeg,image/png,image/webp" name="profile_photo" type="file" /></label>
              <div className="candidate-modal__actions"><button disabled={submitting} onClick={closeModal} type="button">Cancel</button><button disabled={submitting} type="submit">{submitting ? "Saving…" : "Save"}</button></div>
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
