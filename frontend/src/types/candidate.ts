export interface CandidateRecord {
  student_id: string;
  full_name: string;
  profile_photo_url: string | null;
  motto: string | null;
  team: "TEAM_A" | "TEAM_B" | string;
  position: {
    id: number;
    name: string;
  };
}

export interface CandidatesResponse {
  data: CandidateRecord[];
}

export interface CandidateMutationResponse {
  message: string;
}
