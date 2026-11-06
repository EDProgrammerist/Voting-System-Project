interface StudentRecord {
  student_id: string;
  full_name: string;
  academic_status: string;
}

export interface VoterRecord extends StudentRecord {
  course: string | null;
  election_id: number | null;
  has_voted: boolean;
  voting_status: "voted" | "not_voted" | "ineligible" | string;
}

export interface StudentsResponse {
  current_page: number;
  data: VoterRecord[];
  last_page: number;
  per_page: number;
  total: number;
}
