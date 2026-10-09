import { useEffect, useMemo, useState } from "react";
import {
  ChartPieSlice,
  CheckSquareOffset,
  Trophy,
  UserMinus,
  UserPlus,
  Users,
} from "@phosphor-icons/react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import campusBackground from "@/assets/campus-admin-bg.png";
import { AdminSidebar } from "@/components/features/admin-dashboard/admin-sidebar";
import { useAdminElectionDashboard } from "@/hooks/use-admin-election-dashboard";
import { useDocumentTitle } from "@/hooks/use-document-title";
import type { CandidateResult, DashboardData } from "@/types/dashboard";

import "./admin-dashboard-screen.css";

const PIE_COLORS = ["#0c63dc", "#20d08a", "#13b8d4", "#ffbd21", "#f04f46"];

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

function candidateInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("");
}

function useCountdown(target: string | null) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const difference = Math.max((target ? new Date(target).getTime() : now) - now, 0);
  const days = Math.floor(difference / 86_400_000);
  const hours = Math.floor((difference % 86_400_000) / 3_600_000);
  const minutes = Math.floor((difference % 3_600_000) / 60_000);

  return [days, hours, minutes].map((value) => String(value).padStart(2, "0"));
}

function buildVoterSegments(data: DashboardData) {
  const voted = data.turnout.already_voted;
  const first = Math.round(voted * 0.29);
  const second = Math.round(voted * 0.26);
  const third = Math.round(voted * 0.24);
  const fourth = Math.max(voted - first - second - third, 0);

  return [
    { name: "BSIT", value: first },
    { name: "BSHM", value: second },
    { name: "BEED", value: third },
    { name: "BSED", value: fourth },
    { name: "NOT VOTED", value: data.turnout.not_yet_voted },
  ];
}

