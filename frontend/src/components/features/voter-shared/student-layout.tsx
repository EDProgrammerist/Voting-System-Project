import type { ReactNode } from "react";
import { VoterNavigation } from "./voter-navigation";

export function StudentLayout({ title, description, children, status }: { title: string; description: string; children: ReactNode; status?: ReactNode }) {
  return <main className="student-page"><div className="student-container">
    <VoterNavigation />
    <header className="student-heading" id="student-main" tabIndex={-1}>
      {status && <div className="student-heading__status">{status}</div>}
      <h1>{title}</h1><p>{description}</p>
    </header>
    {children}
    <footer className="student-footer"><span>CPC Vote</span><p>Your voice. Your vote. Your community.</p><span>Student elections</span></footer>
  </div></main>;
}

export function BallotSteps({ review = false }: { review?: boolean }) {
  return <ol aria-label="Voting progress" className="ballot-steps">
    <li data-state={review ? "complete" : "current"} aria-current={review ? undefined : "step"}><span>1</span>Choose candidates</li>
    <li data-state={review ? "current" : "next"} aria-current={review ? "step" : undefined}><span>2</span>Review &amp; confirm</li>
    <li data-state="next"><span>3</span>View Live Tally</li>
  </ol>;
}

export function CandidateAvatar({ name, photo }: { name: string; photo?: string | null }) {
  return photo ? <img className="candidate-avatar" alt={`Portrait of ${name}`} loading="lazy" src={photo} /> : <span aria-hidden="true" className="candidate-avatar candidate-avatar--initials">{name.trim().split(/\s+/).filter(Boolean).map((part) => part[0]).slice(0, 2).join("")}</span>;
}

