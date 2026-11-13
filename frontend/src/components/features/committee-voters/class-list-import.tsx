import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { UploadSimple } from "@phosphor-icons/react";
import { getCommitteeToken } from "@/lib/committee-session";
import {
  commitClassList,
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
  const [preview, setPreview] = useState<ClassListPreview | null>(null);
  const [result, setResult] = useState<ClassListResult | null>(null);
  const [busy, setBusy] = useState<"inspect" | "preview" | "commit" | null>(
    null,
  );
  const [error, setError] = useState("");
  const [page, setPage] = useState(0);
  const [warningsReviewed, setWarningsReviewed] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);

  function clear() {
    request.current?.abort();
    setFile(null);
    setInspection(null);
    setWorksheet("");
    setPreview(null);
    setResult(null);
    setError("");
    setBusy(null);
    setPage(0);
    setWarningsReviewed(false);
    if (fileInput.current) fileInput.current.value = "";
  }

  async function processFile(selected: File, sheet?: string) {
    const token = getCommitteeToken();
    if (!token) return;
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setBusy("preview");
    setError("");
    setPreview(null);
    setResult(null);
    setPage(0);
    setWarningsReviewed(false);
    try {
      const data = await previewClassList(
        token,
        selected,
        sheet,
        controller.signal,
      );
      if (controller.signal.aborted) return;
      setWorksheet(data.layout.worksheet);
      setPreview(data);
      if (data.import_id && !data.issues.length && !data.warnings.length) {
        setBusy("commit");
        const imported = await commitClassList(token, data.import_id);
        if (controller.signal.aborted) return;
        setResult(imported);
        setPreview(null);
        onImported();
      }
    } catch (err) {
      if (!controller.signal.aborted)
        setError(
          err instanceof Error
            ? err.message
            : "Unable to import this class list.",
        );
    } finally {
      if (!controller.signal.aborted) setBusy(null);
    }
  }

  async function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0];
    request.current?.abort();
    setInspection(null);
    setWorksheet("");
    setPreview(null);
    setResult(null);
    setError("");
    setBusy(null);
    setPage(0);
    setWarningsReviewed(false);
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
    request.current = controller;
    setBusy("inspect");
    try {
      const data = await inspectClassList(token, selected, controller.signal);
      if (controller.signal.aborted) return;
      setInspection(data);
      if (data.worksheets.length === 1)
        await processFile(selected, data.worksheets[0].name);
    } catch (err) {
      if (!controller.signal.aborted)
        setError(
          err instanceof Error ? err.message : "Unable to read this workbook.",
        );
    } finally {
      if (request.current === controller && !controller.signal.aborted)
        setBusy(null);
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

  const pageCount = preview ? Math.ceil(preview.rows.length / 20) : 0;
  return (
    <details className="class-import">
      <summary>
        <UploadSimple aria-hidden="true" />
        <span>Import class list from Excel</span>
      </summary>
      <div className="class-import__body" aria-busy={Boolean(busy)}>
        <p className="class-import__hint">
          Choose your class list to import and organize records automatically.
          Headers and names are detected, including Lastname, Firstname, and
          M.I. Existing IDs are skipped. New records receive no password or
          login access. Maximum 5 MB and 5,000 rows. Keep Student IDs as text to
          preserve leading zeros.
        </p>
        <div className="class-import__upload">
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
          {inspection && inspection.worksheets.length > 1 && (
            <label>
              Choose the class-list worksheet
              <select
                aria-label="Class-list worksheet"
                value={worksheet}
                disabled={Boolean(busy)}
                onChange={(event) => {
                  setWorksheet(event.target.value);
                  if (file) void processFile(file, event.target.value);
                }}
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
          )}
          {busy && (
            <p role="status">
              {busy === "inspect"
                ? "Reading workbook..."
                : busy === "preview"
                  ? "Detecting and checking student records..."
                  : "Importing student records..."}
            </p>
          )}
          <div className="class-import__actions">
            {file && (
              <button
                className="class-import__secondary"
                type="button"
                disabled={busy === "commit"}
                onClick={clear}
              >
                {result ? "Choose another file" : "Cancel import"}
              </button>
            )}
            {file && error && (
              <button
                className="class-import__primary"
                type="button"
                disabled={Boolean(busy)}
                onClick={() => void processFile(file, worksheet || undefined)}
              >
                Try upload again
              </button>
            )}
          </div>
        </div>
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
