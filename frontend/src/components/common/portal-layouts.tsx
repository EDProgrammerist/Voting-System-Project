import { Suspense, useSyncExternalStore } from "react";
import { Outlet, useLocation } from "react-router";
import { AdminSidebar } from "@/components/features/admin-dashboard/admin-sidebar";
import { VoterNavigation } from "@/components/features/voter-shared/voter-navigation";
import {
  getVoterToken,
  isVoterPasswordRequired,
  subscribeVoterAccess,
} from "@/lib/voter-session";
import { PageSkeleton, type LoadingPageKind } from "./page-skeleton";
import "@/components/features/admin-dashboard/admin-dashboard-screen.css";
import "@/components/features/admin-dashboard/admin-overview.css";
import "@/components/features/admin-dashboard/admin-management.css";

export function StaffPortalLayout({
  portal,
}: {
  portal: "admin" | "committee";
}) {
  const { pathname } = useLocation();
  const section =
    portal === "committee"
      ? pathname.endsWith("/sections") ? "sections" : "overview"
      : pathname.endsWith("/votes")
        ? "votes"
        : pathname.endsWith("/partylists")
          ? "partylists"
          : pathname.endsWith("/candidates")
            ? "candidates"
            : pathname.endsWith("/voting-qr") || pathname.endsWith("/settings")
              ? "voting-qr"
              : "dashboard";
  const kind =
    section === "votes" || section === "sections"
      ? "table"
      : section === "overview"
        ? "dashboard"
      : section === "partylists"
        ? "candidates"
        : section === "voting-qr"
          ? "settings"
          : section;
  return (
    <main
      className={`admin-dashboard admin-overview ${section === "dashboard" ? "" : section === "voting-qr" ? "admin-voting-qr" : `admin-management admin-${section === "overview" ? "committee-overview" : section}`}`}
      data-ui
    >
      <a className="overview-skip" href="#portal-main">
        Skip to content
      </a>
      <AdminSidebar active={section} overview portal={portal} />
      <div className="portal-content" id="portal-main" tabIndex={-1}>
        <Suspense
          fallback={
            <section className="admin-dashboard__content">
              <PageSkeleton kind={kind} />
            </section>
          }
        >
          <Outlet />
        </Suspense>
      </div>
    </main>
  );
}

export function VoterPortalLayout() {
  const passwordRequired = useSyncExternalStore(
    subscribeVoterAccess,
    isVoterPasswordRequired,
  );
  const { pathname } = useLocation();
  const kind: LoadingPageKind = pathname.endsWith("/review")
    ? "review"
    : pathname.endsWith("/tally")
      ? "tally"
      : "ballot";
  if (!getVoterToken() || passwordRequired) return <Outlet />;
  return (
    <main className="student-page">
      <div className="student-container">
        <VoterNavigation />
        <div id="student-main" tabIndex={-1}>
          <Suspense fallback={<PageSkeleton kind={kind} />}>
            <Outlet />
          </Suspense>
        </div>
        <footer className="student-footer">
          <span>CPC Vote</span>
          <p>Your voice. Your vote. Your community.</p>
          <span>Student elections</span>
        </footer>
      </div>
    </main>
  );
}
