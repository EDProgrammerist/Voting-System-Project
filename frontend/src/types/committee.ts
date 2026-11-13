export interface CommitteeUser {
  name: string;
  email: string;
  role: "committee";
}
export interface CommitteeLoginResponse {
  token: string;
  message: string;
  committee: CommitteeUser;
}
export interface ClassListRow {
  row_number: number;
  student_id: string;
  full_name: string;
  course: string | null;
  year_level: string | null;
  section: string | null;
  academic_status: string;
  status: "new" | "existing" | "invalid";
}
export interface ClassListPreview {
  layout: { worksheet: string; header_row: number };
  rows: ClassListRow[];
  issues: { row: number; field: string; message: string }[];
  warnings: { row: number; message: string }[];
  summary: { total: number; new: number; existing: number; invalid: number };
  import_id: string | null;
  expires_at: string | null;
}
export interface ClassListInspection {
  worksheets: { name: string; rows: number; columns: number }[];
  headers: string[];
  max_rows: number;
}
export interface ClassListResult {
  message: string;
  inserted: number;
  skipped: number;
  already_committed: boolean;
}
