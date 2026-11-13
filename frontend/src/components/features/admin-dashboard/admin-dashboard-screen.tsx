import { PageSkeleton } from "@/components/common/page-skeleton";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  CheckSquareOffset,
  Info,
  Users,
  WarningCircle,
} from "@phosphor-icons/react";
import { Link } from "react-router";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";

import { useAdminElectionDashboard } from "@/hooks/use-admin-election-dashboard";
import { useDocumentTitle } from "@/hooks/use-document-title";
import type { CandidateResult, DashboardData } from "@/types/dashboard";

import "./admin-dashboard-screen.css";
import "./admin-overview.css";

const formatNumber = (value: number) =>
  new Intl.NumberFormat("en-US").format(value);
const formatDate = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat("en-PH", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(value))
    : "Not scheduled";

function useCountdown(target: string | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);
  if (!target || new Date(target).getTime() <= now) return null;
  const difference = new Date(target).getTime() - now;
  return `${Math.floor(difference / 86_400_000)}d ${Math.floor((difference % 86_400_000) / 3_600_000)}h ${Math.floor((difference % 3_600_000) / 60_000)}m`;
}

export function AdminDashboardScreen() {
  const { dashboard, dataState, dataNotice } = useAdminElectionDashboard();
  const countdown = useCountdown(dashboard.election.starts_at);
  useDocumentTitle("Admin Dashboard | CPC Vote");

  if (dataState === "loading") return <section className="admin-dashboard__content"><PageSkeleton kind="dashboard" label="Loading election overview" /></section>;

  return (
    <>
      <section
        className="admin-dashboard__content"
      >
        <header className="overview-heading">
          <div>
            <p>Administration / Dashboard</p>
            <h1>Election overview</h1>
          </div>
          <span className="overview-updates">
            <i
              data-state={
                dataState === "live" && !dataNotice ? "connected" : "waiting"
              }
            />
            {dataState === "live"
              ? dataNotice
                ? "Updates interrupted"
                : "Auto-updates every 2s"
              : "Connection unavailable"}
          </span>
        </header>

        {dataState !== "live" ? (
          <section
            className="overview-state overview-panel"
            aria-live="polite"
            role="status"
          >
            <WarningCircle aria-hidden="true" />
            <h2>Election data unavailable</h2>
            <p>{dataNotice || "Please refresh the page and try again."}</p>
          </section>
        ) : (
          <>
            <section
              className="overview-election overview-panel"
              aria-label="Current election"
            >
              <div className="overview-election__identity">
                <span
                  className="overview-status"
                  data-status={dashboard.election.status}
                >
                  <i />
                  {dashboard.election.status === "draft"
                    ? "Draft election"
                    : dashboard.election.status === "active"
                      ? "Active election"
                      : dashboard.election.status === "closed"
                        ? "Closed election"
                        : dashboard.election.status}
                </span>
                <h2>{dashboard.election.name}</h2>
                <p>
                  {dashboard.election.status === "draft"
                    ? "Election setup is in progress. Voting has not opened."
                    : dashboard.election.status === "closed"
                      ? "This election is closed. Review participation and recorded results below."
                      : "Monitor participation and recorded results below."}
                </p>
              </div>
              <dl className="overview-schedule">
                <div>
                  <dt>Opens</dt>
                  <dd>{formatDate(dashboard.election.starts_at)}</dd>
                </div>
                <div>
                  <dt>Closes</dt>
                  <dd>{formatDate(dashboard.election.ends_at)}</dd>
                </div>
                {countdown && dashboard.election.status === "draft" && (
                  <div>
                    <dt>Starts in</dt>
                    <dd>{countdown}</dd>
                  </div>
                )}
              </dl>
            </section>

            {dataNotice && (
              <p className="overview-alert" role="status">
                <WarningCircle aria-hidden="true" />
                {dataNotice} Displaying the last received data.
              </p>
            )}

            <section className="overview-metrics" aria-label="Election summary">
              {[
                {
                  label: "Eligible voters",
                  value: dashboard.turnout.eligible_students,
                  detail: "Enrolled students",
                },
                {
                  label: "Ballots cast",
                  value: dashboard.turnout.already_voted,
                  detail: `${dashboard.turnout.percentage}% turnout`,
                  href: "/admin/votes",
                },
                {
                  label: "Not yet voted",
                  value: dashboard.turnout.not_yet_voted,
                  detail: "Eligible voters remaining",
                },
                {
                  label: "Candidates",
                  value: dashboard.candidate_results.length,
                  detail: "In this election",
                  href: "/admin/candidates",
                },
              ].map((metric) =>
                metric.href ? (
                  <Link
                    className="overview-metric"
                    key={metric.label}
                    to={metric.href}
                  >
                    <span>
                      {metric.label}
                      <ArrowRight aria-hidden="true" />
                    </span>
                    <strong>{formatNumber(metric.value)}</strong>
                    <small>{metric.detail}</small>
                  </Link>
                ) : (
                  <article className="overview-metric" key={metric.label}>
                    <span>{metric.label}</span>
                    <strong>{formatNumber(metric.value)}</strong>
                    <small>{metric.detail}</small>
                  </article>
                ),
              )}
            </section>

            <div className="overview-analysis">
              <Participation dashboard={dashboard} />
              <section
                className="overview-courses overview-panel"
                aria-labelledby="course-heading"
              >
                <header className="overview-panel-heading">
                  <div>
                    <h2 id="course-heading">Participation by course</h2>
                    <p>Ballots cast out of eligible voters</p>
                  </div>
                </header>
                {dashboard.turnout.by_course.length === 0 ? (
                  <p className="overview-empty">
                    No course participation data is available.
                  </p>
                ) : (
                  <table className="overview-course-table">
                    <thead>
                      <tr>
                        <th scope="col">Course</th>
                        <th scope="col">Cast / eligible</th>
                        <th scope="col">Turnout</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashboard.turnout.by_course.map((course) => (
                        <tr key={course.course}>
                          <th scope="row">{course.course}</th>
                          <td>
                            {formatNumber(course.already_voted)}{" "}
                            <span>
                              / {formatNumber(course.eligible_students)}
                            </span>
                          </td>
                          <td>
                            <div className="overview-course-rate">
                              <span aria-hidden="true">
                                <i
                                  style={{
                                    width: `${Math.min(course.percentage, 100)}%`,
                                  }}
                                />
                              </span>
                              <strong>{course.percentage}%</strong>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </section>
            </div>

            <section
              className="overview-results overview-panel"
              aria-labelledby="results-heading"
            >
              <header className="overview-panel-heading">
                <div>
                  <h2 id="results-heading">
                    Candidate results{" "}
                    <span className="overview-count">
                      {dashboard.candidate_results.length}
                    </span>
                  </h2>
                  <p>Recorded votes for each candidate in this election</p>
                </div>
                <Link className="overview-text-link" to="/admin/votes">
                  View votes <ArrowRight aria-hidden="true" />
                </Link>
              </header>
              {dashboard.candidate_results.length === 0 ? (
                <div className="overview-empty-results">
                  <div className="overview-empty-results__icon">
                    <Users aria-hidden="true" />
                  </div>
                  <div>
                    <h3>No candidates in this election</h3>
                    <p>
                      Candidate results will appear here once candidates are
                      added.
                    </p>
                  </div>
                  <Link className="overview-text-link" to="/admin/candidates">
                    Manage candidates <ArrowRight aria-hidden="true" />
                  </Link>
                </div>
              ) : (
                <>
                  <div
                    className="overview-result-scroll"
                    role="region"
                    aria-label="Candidate results table"
                    tabIndex={0}
                  >
                    <table className="overview-result-table">
                      <thead>
                        <tr>
                          <th scope="col">Candidate</th>
                          <th scope="col">Position</th>
                          <th scope="col">Party</th>
                          <th scope="col">Votes</th>
                          <th scope="col">Ballots selecting candidate</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dashboard.candidate_results.map((candidate) => (
                          <CandidateRow
                            candidate={candidate}
                            voters={dashboard.turnout.already_voted}
                            key={`${candidate.student_id}-${candidate.position}`}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="overview-table-note">
                    <Info aria-hidden="true" />
                    Percentage is candidate votes ÷ ballots cast, capped at
                    100%. Multiple selections can be allowed for a position.
                  </p>
                </>
              )}
            </section>
          </>
        )}
      </section>
    </>
  );
}

function Participation({ dashboard }: { dashboard: DashboardData }) {
  const { turnout } = dashboard;
  const segments =
    turnout.eligible_students > 0 || turnout.already_voted > 0
      ? [
          { name: "Ballots cast", value: turnout.already_voted },
          { name: "Not yet voted", value: turnout.not_yet_voted },
        ]
      : [{ name: "No eligible voters", value: 1 }];
  return (
    <section
      className="overview-participation overview-panel"
      aria-labelledby="participation-heading"
    >
      <header className="overview-panel-heading">
        <div>
          <h2 id="participation-heading">Voter turnout</h2>
          <p>Participation in the current election</p>
        </div>
        <CheckSquareOffset aria-hidden="true" />
      </header>
      <div className="overview-participation__body">
        <div
          className="overview-donut"
          role="img"
          aria-label={`${turnout.percentage}% turnout. ${turnout.already_voted} ballots cast; ${turnout.not_yet_voted} not yet voted.`}
        >
          <div aria-hidden="true" className="overview-donut__graphic">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart accessibilityLayer={false}>
                <Pie
                  rootTabIndex={-1}
                  data={segments}
                  dataKey="value"
                  innerRadius="76%"
                  outerRadius="96%"
                  stroke="none"
                  startAngle={90}
                  endAngle={-270}
                  isAnimationActive={false}
                >
                  {segments.map((segment) => (
                    <Cell
                      key={segment.name}
                      fill={
                        segment.name === "Ballots cast" ? "#2459b8" : "#e7ecf2"
                      }
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="overview-donut__label">
            <strong>{turnout.percentage}%</strong>
            <span>turnout</span>
          </div>
        </div>
        <div className="overview-participation__numbers">
          <p>
            <i />
            <span>Ballots cast</span>
            <strong>{formatNumber(turnout.already_voted)}</strong>
          </p>
          <p>
            <i />
            <span>Not yet voted</span>
            <strong>{formatNumber(turnout.not_yet_voted)}</strong>
          </p>
          <p className="overview-participation__total">
            <span>Eligible voters</span>
            <strong>{formatNumber(turnout.eligible_students)}</strong>
          </p>
        </div>
      </div>
      <p className="overview-participation__note">
        {turnout.eligible_students === 0
          ? "No eligible voters are available for this election."
          : turnout.already_voted === 0
            ? "No ballots have been cast in this election yet."
            : "Each ballot represents one participating voter."}
      </p>
    </section>
  );
}

function CandidateRow({
  candidate,
  voters,
}: {
  candidate: CandidateResult;
  voters: number;
}) {
  const rate = voters > 0 ? Math.min((candidate.votes / voters) * 100, 100) : 0;
  const team = candidate.partylist?.name ?? (
    candidate.team === "TEAM_A"
      ? "Team A"
      : candidate.team === "TEAM_B"
        ? "Team B"
        : candidate.team);
  return (
    <tr>
      <th scope="row">
        <div className="overview-candidate">
          {candidate.profile_photo_url ? (
            <img alt="" src={candidate.profile_photo_url} />
          ) : (
            <span aria-hidden="true">
              {candidate.full_name
                .split(" ")
                .slice(0, 2)
                .map((part) => part.charAt(0))
                .join("")}
            </span>
          )}
          <strong>{candidate.full_name}</strong>
        </div>
      </th>
      <td>{candidate.position}</td>
      <td>{team}</td>
      <td className="overview-votes">{formatNumber(candidate.votes)}</td>
      <td>
        <div className="overview-candidate-rate">
          <span aria-hidden="true">
            <i style={{ width: `${rate}%` }} />
          </span>
          <strong>{rate.toFixed(1)}%</strong>
        </div>
      </td>
    </tr>
  );
}
