import { useId, useState } from "react";
import { ArrowsLeftRight, CaretDown } from "@phosphor-icons/react";
import type { BallotPosition } from "@/types/voter";
import { CandidateProfile } from "./candidate-profile";

export function CandidateComparison({ position }: { position: BallotPosition }) {
  const labelId = useId();
  const [left, setLeft] = useState(position.candidates[0]?.student_id ?? "");
  const [right, setRight] = useState(position.candidates[1]?.student_id ?? "");
  if (position.candidates.length < 2) return null;
  return <details className="candidate-comparison">
    <summary><ArrowsLeftRight aria-hidden="true" weight="light" /><span>Compare candidates for {position.name}</span><CaretDown aria-hidden="true" /></summary>
    <div className="candidate-comparison__columns">
      {[{ id: left, other: right, set: setLeft }, { id: right, other: left, set: setRight }].map((column, index) => <div key={index}>
        <label htmlFor={`${labelId}-${index}`}>Candidate {index + 1}</label><select id={`${labelId}-${index}`} onChange={(event) => column.set(event.target.value)} value={column.id}>
          {position.candidates.filter((candidate) => candidate.student_id !== column.other).map((candidate) => <option key={candidate.student_id} value={candidate.student_id}>{candidate.full_name}</option>)}
        </select>
        {position.candidates.filter((candidate) => candidate.student_id === column.id).map((candidate) => <CandidateProfile candidate={candidate} key={candidate.student_id} />)}
      </div>)}
    </div>
  </details>;
}
