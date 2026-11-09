import type { VoterBallotReference } from "@/types/voter";
import { formatAttendanceTime } from "@/lib/attendance-time";
import "./ballot-reference.css";

export function BallotReference({
  reference,
}: {
  reference?: VoterBallotReference | null;
}) {
  if (!reference) return null;
  return (
    <section
      className="ballot-reference"
      aria-label="Your ballot ID and attendance"
      data-complete={reference.attendance_recorded}
    >
      <div>
        <h2>Ballot ID</h2>
        <code>{reference.id}</code>
      </div>
      <div>
        <strong>
          {reference.attendance_recorded
            ? "Attendance recorded"
            : "Attendance not yet recorded"}
        </strong>
        <p>
          {reference.attendance_recorded && reference.voted_at
            ? `Voted ${formatAttendanceTime(reference.voted_at)}`
            : "Your attendance is recorded only after your vote is submitted successfully."}
        </p>
      </div>
    </section>
  );
}
