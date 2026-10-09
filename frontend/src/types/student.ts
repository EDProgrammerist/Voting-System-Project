export interface StudentRecord {
  student_id: string;
  full_name: string;
  academic_status: string;
}

export interface StudentsResponse {
  current_page: number;
  data: StudentRecord[];
  last_page: number;
  per_page: number;
  total: number;
}

export interface VoterRecord extends StudentRecord {
  course: string;
  voting_status: string;
}
