export interface VoterLoginCredentials {
  student_id: string;
  full_name: string;
}

export interface VoterIdentity {
  student_id: string;
  full_name: string;
}

export interface VoterElection {
  id: number;
  name: string;
  ends_at: string | null;
}

export interface VoterLoginResponse {
  message: string;
  token: string;
  student: VoterIdentity;
  election: VoterElection;
}

export interface BallotCandidate {
  student_id: string;
  full_name: string;
  team: "TEAM_A" | "TEAM_B" | string;
  profile_photo_url: string | null;
  motto: string | null;
}

export interface BallotPosition {
  id: number;
  name: string;
  max_selections: number;
  candidates: BallotCandidate[];
}

export interface VoterBallotResponse {
  election: VoterElection;
  positions: BallotPosition[];
}

export interface VoterSelection {
  position_id: number;
  candidate_student_id: string;
}

export interface VoterVotePayload {
  election_id: number;
  selections: VoterSelection[];
}

export interface VoterVoteResponse {
  message: string;
}