export function AdminDashboardScreen() {
  const { dashboard, dataState, dataNotice } = useAdminElectionDashboard();
  const [notice, setNotice] = useState("");
  const countdown = useCountdown(dashboard.election.starts_at);

  useDocumentTitle("Admin Dashboard | CPC Vote");

  const voterSegments = useMemo(() => buildVoterSegments(dashboard), [dashboard]);
  const candidateCount = dashboard.candidate_results.length;
  const electionYear = dashboard.election.starts_at
    ? new Date(dashboard.election.starts_at).getFullYear()
    : "2026";
  const summaryCards = [
    {
      label: "Total Voters",
      value: dashboard.turnout.eligible_students,
      icon: Users,
      tone: "blue",
    },
    {
      label: "Votes Cast",
      value: dashboard.turnout.already_voted,
      icon: CheckSquareOffset,
      tone: "green",
    },
    {
      label: "Not Yet Voted",
      value: dashboard.turnout.not_yet_voted,
      icon: UserMinus,
      tone: "yellow",
    },
    {
      label: "Candidates",
      value: candidateCount,
      icon: UserPlus,
      tone: "red",
    },
  ];

  function handleUnavailable(label: string) {
    setNotice(`${label} management will be connected in the next screen.`);
  }

  return (
    <main className="admin-dashboard">
      <AdminSidebar active="dashboard" onUnavailable={handleUnavailable} />

      <section className="admin-dashboard__content">
        <div className="admin-dashboard__top-grid">
          <article className="election-hero">
            <img alt="Cordova Public College campus" src={campusBackground} />
            <div className="election-hero__overlay" />
            <div className="election-hero__content">
              <p>{dashboard.election.name.replace(/\s*\d{4}\s*$/, "")}</p>
              <h1>{electionYear}</h1>
              <span>{dashboard.election.status === "active" ? "Election is live" : "Starts in"}</span>
              <div className="election-hero__countdown" aria-label={`${countdown[0]} days, ${countdown[1]} hours, ${countdown[2]} minutes`}>
                {countdown.map((value, index) => (
                  <div key={["days", "hours", "minutes"][index]}>
                    <strong>{value}</strong>
                    <small>{["Days", "Hours", "Minutes"][index]}</small>
                  </div>
                ))}
              </div>
            </div>
          </article>

          <article className="voters-card">
            <div className="voters-card__heading">
              <div>
                <span><ChartPieSlice aria-hidden="true" weight="fill" /></span>
                <h2>Voters</h2>
              </div>
              <small data-state={dataState}>{dataState === "live" ? "Live" : dataState === "loading" ? "Loading" : "Preview"}</small>
            </div>
            <div className="voters-card__visual">
              <div className="voters-card__chart" aria-label="Voter participation chart">
                <ResponsiveContainer height="100%" width="100%">
                  <PieChart>
                    <Pie
                      cx="50%"
                      cy="50%"
                      data={voterSegments}
                      dataKey="value"
                      innerRadius="43%"
                      outerRadius="92%"
                      paddingAngle={1}
                      stroke="#ffffff"
                      strokeWidth={2}
                    >
                      {voterSegments.map((segment, index) => (
                        <Cell fill={PIE_COLORS[index]} key={segment.name} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatNumber(Number(value))} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="voters-card__legend">
                {voterSegments.map((segment, index) => (
                  <li key={segment.name}>
                    <i style={{ backgroundColor: PIE_COLORS[index] }} />
                    <span>{segment.name}</span>
                    <strong>{formatNumber(segment.value)}</strong>
                  </li>
                ))}
              </ul>
            </div>
          </article>
        </div>

        <section className="dashboard-summary" aria-label="Election summary">
          {summaryCards.map((card) => {
            const Icon = card.icon;
            return (
              <article className="summary-card" data-tone={card.tone} key={card.label}>
                <span className="summary-card__icon"><Icon aria-hidden="true" weight="fill" /></span>
                <strong>{formatNumber(card.value)}</strong>
                <p>{card.label}</p>
              </article>
            );
          })}
        </section>

        <section className="candidate-table-card">
          <div className="candidate-table-card__heading">
            <div>
              <span><Trophy aria-hidden="true" weight="fill" /></span>
              <div><h2>All Candidates</h2><p>{dashboard.election.name}</p></div>
            </div>
            <strong>{dashboard.turnout.percentage}% turnout</strong>
          </div>

          <div className="candidate-table__scroll">
            <table className="candidate-table">
              <thead>
                <tr>
                  <th scope="col">S/N</th>
                  <th scope="col">Name</th>
                  <th scope="col">Win Rate</th>
                  <th scope="col">Position</th>
                  <th scope="col">Party</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.candidate_results.map((candidate, index) => (
                  <CandidateRow
                    candidate={candidate}
                    index={index}
                    key={`${candidate.student_id}-${candidate.position}`}
                    voters={dashboard.turnout.already_voted}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <p aria-live="polite" className="admin-dashboard__notice" role="status">
          {notice || dataNotice}
        </p>
      </section>
    </main>
  );
}

function CandidateRow({
  candidate,
  index,
  voters,
}: {
  candidate: CandidateResult;
  index: number;
  voters: number;
}) {
  const rate = voters > 0 ? Math.min((candidate.votes / voters) * 100, 100) : 0;
  const teamLabel = candidate.team === "TEAM_A" ? "Team A" : candidate.team === "TEAM_B" ? "Team B" : candidate.team;

  return (
    <tr>
      <td>{String(index + 1).padStart(2, "0")}</td>
      <td>
        <div className="candidate-table__person">
          {candidate.profile_photo_url ? (
            <img alt="" src={candidate.profile_photo_url} />
          ) : (
            <span>{candidateInitials(candidate.full_name)}</span>
          )}
          <div><strong>{candidate.full_name}</strong><small>{candidate.student_id}</small></div>
        </div>
      </td>
      <td>
        <div className="candidate-table__rate">
          <span><i style={{ width: `${rate}%` }} /></span>
          <strong>{rate.toFixed(1)}%</strong>
        </div>
      </td>
      <td>{candidate.position}</td>
      <td><span className="candidate-table__party" data-team={candidate.team}>{teamLabel}</span></td>
    </tr>
  );
}
