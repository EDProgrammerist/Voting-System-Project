import type { VoterRecord } from "@/types/student";

export const ADMIN_VOTERS_PREVIEW: VoterRecord[] = [
  { student_id: "2024-0001", full_name: "Juan Dela Cruz", academic_status: "enrolled", course: "BSIT", voting_status: "Voted" },
  { student_id: "2024-0002", full_name: "Maria Santos", academic_status: "enrolled", course: "BSHM", voting_status: "Voted" },
  { student_id: "2024-0003", full_name: "Carlo Reyes", academic_status: "enrolled", course: "BEED", voting_status: "Not Voted" },
  { student_id: "2024-0004", full_name: "Anna Flores", academic_status: "enrolled", course: "BSED", voting_status: "Voted" },
  { student_id: "2024-0100", full_name: "Test Voter One", academic_status: "enrolled", course: "BSIT", voting_status: "Not Voted" },
  { student_id: "2024-0101", full_name: "Test Voter Two", academic_status: "enrolled", course: "BSHM", voting_status: "Not Voted" },
  { student_id: "2020-9999", full_name: "Graduate Student", academic_status: "graduated", course: "BEED", voting_status: "Ineligible" },
  { student_id: "2023-8888", full_name: "Stopped Student", academic_status: "stopped", course: "BSED", voting_status: "Ineligible" },
];
