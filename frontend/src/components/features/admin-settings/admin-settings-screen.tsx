import { useEffect, useState } from "react";
import { QrCode } from "@phosphor-icons/react";
import { AdminSidebar } from "@/components/features/admin-dashboard/admin-sidebar";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { getAdminToken } from "@/lib/admin-session";
import { listAdminElections } from "@/services/admin-dashboard-service";
import type { ElectionSummary } from "@/types/dashboard";
import { AdminElectionQr } from "./admin-election-qr";
import "../admin-dashboard/admin-dashboard-screen.css";
import "../admin-dashboard/admin-overview.css";
import "./admin-settings-screen.css";

export function AdminSettingsScreen() {
  const [elections, setElections] = useState<ElectionSummary[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useDocumentTitle("Settings | CPC Vote Admin");

  useEffect(() => {
    const token = getAdminToken();
    if (!token) return;
    let active = true;
    listAdminElections(token)
      .then(({ data }) => {
        if (!active) return;
        setElections(data);
        const preferred =
          data.find((item) => item.status === "active") ??
          data.find((item) => item.status === "draft") ??
          data[0];
        setSelectedId(preferred?.id ?? null);
        setError("");
      })
      .catch((err: unknown) => {
        if (active)
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load election settings.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [attempt]);

  const election = elections.find((item) => item.id === selectedId);
  return (
    <main className="admin-dashboard admin-overview admin-settings">
      <AdminSidebar active="settings" overview />
      <section className="admin-dashboard__content">
        <header className="admin-settings__heading">
          <h1>Settings</h1>
          <p>Manage the voting tools for your school election.</p>
        </header>
        <section
          className="admin-settings__card"
          aria-labelledby="settings-voting-qr-title"
          aria-busy={loading}
        >
          <header>
            <QrCode aria-hidden="true" />
            <div>
              <h2 id="settings-voting-qr-title">Voting QR code</h2>
              <p>
                Create the shared QR poster students scan to open student login.
              </p>
            </div>
          </header>
          {loading ? (
            <p role="status">Loading elections...</p>
          ) : error ? (
            <div role="alert">
              <p>{error}</p>
              <button
                type="button"
                className="admin-settings__retry"
                onClick={() => {
                  setLoading(true);
                  setError("");
                  setAttempt((value) => value + 1);
                }}
              >
                Try again
              </button>
            </div>
          ) : election ? (
            <>
              <label className="admin-settings__election">
                Election
                <select
                  value={election.id}
                  onChange={(event) =>
                    setSelectedId(Number(event.target.value))
                  }
                >
                  {elections.map((item) => (
                    <option value={item.id} key={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
              <p className="admin-settings__status">
                {election.status === "closed"
                  ? "This election is closed. Its QR code no longer accepts new voters."
                  : election.status === "draft"
                    ? "Draft election. Students can preview the ballot; vote submission stays disabled until the election opens."
                    : "Students sign in after scanning. Attendance is recorded only after a successful vote."}
              </p>
              <AdminElectionQr
                key={election.id}
                electionId={election.id}
                disabled={election.status === "closed"}
              />
            </>
          ) : (
            <p>No elections are available yet.</p>
          )}
        </section>
      </section>
    </main>
  );
}
