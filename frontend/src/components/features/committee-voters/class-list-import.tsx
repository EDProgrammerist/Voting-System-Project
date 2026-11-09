import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { DownloadSimple, UploadSimple } from "@phosphor-icons/react";
import { getCommitteeToken } from "@/lib/committee-session";
import {
  commitClassList,
  downloadClassListTemplate,
  inspectClassList,
  previewClassList,
} from "@/services/committee-service";
import type {
  ClassListInspection,
  ClassListPreview,
  ClassListResult,
} from "@/types/committee";
import "./class-list-import.css";

const fieldLabels: Record<string, string> = {
  student_id: "Student ID",
  full_name: "Full name",
  course: "Course",
  year_level: "Year level",
  section: "Section",
  academic_status: "Academic status",
};
export function ClassListImport({ onImported }: { onImported: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [inspection, setInspection] = useState<ClassListInspection | null>(
    null,
  );
  const [worksheet, setWorksheet] = useState("");
  const [headerRow, setHeaderRow] = useState("1");
  const [preview, setPreview] = useState<ClassListPreview | null>(null);
  const [result, setResult] = useState<ClassListResult | null>(null);
  const [busy, setBusy] = useState<"inspect" | "preview" | "commit" | null>(
    null,
  );
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(0);
  const [warningsReviewed, setWarningsReviewed] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);

  function clear() {
    setWarningsReviewed(false);
    request.current?.abort();
    setFile(null);
    setInspection(null);
    setWorksheet("");
    setHeaderRow("1");
    setPreview(null);
    setResult(null);
    setError("");
    setBusy(null);
    setPage(0);
    if (fileInput.current) fileInput.current.value = "";
  }
  async function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    setWarningsReviewed(false);
    const selected = event.target.files?.[0];
    setPreview(null);
    setResult(null);
    setInspection(null);
    setWorksheet("");
    setError("");
    setPage(0);
    if (!selected) {
      setFile(null);
      return;
    }
    setFile(selected);
    if (
      !/\.(xlsx|xls)$/i.test(selected.name) ||
      selected.size > 5 * 1024 * 1024
    ) {
      setError("Choose an Excel .xlsx or .xls file up to 5 MB.");
      return;
    }
    const token = getCommitteeToken();
    if (!token) return;
    const controller = new AbortController();
    request.current?.abort();
    request.current = controller;
    setBusy("inspect");
    try {
      const data = await inspectClassList(token, selected, controller.signal);
      if (!controller.signal.aborted) {
        setInspection(data);
        setWorksheet(
          data.worksheets.length === 1 ? data.worksheets[0].name : "",
        );
      }
    } catch (err) {
      if (!controller.signal.aborted)
        setError(
          err instanceof Error ? err.message : "Unable to read this workbook.",
        );
    } finally {
      if (!controller.signal.aborted) setBusy(null);
    }
  }
  async function loadPreview(event: FormEvent<HTMLFormElement>) {
    setWarningsReviewed(false);
    event.preventDefault();
    const token = getCommitteeToken();
    if (!token || !file || !worksheet || busy) return;
    const controller = new AbortController();
    request.current?.abort();
    request.current = controller;
    setBusy("preview");
    setError("");
    setPreview(null);
    setResult(null);
    setPage(0);
    try {
      const data = await previewClassList(
        token,
        file,
        worksheet,
        Number(headerRow),
        controller.signal,
      );
      if (!controller.signal.aborted) setPreview(data);
    } catch (err) {
      if (!controller.signal.aborted)
        setError(
          err instanceof Error
            ? err.message
            : "Unable to preview this class list.",
        );
    } finally {
      if (!controller.signal.aborted) setBusy(null);
    }
  }
  async function confirm() {
    const token = getCommitteeToken();
    if (!token || !preview?.import_id || busy) return;
    setBusy("commit");
    setError("");
    try {
      const data = await commitClassList(
        token,
        preview.import_id,
        warningsReviewed,
      );
      setResult(data);
      setPreview(null);
      onImported();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to import this class list.",
      );
    } finally {
      setBusy(null);
    }
  }
  async function download() {
    const token = getCommitteeToken();
    if (!token || downloading) return;
    setDownloading(true);
    setError("");
    try {
      const blob = await downloadClassListTemplate(token);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "class-list-template.xlsx";
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to download the template.",
      );
    } finally {
      setDownloading(false);
    }
  }

  const pageCount = preview ? Math.ceil(preview.rows.length / 20) : 0;
  return (
    <details className="class-import">
      <summary>
        <UploadSimple aria-hidden="true" />
        <span>Import class list from Excel</span>
      </summary>
      <div className="class-import__body">
        <div className="class-import__intro">
          <p>
            Import student records only. Existing IDs are skipped; passwords,
            ballot IDs, and voting history are preserved. New records receive no
            password or login access.
          </p>
          <button
            type="button"
            className="class-import__secondary"
            disabled={downloading}
            onClick={download}
          >
            <DownloadSimple aria-hidden="true" />
            {downloading ? "Downloading..." : "Download Excel template"}
          </button>
        </div>
        <p className="class-import__hint">
          Required: Student ID and Full Name. Optional: Course, Year Level,
          Section, Academic Status. Keep IDs as text to preserve leading zeros.
          Blank academic status defaults to enrolled. Maximum 5 MB and 5,000
          rows.
        </p>
        <form onSubmit={loadPreview}>
          <label>
            Excel workbook
            <input
              ref={fileInput}
              type="file"
              accept=".xlsx,.xls"
              disabled={Boolean(busy)}
              onChange={chooseFile}
            />
          </label>
          {inspection && (
            <div className="class-import__options">
              <label>
                Worksheet
                <select
                  aria-label="Worksheet"
                  value={worksheet}
                  disabled={Boolean(busy)}
                  onChange={(event) => {
                    setWorksheet(event.target.value);
                    setPreview(null);
                    setResult(null);
                  }}
                  required
                >
                  <option value="" disabled>
                    Choose worksheet
                  </option>
                  {inspection.worksheets.map((sheet) => (
                    <option key={sheet.name} value={sheet.name}>
                      {sheet.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Header row
                <input
                  type="number"
                  min={1}
                  max={20}
                  step={1}
                  value={headerRow}
                  disabled={Boolean(busy)}
                  onChange={(event) => {
                    setHeaderRow(event.target.value);
                    setPreview(null);
                    setResult(null);
                  }}
                  required
                />
              </label>
            </div>
          )}
          <div className="class-import__actions">
            <button
              type="submit"
              className="class-import__primary"
              disabled={Boolean(busy) || !file || !inspection || !worksheet}
            >
              {busy === "inspect"
                ? "Reading workbook..."
                : busy === "preview"
                  ? "Preparing preview..."
                  : "Preview class list"}
            </button>
            {file && (
              <button
                className="class-import__secondary"
                type="button"
                disabled={busy === "commit"}
                onClick={clear}
              >
                Cancel import
              </button>
            )}
          </div>
        </form>
        {error && (
          <p className="class-import__error" role="alert">
            {error}
          </p>
        )}
        {result && (
          <div className="class-import__success" role="status">
            <strong>{result.message}</strong>
            <p>
              {result.inserted} new records added. {result.skipped} existing IDs
              skipped.
            </p>
          </div>
        )}
        {preview && (
          <section
            className="class-import__preview"
            aria-label="Class-list import preview"
          >
            <h2>Review before importing</h2>
            <p>
              {preview.summary.total} rows · {preview.summary.new} new ·{" "}
              {preview.summary.existing} existing IDs to skip ·{" "}
              {preview.summary.invalid} invalid rows
            </p>
            {preview.issues.length > 0 && (
              <div className="class-import__error" role="alert">
                <strong>
                  Nothing has been imported. Fix the rows below and upload the
                  corrected file.
                </strong>
                <ul>
                  {preview.issues.slice(0, 20).map((issue, index) => (
                    <li key={index}>
                      Row {issue.row} ·{" "}
                      {fieldLabels[issue.field] ?? issue.field}: {issue.message}
                    </li>
                  ))}
                </ul>
                {preview.issues.length > 20 && (
                  <p>Showing 20 of {preview.issues.length} issues.</p>
                )}
              </div>
            )}
            {preview.warnings.length > 0 && (
              <div className="class-import__warning" role="status">
                <strong>Check these values before confirming.</strong>
                <ul>
                  {preview.warnings.slice(0, 10).map((warning, index) => (
                    <li key={index}>
                      Row {warning.row}: {warning.message}
                    </li>
                  ))}
                </ul>
                {preview.warnings.length > 10 && (
                  <p>Showing 10 of {preview.warnings.length} warnings.</p>
                )}
                <label className="class-import__ack">
                  <input
                    type="checkbox"
                    checked={warningsReviewed}
                    disabled={Boolean(busy)}
                    onChange={(event) =>
                      setWarningsReviewed(event.target.checked)
                    }
                  />
                  I checked these Student IDs, including leading zeros.
                </label>
              </div>
            )}
            <div
              className="class-import__table"
              role="region"
              aria-label="Preview rows"
              tabIndex={0}
            >
              <table>
                <thead>
                  <tr>
                    <th scope="col">Row</th>
                    <th scope="col">Student ID</th>
                    <th scope="col">Full name</th>
                    <th scope="col">Course</th>
                    <th scope="col">Year level</th>
                    <th scope="col">Section</th>
                    <th scope="col">Academic status</th>
                    <th scope="col">Import action</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.slice(page * 20, (page + 1) * 20).map((row) => (
                    <tr key={row.row_number}>
                      <td>{row.row_number}</td>
                      <td>
                        <code>{row.student_id || "—"}</code>
                      </td>
                      <td>{row.full_name || "—"}</td>
                      <td>{row.course || "—"}</td>
                      <td>{row.year_level || "—"}</td>
                      <td>{row.section || "—"}</td>
                      <td>{row.academic_status}</td>
                      <td>
                        <span data-status={row.status}>
                          {row.status === "new"
                            ? "Add record only"
                            : row.status === "existing"
                              ? "Skip existing ID"
                              : "Fix errors"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {pageCount > 1 && (
              <div className="class-import__pagination">
                <button
                  type="button"
                  className="class-import__secondary"
                  disabled={page === 0}
                  onClick={() => setPage((value) => value - 1)}
                >
                  Previous
                </button>
                <span>
                  Page {page + 1} of {pageCount}
                </span>
                <button
                  type="button"
                  className="class-import__secondary"
                  disabled={page + 1 >= pageCount}
                  onClick={() => setPage((value) => value + 1)}
                >
                  Next
                </button>
              </div>
            )}
            <p className="class-import__hint">
              Review every ID and name. Confirming adds new records only.
              Existing records are never overwritten.
            </p>
            {preview.import_id ? (
              <button
                type="button"
                className="class-import__primary"
                disabled={
                  Boolean(busy) ||
                  (preview.warnings.length > 0 && !warningsReviewed)
                }
                onClick={confirm}
              >
                {busy === "commit"
                  ? "Importing..."
                  : `Confirm import (${preview.summary.new} new records)`}
              </button>
            ) : (
              preview.issues.length === 0 && (
                <p role="status">
                  All Student IDs already exist. There is nothing new to import.
                </p>
              )
            )}
          </section>
        )}
      </div>
    </details>
  );
}
