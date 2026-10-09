import { useMemo, useState } from "react";
import { Printer, User } from "@phosphor-icons/react";

import { AdminSidebar } from "@/components/features/admin-dashboard/admin-sidebar";
import { AdminDataState } from "@/components/features/admin-dashboard/admin-data-state";
import { useAdminElectionDashboard } from "@/hooks/use-admin-election-dashboard";
import { useDocumentTitle } from "@/hooks/use-document-title";
import type { CandidateResult } from "@/types/dashboard";

import "../admin-dashboard/admin-dashboard-screen.css";
import "./admin-votes-screen.css";

const ALL_POSITIONS = "All";

function displayPosition(position: string): string {
  return position.toLowerCase() === "senator" ? "Senators" : position;
}

function electionYear(name: string): string {
  return name.match(/\b(20\d{2})\b/)?.[1] ?? "2026";
}

export function AdminVotesScreen() {
  const { dashboard, dataState, dataNotice } = useAdminElectionDashboard();
  const [activePosition, setActivePosition] = useState(ALL_POSITIONS);
  const [notice, setNotice] = useState("");

  useDocumentTitle("Votes | CPC Vote Admin");

  const groupedResults = useMemo(() => {
    const groups = new Map<string, CandidateResult[]>();
    dashboard.candidate_results.forEach((candidate) => {
      const existing = groups.get(candidate.position) ?? [];
      existing.push(candidate);
      groups.set(candidate.position, existing);
    });

    return [...groups.entries()].map(([position, candidates]) => ({
      position,
      candidates: [...candidates].sort((a, b) => b.votes - a.votes),
    }));
  }, [dashboard]);

  const visibleGroups = activePosition === ALL_POSITIONS
    ? groupedResults
    : groupedResults.filter((group) => group.position === activePosition);

  function handleUnavailable(label: string) {
    setNotice(`${label} management will be connected in the next screen.`);
  }

  if (dataState !== "live") {
    return (
      <main className="admin-dashboard admin-votes">
        <AdminSidebar active="votes" onUnavailable={handleUnavailable} />
        <section className="admin-dashboard__content admin-votes__content">
          <AdminDataState message={dataNotice} state={dataState} />
        </section>
      </main>
    );
  }

  return (
    <main className="admin-dashboard admin-votes">
      <AdminSidebar active="votes" onUnavailable={handleUnavailable} />

      <section className="admin-dashboard__content admin-votes__content">
        <header className="admin-votes__header">
          <div>
            <h1>Votes</h1>
            <p>
              Live results of the CPC Election {electionYear(dashboard.election.name)}, grouped by position.
            </p>
          </div>
          <button className="admin-votes__print" onClick={() => window.print()} type="button">
            <Printer aria-hidden="true" weight="fill" />
            <span>Print/Export</span>
          </button>
        </header>

        <div className="admin-votes__filters" aria-label="Filter results by position" role="group">
          <button
            aria-pressed={activePosition === ALL_POSITIONS}
            onClick={() => setActivePosition(ALL_POSITIONS)}
            type="button"
          >
            All
          </button>
          {groupedResults.map((group) => (
            <button
              aria-pressed={activePosition === group.position}
              key={group.position}
              onClick={() => setActivePosition(group.position)}
              type="button"
            >
              {displayPosition(group.position)}
            </button>
          ))}
        </div>

        <div className="admin-votes__results" aria-live="polite">
          {visibleGroups.map((group) => (
            <PositionResults
              candidates={group.candidates}
              key={group.position}
              position={displayPosition(group.position)}
            />
          ))}
        </div>

        <p aria-live="polite" className="admin-dashboard__notice" role="status">
          {notice || dataNotice}
        </p>
      </section>
    </main>
  );
}

function PositionResults({
  candidates,
  position,
}: {
  candidates: CandidateResult[];
  position: string;
}) {
  const maxVotes = Math.max(...candidates.map((candidate) => candidate.votes), 1);

  return (
    <article className="position-results">
      <h2>{position}</h2>
      <div className="position-results__candidates">
        {candidates.map((candidate, index) => {
          const percentage = Math.max((candidate.votes / maxVotes) * 100, 8);
          return (
            <div className="vote-result" key={`${candidate.student_id}-${candidate.position}`}>
              <div className="vote-result__avatar">
                {candidate.profile_photo_url ? (
                  <img alt="" src={candidate.profile_photo_url} />
                ) : (
                  <User aria-hidden="true" weight="fill" />
                )}
              </div>
              <div className="vote-result__track">
                <div
                  className="vote-result__bar"
                  data-rank={index + 1}
                  style={{ width: `${percentage}%` }}
                >
                  <strong>{candidate.full_name}</strong>
                  <span>{candidate.votes.toLocaleString()} votes</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </article>
  );
}
