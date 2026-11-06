import type { BallotCandidate, VoterBallotResponse } from "@/types/voter";

function candidate(studentId: string, fullName: string, team: "TEAM_A" | "TEAM_B"): BallotCandidate {
  return {
    student_id: studentId,
    full_name: fullName,
    team,
    profile_photo_url: null,
    motto: null,
  };
}

export const VOTER_BALLOT_PREVIEW: VoterBallotResponse = {
  election: {
    id: 1,
    name: "SSG Election 2026",
    ends_at: null,
  },
  positions: [
    {
      id: 1,
      name: "President",
      max_selections: 1,
      candidates: [
        candidate("2024-0001", "Juan Dela Cruz", "TEAM_A"),
        candidate("2024-0002", "Maria Santos", "TEAM_B"),
      ],
    },
    {
      id: 2,
      name: "Vice President",
      max_selections: 1,
      candidates: [
        candidate("2024-0003", "Carlo Reyes", "TEAM_A"),
        candidate("2024-0004", "Anna Flores", "TEAM_B"),
      ],
    },
    {
      id: 3,
      name: "Senator",
      max_selections: 7,
      candidates: [
        candidate("2024-0011", "Mika Villanueva", "TEAM_A"),
        candidate("2024-0012", "Paolo Garcia", "TEAM_B"),
        candidate("2024-0013", "Jasmine Lim", "TEAM_A"),
        candidate("2024-0014", "Andre Mendoza", "TEAM_B"),
        candidate("2024-0015", "Sofia Ramos", "TEAM_A"),
        candidate("2024-0016", "Nico Bautista", "TEAM_B"),
        candidate("2024-0017", "Ella Navarro", "TEAM_A"),
        candidate("2024-0018", "Marco Rivera", "TEAM_B"),
        candidate("2024-0019", "Rina Castillo", "TEAM_A"),
        candidate("2024-0020", "Luis Mercado", "TEAM_B"),
        candidate("2024-0021", "Bea Aquino", "TEAM_A"),
        candidate("2024-0022", "Gab Torres", "TEAM_B"),
        candidate("2024-0023", "Iris Fernandez", "TEAM_A"),
        candidate("2024-0024", "Theo Pascual", "TEAM_B"),
      ],
    },
  ],
};
