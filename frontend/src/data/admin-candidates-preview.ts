import type { CandidateRecord } from "@/types/candidate";
import type { StudentRecord } from "@/types/student";

export const ADMIN_CANDIDATES_PREVIEW: CandidateRecord[] = [
  { student_id: "2024-0001", full_name: "Juan Dela Cruz", profile_photo_url: null, motto: "Leadership through service", team: "TEAM_A", position: { id: 1, name: "President" } },
  { student_id: "2024-0002", full_name: "Maria Santos", profile_photo_url: null, motto: "A voice for every student", team: "TEAM_B", position: { id: 1, name: "President" } },
  { student_id: "2024-0003", full_name: "Carlo Reyes", profile_photo_url: null, motto: "Progress with purpose", team: "TEAM_A", position: { id: 2, name: "Vice President" } },
  { student_id: "2024-0004", full_name: "Anna Flores", profile_photo_url: null, motto: "Together, we move forward", team: "TEAM_B", position: { id: 2, name: "Vice President" } },
  { student_id: "2024-0005", full_name: "Mika Villanueva", profile_photo_url: null, motto: "Students first, always", team: "TEAM_A", position: { id: 3, name: "Senator" } },
  { student_id: "2024-0006", full_name: "Paolo Garcia", profile_photo_url: null, motto: "Listen, lead, deliver", team: "TEAM_B", position: { id: 3, name: "Senator" } },
];

export const ADMIN_CANDIDATE_STUDENTS_PREVIEW: StudentRecord[] = [
  ...ADMIN_CANDIDATES_PREVIEW.map(({ student_id, full_name }) => ({ student_id, full_name, academic_status: "enrolled" })),
  { student_id: "2024-0100", full_name: "Test Voter One", academic_status: "enrolled" },
  { student_id: "2024-0101", full_name: "Test Voter Two", academic_status: "enrolled" },
];
