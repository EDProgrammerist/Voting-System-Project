import { useEffect, useRef, useState, type FormEvent } from "react";
import { getCommitteeToken } from "@/lib/committee-session";
import { createCommitteeSection } from "@/services/committee-service";
import type { ClassSection } from "@/types/committee";
import "./create-section-form.css";

const YEARS = ["1st Year", "2nd Year", "3rd Year", "4th Year"];

export function CreateSectionForm({ courses, onCancel, onCreated }: {
  courses: string[];
  onCancel: () => void;
  onCreated: (section: ClassSection) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const courseInput = useRef<HTMLInputElement>(null);
  useEffect(() => { courseInput.current?.focus(); }, []);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = getCommitteeToken();
    if (!token || saving) return;
    const form = new FormData(event.currentTarget);
    setSaving(true);
    setError("");
    try {
      const response = await createCommitteeSection(token, {
        course: String(form.get("course")).trim().toUpperCase(),
        year_level: Number(form.get("year_level")),
        name: String(form.get("name")).trim().toUpperCase(),
      });
      onCreated(response.data);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Unable to save this section.");
    } finally {
      setSaving(false);
    }
  }

  return <form className="section-create" onSubmit={save} aria-label="Create section">
    <h2>Add Section</h2>
    <p>Choose its course and year level. Empty sections are saved for later imports.</p>
    {error && <p className="section-create__error" role="alert">{error}</p>}
    <div className="section-create__fields">
      <label>Course<input ref={courseInput} name="course" list="section-courses" required maxLength={100} placeholder="e.g. BSIT" disabled={saving}/>
        <datalist id="section-courses">{[...new Set(["BSIT", "BSHM", "BEED", "BSED", ...courses.filter(Boolean)])].map((course) => <option key={course} value={course}/>)}</datalist>
      </label>
      <label>Year level<select name="year_level" aria-label="Year level" defaultValue="1" disabled={saving}>{YEARS.map((year, index) => <option key={year} value={index + 1}>{year}</option>)}</select></label>
      <label>Section name<input name="name" required maxLength={100} placeholder="e.g. 1D or 1A" disabled={saving}/></label>
    </div>
    <div className="section-create__actions">
      <button className="section-create__button" type="button" disabled={saving} onClick={onCancel}>Cancel</button>
      <button className="section-create__button section-create__button--primary" disabled={saving} type="submit">{saving ? "Saving…" : "Save section"}</button>
    </div>
  </form>;
}
