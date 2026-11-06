import { useEffect, useState } from "react";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { getVoterToken } from "@/lib/voter-session";
import { getVoterBallot } from "@/services/voter-auth-service";
import type { VoterBallotResponse } from "@/types/voter";
import { CandidateProfile } from "./candidate-profile";
import { StudentLayout } from "./student-layout";
import { MagnifyingGlass, UsersThree } from "@phosphor-icons/react";

export default function VoterCandidatesScreen() {
  const [ballot, setBallot] = useState<VoterBallotResponse | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [positionFilter, setPositionFilter] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  useDocumentTitle("Meet the Candidates | CPC Vote");
  useEffect(() => {
    let active = true;
    const token = getVoterToken();
    if (token) getVoterBallot(token).then((data) => { if (active) { setBallot(data); setError(""); } }).catch((err: unknown) => { if (active) setError(err instanceof Error ? err.message : "Unable to load candidates."); });
    return () => { active = false; };
  }, [attempt]);
  const positions = (ballot?.positions ?? []).filter((position) => positionFilter === null || positionFilter === position.id).map((position) => ({ ...position, candidates: position.candidates.filter((candidate) => `${candidate.full_name} ${candidate.motto ?? ""}`.toLowerCase().includes(query.trim().toLowerCase())) }));
  const hasSearchResults = positions.some((position) => position.candidates.length > 0);
  return <StudentLayout title="Meet the Candidates" description="Get to know the people behind the names. Explore their backgrounds, ambitions, and achievements before you choose.">
    {ballot && <div className="candidate-tools"><div aria-label="Filter by position" className="candidate-filters-user"><button aria-pressed={positionFilter === null} onClick={() => setPositionFilter(null)} type="button">All candidates</button>{ballot.positions.map((position) => <button aria-pressed={positionFilter === position.id} key={position.id} onClick={() => setPositionFilter(position.id)} type="button">{position.name}</button>)}</div><label className="candidate-search"><MagnifyingGlass aria-hidden="true" weight="light" /><span className="sr-only">Search candidates</span><input onChange={(event) => setQuery(event.target.value)} placeholder="Search by name or platform" type="search" value={query} /></label></div>}
    {error ? <div className="student-notice" role="alert"><p>{error}</p><button className="student-button student-button--secondary" onClick={() => setAttempt((value) => value + 1)} type="button">Try again</button></div> : !ballot && <p role="status">Loading candidates...</p>}
    {query.trim() && !hasSearchResults ? <div className="student-empty"><MagnifyingGlass aria-hidden="true" weight="light" /><div><h3>No matches found</h3><p>Try a different name or choose another position.</p></div></div> : positions.filter((position) => !query.trim() || position.candidates.length > 0).map((position) => <section className="student-page__section" key={position.id}><header className="student-section-heading"><h2>{position.name}</h2><span>{position.candidates.length} {position.candidates.length === 1 ? "candidate" : "candidates"}</span></header><div className="student-candidates-grid">{position.candidates.map((candidate) => <CandidateProfile candidate={candidate} key={candidate.student_id} />)}</div>{position.candidates.length === 0 && <div className="student-empty"><UsersThree aria-hidden="true" weight="light" /><div><h3>The introductions are on their way</h3><p>No candidates have been announced for this position.</p></div></div>}</section>)}
  </StudentLayout>;
}
