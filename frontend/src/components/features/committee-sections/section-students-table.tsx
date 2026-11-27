import type { VoterRecord } from "@/types/student";
import { formatAttendanceTime } from "@/lib/attendance-time";

export function SectionStudentsTable({students}: {students: VoterRecord[]}) {
  return <section className="voters-table-card" aria-label="Section student records">
    <div className="voters-table__heading"><h2>Student records</h2><span aria-live="polite">{students.length} shown</span></div>
    <div className="voters-table__scroll"><table className="voters-table">
      <thead><tr>{["Student ID", "Name", "Course", "Year level", "Section", "Academic status", "Voting status", "Attendance"].map((label) => <th key={label} scope="col">{label}</th>)}</tr></thead>
      <tbody>{students.map((student) => <tr key={student.student_id}>
        <td data-label="Student ID">{student.student_id}</td>
        <td data-label="Name"><strong>{student.full_name}</strong></td>
        <td data-label="Course">{student.course || "Not specified"}</td>
        <td data-label="Year level">{student.year_level || "Not specified"}</td>
        <td data-label="Section">{student.section || "Not specified"}</td>
        <td data-label="Academic status">{student.academic_status}</td>
        <td data-label="Voting status"><span className="voter-status" data-status={student.has_voted ? "voted" : student.voting_status.replaceAll("_", "-")}>{student.has_voted ? "Already Voted" : student.voting_status === "ineligible" ? "Ineligible" : "Not Voted"}</span></td>
        <td data-label="Attendance"><span className="voter-status" data-status={student.attendance_recorded ? "voted" : "not-voted"}>{student.attendance_recorded ? "Recorded" : "Not recorded"}</span>{student.attendance_recorded && student.voted_at && <small className="voter-attendance-time">{formatAttendanceTime(student.voted_at)}</small>}</td>
      </tr>)}</tbody>
    </table></div>
  </section>;
}
