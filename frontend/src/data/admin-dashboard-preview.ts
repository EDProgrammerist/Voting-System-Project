import type { DashboardData } from "@/types/dashboard";

export const ADMIN_DASHBOARD_PREVIEW: DashboardData = {
  election: {
    id: 1,
    name: "CPC Election 2026",
    status: "active",
    starts_at: new Date(Date.now() + 26 * 60 * 60 * 1000).toISOString(),
    ends_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  turnout: {
    eligible_students: 1240,
    already_voted: 847,
    not_yet_voted: 393,
    percentage: 68.31,
  },
  team_totals: { TEAM_A: 438, TEAM_B: 409 },
  candidate_results: [
    { student_id: "2024-0001", full_name: "Juan Dela Cruz", profile_photo_url: null, motto: "Leadership through service", team: "TEAM_A", position: "President", votes: 438 },
    { student_id: "2024-0002", full_name: "Maria Santos", profile_photo_url: null, motto: "A voice for every student", team: "TEAM_B", position: "President", votes: 409 },
    { student_id: "2024-0003", full_name: "Carlo Reyes", profile_photo_url: null, motto: "Progress with purpose", team: "TEAM_A", position: "Vice President", votes: 421 },
    { student_id: "2024-0004", full_name: "Anna Flores", profile_photo_url: null, motto: "Together, we move forward", team: "TEAM_B", position: "Vice President", votes: 397 },
    { student_id: "2024-0005", full_name: "Mika Villanueva", profile_photo_url: null, motto: "Students first, always", team: "TEAM_A", position: "Senator", votes: 386 },
    { student_id: "2024-0006", full_name: "Paolo Garcia", profile_photo_url: null, motto: "Listen, lead, deliver", team: "TEAM_B", position: "Senator", votes: 341 },
  ],
  results_by_position: {},
};
