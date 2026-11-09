interface StudentRecord {
  student_id: string;
  full_name: string;
  academic_status: string;
}

export interface VoterRecord extends StudentRecord {
  course: string | null;
  year_level: string | null;
  section: string | null;
  election_id: number | null;
  has_voted: boolean;
  ballot_id: string | null;
  attendance_recorded: boolean;
  voted_at: string | null;
  voting_status: "voted" | "not_voted" | "ineligible" | string;
}

export interface StudentsResponse {
  current_page: number;
  data: VoterRecord[];
  last_page: number;
  per_page: number;
  total: number;
}
