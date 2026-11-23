import { useState } from "react";
import { QrCode } from "@phosphor-icons/react";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { useAdminElection } from "@/hooks/use-admin-election";
import { AdminElectionQr } from "./admin-election-qr";
import "../admin-dashboard/admin-dashboard-screen.css";
import "../admin-dashboard/admin-overview.css";
import "./admin-settings-screen.css";
import { PageSkeleton } from "@/components/common/page-skeleton";

export function AdminSettingsScreen() {
  const [attempt, setAttempt] = useState(0);
  const { election, state, error } = useAdminElection(attempt);
  const loading = state === "loading";
  useDocumentTitle("Settings | CPC Vote Admin");

  if (loading)
    return (
      <section className="admin-dashboard__content">
        <PageSkeleton kind="settings" label="Loading election settings" />
      </section>
    );
  return (
    <>
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
                Students can scan this code directly from the screen to open
                student login.
              </p>
            </div>
          </header>
          {error ? (
            <div role="alert">
              <p>{error}</p>
              <button
                type="button"
                className="admin-settings__retry"
                onClick={() => {
                  setAttempt((value) => value + 1);
                }}
              >
                Try again
              </button>
            </div>
          ) : election ? (
            <>
              <p className="admin-settings__election">{election.name}</p>
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
    </>
  );
}
