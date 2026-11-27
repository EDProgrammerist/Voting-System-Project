import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import { ArrowRight, Folders, Plus, UserList } from "@phosphor-icons/react";
import { useCommitteeSections } from "@/hooks/use-committee-sections";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { PageSkeleton } from "@/components/common/page-skeleton";
import { CreateSectionForm } from "../committee-sections/create-section-form";
import "./committee-overview-screen.css";

export function CommitteeOverviewScreen() {
  useDocumentTitle("Overview | CPC Vote Committee");
  const data = useCommitteeSections("overview");
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);
  const addSectionButton = useRef<HTMLButtonElement>(null);
  const voted = data.students.filter((student) => student.has_voted).length;
  const awaiting = data.students.filter((student) => student.academic_status === "enrolled" && !student.has_voted).length;
  const ineligible = data.students.filter((student) => student.academic_status !== "enrolled").length;
  const attendance = data.students.filter((student) => student.attendance_recorded).length;
  const courses = [...new Set([
    ...data.sections.map((section) => section.course),
    ...data.students.map((student) => student.course?.trim().toUpperCase() ?? ""),
  ])].sort((a, b) => a.localeCompare(b));
  const metrics = [
    {label: "Student records", value: data.students.length, description: "On this election’s roster"},
    {label: "Already Voted", value: voted, description: "Submitted ballots in this election"},
    {label: "Awaiting vote", value: awaiting, description: "Enrolled students who have not voted"},
  ];
  const election = data.elections.find((item) => item.id === data.electionId);

  return <section className="admin-dashboard__content committee-overview">
    <header className="committee-overview__header">
      <div><h1>Overview</h1><p>Monitor student participation and voting attendance. Records update automatically.</p></div>
      <div className="committee-overview__actions"><button ref={addSectionButton} className="committee-overview__add-section" type="button" aria-expanded={creating} aria-controls="overview-create-section" onClick={() => setCreating((current) => !current)}><Plus aria-hidden="true"/>Add Section</button><Link to="/committee/voters"><UserList aria-hidden="true"/>View student records</Link><Link to="/committee/sections"><Folders aria-hidden="true"/>Manage sections</Link></div>
    </header>
    <div id="overview-create-section" hidden={!creating}>{creating && <CreateSectionForm courses={courses} onCancel={() => {setCreating(false); addSectionButton.current?.focus();}} onCreated={(section) => navigate(`/committee/sections?course=${encodeURIComponent(section.course)}&section=${section.id}`)}/>}</div>
    <div className="committee-overview__election">
      <label>Election<select aria-label="Election for committee overview" value={data.electionId ?? ""} disabled={!data.ready} onChange={(event) => data.setElectionId(Number(event.target.value))}>{data.elections.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      {election && <p>Election status: <strong>{election.status.charAt(0).toUpperCase() + election.status.slice(1)}</strong></p>}
    </div>
    {data.notice && <div className="committee-overview__notice" role="status"><p>{data.notice}{data.hasData && " Last loaded records are shown."}</p><button type="button" onClick={data.reload}>Try again</button></div>}
    {data.loading || (!data.ready && !data.notice) ? <PageSkeleton kind="dashboard" label="Loading committee overview"/> : data.hasData && <>
      <dl className="committee-overview__metrics">{metrics.map((metric) => <div key={metric.label}><dt>{metric.label}</dt><dd>{metric.value}</dd><p>{metric.description}</p></div>)}</dl>
      <p className="committee-overview__context">Attendance recorded for <strong>{attendance}</strong> {attendance === 1 ? "student" : "students"}. <strong>{ineligible}</strong> {ineligible === 1 ? "ineligible record is" : "ineligible records are"} excluded from “Awaiting vote”.</p>
      {data.unassignedCount > 0 && <aside className="committee-overview__attention"><div><h2>Class details need attention</h2><p>{data.unassignedCount} student {data.unassignedCount === 1 ? "record has" : "records have"} missing or unrecognized class details.</p></div><Link to="/committee/sections?section=unassigned">Review unassigned records<ArrowRight aria-hidden="true"/></Link></aside>}
      <section className="committee-overview__courses" aria-label="Participation by course">
        <div className="committee-overview__table-heading"><h2>Participation by course</h2><p>Open a course to view its year levels and sections.</p></div>
        {courses.length === 0 ? <p className="committee-overview__empty">No student records or sections are available yet. Start by adding a section.</p> : <table><thead><tr><th scope="col">Course</th><th scope="col">Student records</th><th scope="col">Already Voted</th><th scope="col">Awaiting vote</th><th scope="col"><span className="committee-overview__sr-only">Open course</span></th></tr></thead><tbody>{courses.map((course) => {
          const students = data.students.filter((student) => (student.course?.trim().toUpperCase() ?? "") === course);
          return <tr key={course || "unspecified"}><td data-label="Course"><strong>{course || "Not specified"}</strong></td><td data-label="Student records">{students.length}</td><td data-label="Already Voted">{students.filter((student) => student.has_voted).length}</td><td data-label="Awaiting vote">{students.filter((student) => student.academic_status === "enrolled" && !student.has_voted).length}</td><td data-label="View"><Link aria-label={course ? `Open ${course} sections` : "Review records without a course"} to={course ? `/committee/sections?course=${encodeURIComponent(course)}` : "/committee/sections?section=unassigned"}>{course ? "View sections" : "Review records"}<ArrowRight aria-hidden="true"/></Link></td></tr>;
        })}</tbody></table>}
      </section>
    </>}
  </section>;
}
