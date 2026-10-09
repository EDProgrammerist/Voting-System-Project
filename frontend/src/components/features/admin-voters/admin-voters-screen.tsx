import { useEffect, useMemo, useState, type FormEvent } from "react";
import { CaretDown, MagnifyingGlass } from "@phosphor-icons/react";

import { AdminSidebar } from "@/components/features/admin-dashboard/admin-sidebar";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { getAdminToken } from "@/lib/admin-session";
import { listAdminStudents } from "@/services/admin-dashboard-service";
import type { StudentRecord } from "@/types/student";

import "../admin-dashboard/admin-dashboard-screen.css";
import "./admin-voters-screen.css";

function formatStatus(value: string): string {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function AdminVotersScreen() {
  const [voters, setVoters] = useState<StudentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [status, setStatus] = useState("All Status");
  const [notice, setNotice] = useState("");

  useDocumentTitle("Voters | CPC Vote Admin");

  useEffect(() => {
    const token = getAdminToken();
    if (!token) return;

    let active = true;
    listAdminStudents(token)
      .then((response) => {
        if (!active) return;
        setVoters(response.data);
        setNotice("");
      })
      .catch((error: unknown) => {
        if (active) setNotice(error instanceof Error ? error.message : "Unable to load student records.");
      })
      .finally(() => { if (active) setLoading(false); });

    return () => {
      active = false;
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

  function handleUnavailable(label: string) {
    setNotice(`${label} management will be connected in the next screen.`);
  }

  return (
    <main className="admin-dashboard admin-voters">
      <AdminSidebar active="voters" onUnavailable={handleUnavailable} />

      <section className="admin-dashboard__content admin-voters__content">
        <header className="admin-voters__header">
          <h1>Voters</h1>
          <p>Review registered students and their academic eligibility.</p>
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
                  <th scope="col">Academic Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredVoters.map((voter) => (
                  <tr key={voter.student_id}>
                    <td>{voter.student_id}</td>
                    <td><strong>{voter.full_name}</strong></td>
                    <td><span className="voter-status" data-status={voter.academic_status.toLowerCase().replace(" ", "-")}>{formatStatus(voter.academic_status)}</span></td>
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
