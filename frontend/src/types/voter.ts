export interface VoterLoginCredentials {
  entry_code?: string;
  student_id: string;
  password: string;
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
  ballot_reference: VoterBallotReference | null;
  password_change_required: boolean;
  tally_only: boolean;
  message: string;
  token: string;
  student: VoterIdentity;
  election: VoterElection;
}

export interface VoterSessionResponse {
  ballot_reference: VoterBallotReference | null;
  password_change_required: boolean;
  tally_only: boolean;
  election: VoterElection;
}

export interface BallotCandidate {
  profile: string | null;
  achievements: string | null;
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
  ballot_reference: VoterBallotReference | null;
  can_submit_vote: boolean;
  election: VoterElection;
  positions: BallotPosition[];
}

export interface VoterSelection {
  position_id: number;
  candidate_student_id: string;
}

export interface VoterVotePayload {
  ballot_reference_id?: string;
  signature: SignaturePoint[][];
  thumbmark_confirmed: boolean;
  election_id: number;
  selections: VoterSelection[];
}

export interface VoterVoteResponse {
  ballot_reference: VoterBallotReference;
  message: string;
}

export interface SignaturePoint {
  x: number;
  y: number;
}

export interface VoterTallyResponse {
  ballot_reference: VoterBallotReference | null;
  election: VoterElection & { status: string };
  tally_only: boolean;
  updated_at: string;
  positions: {
    id: number;
    name: string;
    candidates: {
      student_id: string;
      full_name: string;
      team: string;
      votes: number;
    }[];
  }[];
}

export interface VoterBallotReference {
  id: string;
  issued_at: string;
  attendance_recorded: boolean;
  voted_at: string | null;
}

export interface VoterQrEntry {
  code: string;
  election: VoterElection & { status: string };
}
