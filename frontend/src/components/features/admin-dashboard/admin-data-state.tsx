import type { DashboardDataState } from "@/hooks/use-admin-election-dashboard";
import type { ElectionSummary } from "@/types/dashboard";

export function AdminDataState({ state, message }: { state: DashboardDataState; message: string }) {
  return (
    <div aria-live="polite" className="admin-data-state" role="status">
      <strong>{state === "loading" ? "Loading election data…" : "Election data unavailable"}</strong>
      {state === "error" && <p>{message || "Please refresh the page and try again."}</p>}
    </div>
  );
}

export function AdminElectionPicker({
  elections,
  selectedElectionId,
  onChange,
}: {
  elections: ElectionSummary[];
  selectedElectionId: number | null;
  onChange: (electionId: number) => void;
}) {
  return (
    <label className="admin-election-picker">
      <span>Election</span>
      <select
        aria-label="Select election"
        onChange={(event) => onChange(Number(event.target.value))}
        value={selectedElectionId ?? ""}
      >
        {elections.map((election) => (
          <option key={election.id} value={election.id}>
            {election.name} ({election.status})
          </option>
        ))}
      </select>
    </label>
  );
}
