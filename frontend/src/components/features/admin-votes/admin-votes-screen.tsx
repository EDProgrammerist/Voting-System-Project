import { useMemo, useState } from "react";
import { ChartBar, Printer, User } from "@phosphor-icons/react";
import { Link } from "react-router";

import { AdminDataState } from "@/components/features/admin-dashboard/admin-data-state";
import { useAdminElectionDashboard } from "@/hooks/use-admin-election-dashboard";
import { useDocumentTitle } from "@/hooks/use-document-title";
import type { CandidateResult } from "@/types/dashboard";

import "../admin-dashboard/admin-dashboard-screen.css";
import "../admin-dashboard/admin-overview.css";
import "../admin-dashboard/admin-management.css";
import "./admin-votes-screen.css";

const ALL_POSITIONS = "All";

function displayPosition(position: string): string {
  return position.toLowerCase() === "senator" ? "Senators" : position;
}

export function AdminVotesScreen() {
  const { dashboard, dataState, dataNotice } = useAdminElectionDashboard();
  const [activePosition, setActivePosition] = useState(ALL_POSITIONS);

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

  const visibleGroups =
    activePosition === ALL_POSITIONS
      ? groupedResults
      : groupedResults.filter((group) => group.position === activePosition);

  if (dataState !== "live") {
    return (
      <>
        <section className="admin-dashboard__content admin-votes__content">
          <AdminDataState message={dataNotice} state={dataState} />
        </section>
      </>
    );
  }

  return (
    <>

      <section className="admin-dashboard__content admin-votes__content">
        <header className="admin-votes__header">
          <div>
            <h1>Votes</h1>
            <p>{dashboard.election.name} · Results grouped by position.</p>
          </div>
          <button
            className="admin-votes__print"
            onClick={() => window.print()}
            type="button"
          >
            <Printer aria-hidden="true" weight="fill" />
            <span>Print/Export</span>
          </button>
        </header>

        <section
          className="admin-votes__team-totals"
          aria-label="Live team totals"
        >
          <article data-team="TEAM_A">
            <span>{dashboard.partylist_names?.TEAM_A ?? "Partylist A"} selections</span>
            <strong>{dashboard.team_totals.TEAM_A.toLocaleString()}</strong>
          </article>
          <article data-team="TEAM_B">
            <span>{dashboard.partylist_names?.TEAM_B ?? "Partylist B"} selections</span>
            <strong>{dashboard.team_totals.TEAM_B.toLocaleString()}</strong>
          </article>
        </section>

        <div
          className="admin-votes__filters"
          aria-label="Filter results by position"
          role="group"
        >
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
          {visibleGroups.length === 0 && (
            <section className="management-empty">
              <ChartBar aria-hidden="true" />
              <h2>No candidate results yet</h2>
              <p>
                Results will appear when candidates are added to this election.
              </p>
              <Link to="/admin/candidates">View candidates</Link>
            </section>
          )}
          {visibleGroups.map((group) => (
            <PositionResults
              candidates={group.candidates}
              key={group.position}
              position={displayPosition(group.position)}
            />
          ))}
        </div>

        <p aria-live="polite" className="admin-dashboard__notice" role="status">
          {dataNotice}
        </p>
      </section>
    </>
  );
}

function PositionResults({
  candidates,
  position,
}: {
  candidates: CandidateResult[];
  position: string;
}) {
  const maxVotes = Math.max(
    ...candidates.map((candidate) => candidate.votes),
    1,
  );

  return (
    <article className="position-results">
      <h2>{position}</h2>
      <div className="position-results__candidates">
        {candidates.map((candidate, index) => {
          const percentage = Math.max((candidate.votes / maxVotes) * 100, 8);
          return (
            <div
              className="vote-result"
              key={`${candidate.student_id}-${candidate.position}`}
            >
              <div className="vote-result__avatar">
                {candidate.profile_photo_url ? (
                  <img alt="" src={candidate.profile_photo_url} />
                ) : (
                  <User aria-hidden="true" weight="fill" />
                )}
              </div>
              <div className="vote-result__details">
                <div className="vote-result__label">
                  <strong>{candidate.full_name}</strong>
                  <span>{candidate.votes.toLocaleString()} votes</span>
                </div>
                <div className="vote-result__track" aria-hidden="true">
                  <div
                    className="vote-result__bar"
                    data-rank={index + 1}
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </article>
  );
}
