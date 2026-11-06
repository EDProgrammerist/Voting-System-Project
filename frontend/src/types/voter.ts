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
<<<<<<< HEAD
  tally_only: boolean;
=======
>>>>>>> 74a2d47d756131abb6859b220084adc37dafd18d
  message: string;
  token: string;
  student: VoterIdentity;
  election: VoterElection;
}

export interface BallotCandidate {
<<<<<<< HEAD
  profile: string | null;
  achievements: string | null;
=======
>>>>>>> 74a2d47d756131abb6859b220084adc37dafd18d
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
<<<<<<< HEAD
  can_submit_vote: boolean;
=======
>>>>>>> 74a2d47d756131abb6859b220084adc37dafd18d
  election: VoterElection;
  positions: BallotPosition[];
}

export interface VoterSelection {
  position_id: number;
  candidate_student_id: string;
}

export interface VoterVotePayload {
<<<<<<< HEAD
  signature: SignaturePoint[][];
  thumbmark_confirmed: boolean;
=======
>>>>>>> 74a2d47d756131abb6859b220084adc37dafd18d
  election_id: number;
  selections: VoterSelection[];
}

export interface VoterVoteResponse {
  message: string;
}
<<<<<<< HEAD

export interface SignaturePoint { x: number; y: number }

export interface VoterTallyResponse {
  election: VoterElection & { status: string };
  tally_only: boolean;
  updated_at: string;
  positions: { id: number; name: string; candidates: { student_id: string; full_name: string; team: string; votes: number }[] }[];
}
=======
>>>>>>> 74a2d47d756131abb6859b220084adc37dafd18d
