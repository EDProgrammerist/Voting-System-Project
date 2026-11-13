import type { DashboardDataState } from "@/hooks/use-admin-election-dashboard";
import type { ElectionSummary } from "@/types/dashboard";
import { PageSkeleton, type LoadingPageKind } from "@/components/common/page-skeleton";

export function AdminDataState({ state, message, kind = "table" }: { state: DashboardDataState; message: string; kind?: LoadingPageKind }) {
  if (state === "loading") return <PageSkeleton kind={kind} label="Loading election data" />;
  return (
    <div aria-live="polite" className="admin-data-state" role="status">
      <strong>Election data unavailable</strong>
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
