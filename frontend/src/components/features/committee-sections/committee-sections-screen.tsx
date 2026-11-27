import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { ArrowLeft, DownloadSimple, Folder } from "@phosphor-icons/react";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { useCommitteeSections } from "@/hooks/use-committee-sections";
import { getCommitteeToken } from "@/lib/committee-session";
import { exportCommitteeSection } from "@/services/committee-service";
import type { ClassSection } from "@/types/committee";
import { ClassListImport } from "../committee-voters/class-list-import";
import { PageSkeleton } from "@/components/common/page-skeleton";
import { SectionStudentsTable } from "./section-students-table";
import "../committee-voters/committee-voters-screen.css";
import "./committee-sections-screen.css";

const YEARS = ["1st Year", "2nd Year", "3rd Year", "4th Year"];
function studentCount(count: number): string {
  return `${count} student${count === 1 ? "" : "s"}`;
}
function yearNumber(value: string | null): number | null {
  const match = value?.trim().match(/^(?:year\s*)?([1-4])(?:st|nd|rd|th)?(?:\s*year)?$/i);
  return match ? Number(match[1]) : null;
}

export function CommitteeSectionsScreen() {
  const [params, setParams] = useSearchParams();
  const courseFilter = params.get("course") ?? "";
  useDocumentTitle(`${courseFilter || "Sections"} | CPC Vote Committee`);
  const selected = params.get("section");
  const data = useCommitteeSections(selected);
  const section = data.sections.find((item) => String(item.id) === selected);
  const unassigned = selected === "unassigned";
  const [yearFilter, setYearFilter] = useState("");
  const [actionError, setActionError] = useState("");
  const [exporting, setExporting] = useState<number | null>(null);
  const courses = [...new Set(data.sections.map((item) => item.course))].sort();
  const courseSections = data.sections.filter((item) => !courseFilter || item.course === courseFilter);
  const visibleSections = courseSections.filter((item) => !yearFilter || item.year_level === Number(yearFilter));
  const students = useMemo(() => !unassigned ? data.students : data.students.filter((student) => !data.sections.some((item) =>
    item.course === student.course?.trim().toUpperCase() && item.year_level === yearNumber(student.year_level) && item.name === student.section?.trim().toUpperCase(),
  )), [data.students, data.sections, unassigned]);

  async function exportSection(target: ClassSection) {
    const token = getCommitteeToken();
    if (!token || exporting !== null) return;
    setExporting(target.id); setActionError("");
    try {
      const blob = await exportCommitteeSection(token, target.id, data.electionId ?? undefined);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url; link.download = `${target.course}-${target.name}-${data.electionId ?? "roster"}.xlsx`;
      document.body.append(link); link.click(); link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) { setActionError(error instanceof Error ? error.message : "Unable to export this section."); }
    finally { setExporting(null); }
  }

  function openSection(item: ClassSection) {
    setActionError("");
    setParams({...(courseFilter ? {course: courseFilter} : {}), section: String(item.id)});
  }

  return <section className="admin-dashboard__content committee-sections">
    <header className="sections-header">
      <div>{selected && <Link className="sections-back" to={`/committee/sections${courseFilter ? `?course=${encodeURIComponent(courseFilter)}` : ""}`} onClick={() => setActionError("")}><ArrowLeft aria-hidden="true"/>All sections</Link>}
        <h1>{unassigned ? "Unassigned" : selected ? section?.name ?? "Section" : courseFilter || "Sections"}</h1>
        <p>{section ? `${section.course} · ${YEARS[section.year_level - 1]} · ${studentCount(section.student_count)} in this election` : unassigned ? "Student records with incomplete or unrecognized class details." : courseFilter ? `Browse year levels and sections for ${courseFilter}.` : "Organize class lists by course, year level, and section."}</p>
      </div>
      {section && <button className="sections-button" disabled={exporting !== null || data.loading} onClick={() => void exportSection(section)} type="button"><DownloadSimple aria-hidden="true"/>{exporting === section.id ? "Exporting…" : "Export Excel"}</button>}
    </header>
    {actionError && <p className="sections-error" role="alert">{actionError}</p>}
    <div className="sections-toolbar">
      <label>Election<select aria-label="Election for section attendance" value={data.electionId ?? ""} disabled={!data.ready} onChange={(event) => {setActionError(""); data.setElectionId(Number(event.target.value));}}>{data.elections.map((election) => <option key={election.id} value={election.id}>{election.name}</option>)}</select></label>
      {!selected && <>{!courseFilter && <label>Course<select aria-label="Filter sections by course" value="" onChange={(event) => setParams(event.target.value ? {course: event.target.value} : {})}><option value="">All courses</option>{courses.map((course) => <option key={course}>{course}</option>)}</select></label>}<label>Year level<select aria-label="Filter sections by year level" value={yearFilter} onChange={(event) => setYearFilter(event.target.value)}><option value="">All year levels</option>{YEARS.map((year, index) => <option key={year} value={index + 1}>{year}</option>)}</select></label>{yearFilter && <button className="sections-button" type="button" onClick={() => setYearFilter("")}>Clear section filters</button>}</>}
    </div>
    {data.notice && <p className="sections-error" role="status">{data.notice} <button className="sections-button" onClick={data.reload} type="button">Try again</button></p>}
    {(!data.ready && !data.notice) || data.loading ? <PageSkeleton kind="table" label="Loading sections and attendance"/> : data.hasData && <>
      {!selected && <div className="section-directory">
        {courses.filter((course) => visibleSections.some((item) => item.course === course)).map((course) => <section className="section-course" key={course}>{!courseFilter && <h2>{course}</h2>}{YEARS.map((year, index) => {
          const list = visibleSections.filter((item) => item.course === course && item.year_level === index + 1);
          return list.length > 0 && <div className="section-year" key={year}><h3>{year}</h3><ul>{list.map((item) => <li key={item.id}>
            <button className="section-open" aria-label={`Open ${item.course} ${year} ${item.name}`} onClick={() => openSection(item)} type="button"><Folder aria-hidden="true"/><span><strong>{item.name}</strong><small>{studentCount(item.student_count)}</small></span></button>
          </li>)}</ul></div>;
        })}</section>)}
        {visibleSections.length === 0 && !data.notice && <div className="sections-empty"><h2>{courseSections.length ? "No sections match these filters." : "No sections yet."}</h2><p>{courseSections.length ? "Choose another course or year level." : "Add a section from Overview to start organizing class lists."}</p></div>}
        {!courseFilter && <button className="sections-unassigned" onClick={() => {setActionError(""); setParams({section: "unassigned"});}} type="button"><span><strong>Unassigned</strong><small>Review records with missing class details.</small></span><span>{studentCount(data.unassignedCount)}</span></button>}
      </div>}
      {section && <ClassListImport key={`${section.id}:${data.electionId}`} section={section} initiallyOpen={params.get("import") === "1"} electionId={data.electionId ?? undefined} electionName={data.elections.find((item) => item.id === data.electionId)?.name} onImported={data.reload}/>}
      {(section || unassigned) && <><SectionStudentsTable students={students}/>{students.length === 0 && !data.notice && <p className="sections-empty">{unassigned ? "No unassigned students in this election." : "This section has no students in this election."}</p>}{unassigned && <p className="sections-help">To organize these records, open a section and import its class list using the same Student IDs. Only missing class details are filled.</p>}</>}
      {selected && !section && !unassigned && !data.notice && <p className="sections-empty">This section is unavailable. Return to All sections and choose another.</p>}
    </>}
  </section>;
}
