import { useEffect, useMemo, useState, type FormEvent } from "react";
import { CaretDown, MagnifyingGlass } from "@phosphor-icons/react";

import { AdminSidebar } from "@/components/features/admin-dashboard/admin-sidebar";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { getAdminToken } from "@/lib/admin-session";
import { listAllAdminStudents } from "@/services/admin-dashboard-service";
import type { VoterRecord } from "@/types/student";

import "../admin-dashboard/admin-dashboard-screen.css";
import "./admin-voters-screen.css";

const LIVE_REFRESH_INTERVAL_MS = 2_000;

function formatStatus(value: string): string {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatCourse(value: string | null): string {
  if (!value) return "Unspecified";
  if (value === "BSHM") return "HM";
  if (value === "BEED") return "BEEd";
  if (value === "BSED") return "BSEd";
  return value;
}

export function AdminVotersScreen() {
  const [voters, setVoters] = useState<VoterRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [status, setStatus] = useState("All Status");
  const [notice, setNotice] = useState("");

  useDocumentTitle("Voters | CPC Vote Admin");

  useEffect(() => {
    const token = getAdminToken();
    if (!token) return;
    const adminToken = token;

    let active = true;
    let requestInFlight = false;
    let hasLoadedData = false;
    let controller: AbortController | null = null;

    async function refreshVoters() {
      if (!active || requestInFlight) return;

      requestInFlight = true;
      const requestController = new AbortController();
      controller = requestController;

      try {
        const response = await listAllAdminStudents(
          adminToken,
          {
            status: "enrolled",
            signal: requestController.signal,
          },
        );
        if (!active) return;
        setVoters(response);
        hasLoadedData = true;
        setNotice("");
      } catch (error) {
        if (!active || requestController.signal.aborted) return;
        setNotice(
          hasLoadedData
            ? "Live voter updates are temporarily unavailable. Retrying automatically…"
            : error instanceof Error
              ? error.message
              : "Unable to load student records.",
        );
      } finally {
        requestInFlight = false;
        if (active) setLoading(false);
      }
    }

    function refreshWhenVisible() {
      if (!document.hidden) void refreshVoters();
    }

    void refreshVoters();
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
  }, []);

  const statuses = useMemo(
    () => [...new Set(voters.map((voter) => voter.academic_status))],
    [voters],
  );
  const filteredVoters = useMemo(() => {
    const search = submittedQuery.trim().toLowerCase();
    return voters.filter((voter) => {
      const matchesSearch = !search
        || voter.student_id.toLowerCase().includes(search)
        || voter.full_name.toLowerCase().includes(search);
      const matchesStatus = status === "All Status" || voter.academic_status === status;
      return matchesSearch && matchesStatus;
    });
  }, [status, submittedQuery, voters]);

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmittedQuery(query);
  }

  return (
    <main className="admin-dashboard admin-voters">
      <AdminSidebar active="voters" />

      <section className="admin-dashboard__content admin-voters__content">
        <header className="admin-voters__header">
          <h1>Voters</h1>
          <p>Review enrolled students and their live voting status.</p>
        </header>

        <form className="voter-filters" onSubmit={handleSearch}>
          <div className="voter-filters__search">
            <label htmlFor="voter-search">Search Student Name or ID</label>
            <input
              id="voter-search"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search Student  Name or ID"
              type="search"
              value={query}
            />
            <button aria-label="Search voters" type="submit">
              <MagnifyingGlass aria-hidden="true" />
            </button>
          </div>

          <label className="voter-filters__select">
            <span>Filter by academic status</span>
            <select onChange={(event) => setStatus(event.target.value)} value={status}>
              <option>All Status</option>
              {statuses.map((item) => <option key={item} value={item}>{formatStatus(item)}</option>)}
            </select>
            <CaretDown aria-hidden="true" weight="bold" />
          </label>
        </form>

        <section className="voters-table-card" aria-label="Registered voters">
          <div className="voters-table__scroll">
            <table className="voters-table">
              <thead>
                <tr>
                  <th scope="col">Student ID</th>
                  <th scope="col">Name</th>
                  <th scope="col">Course</th>
                  <th scope="col">Academic Status</th>
                  <th scope="col">Voting Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredVoters.map((voter) => (
                  <tr key={voter.student_id}>
                    <td>{voter.student_id}</td>
                    <td><strong>{voter.full_name}</strong></td>
                    <td>{formatCourse(voter.course)}</td>
                    <td><span className="voter-status" data-status={voter.academic_status.toLowerCase().replace(" ", "-")}>{formatStatus(voter.academic_status)}</span></td>
                    <td><span className="voter-status" data-status={voter.voting_status.replaceAll("_", "-")}>{formatStatus(voter.voting_status)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!loading && filteredVoters.length === 0 && (
            <div className="voters-table__empty">
              <MagnifyingGlass aria-hidden="true" />
              <strong>No voters found</strong>
              <p>Try changing the search or filters.</p>
            </div>
          )}
        </section>

        <p aria-live="polite" className="admin-dashboard__notice" role="status">{loading ? "Loading student records…" : notice}</p>
      </section>
    </main>
  );
}
