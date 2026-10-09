export interface ElectionSummary {
  id: number;
  name: string;
  status: "draft" | "active" | "closed" | string;
  starts_at: string | null;
  ends_at: string | null;
}

export interface CandidateResult {
  student_id: string;
  full_name: string;
  profile_photo_url: string | null;
  motto: string | null;
  team: "TEAM_A" | "TEAM_B" | string;
  position: string;
  votes: number;
}

export interface DashboardData {
  election: ElectionSummary;
  turnout: {
    eligible_students: number;
    already_voted: number;
    not_yet_voted: number;
    percentage: number;
  };
  team_totals: {
    TEAM_A: number;
    TEAM_B: number;
  };
  candidate_results: CandidateResult[];
  results_by_position: Record<string, CandidateResult[]>;
}

export interface ElectionsResponse {
  data: ElectionSummary[];
}
