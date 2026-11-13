import { lazy, Suspense } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router";

import { getAdminToken } from "@/lib/admin-session";
import {
  getVoterToken,
  isVoterTallyOnly,
  isVoterPasswordRequired,
} from "@/lib/voter-session";
import RequireAdmin from "@/routes/require-admin";
import RequireVoter from "@/routes/require-voter";
import RequireCommittee from "@/routes/require-committee";
import { getCommitteeToken } from "@/lib/committee-session";
import { AuthLoading } from "@/components/common/page-skeleton";
import {
  StaffPortalLayout,
  VoterPortalLayout,
} from "@/components/common/portal-layouts";

const AdminCandidatesPage = lazy(() => import("@/pages/admin/candidates"));
const AdminPartylistsPage = lazy(() => import("@/pages/admin/partylists"));
const AdminDashboardPage = lazy(() => import("@/pages/admin/dashboard"));
const AdminLoginPage = lazy(() => import("@/pages/admin/login"));
const CommitteeVotersPage = lazy(() => import("@/pages/committee/voters"));
const CommitteeLoginPage = lazy(() => import("@/pages/committee/login"));
const AdminVotesPage = lazy(() => import("@/pages/admin/votes"));
const AdminSettingsPage = lazy(() => import("@/pages/admin/settings"));
const HomePage = lazy(() => import("@/pages/guest/home"));
const GuestLayout = lazy(() => import("@/pages/guest/layout"));
const NotFoundPage = lazy(() => import("@/pages/guest/not-found"));
const VoterLoginPage = lazy(() => import("@/pages/voter/login"));
const VoterQrEntryPage = lazy(
  () => import("@/components/features/voter-auth/voter-qr-entry-screen"),
);
const VoterPasswordPage = lazy(() =>
  import("@/components/features/voter-auth/voter-login-screen").then(
    (module) => ({ default: module.VoterPasswordScreen }),
  ),
);
const VoterBallotPage = lazy(() => import("@/pages/voter/ballot"));
const VoterReviewPage = lazy(() => import("@/pages/voter/review"));
const VoterTallyPage = lazy(
  () => import("@/components/features/voter-shared/voter-tally-screen"),
);

export default function AppRouter() {
  // Refresh session-based redirects after sign-in or sign-out navigation.
  useLocation();
  const hasAdminToken = Boolean(getAdminToken());
  const hasVoterToken = Boolean(getVoterToken());
  const hasCommitteeToken = Boolean(getCommitteeToken());
  const defaultRoute = hasAdminToken
    ? "/admin/dashboard"
    : hasCommitteeToken
      ? "/committee/voters"
      : hasVoterToken
        ? isVoterPasswordRequired()
          ? "/voter/password"
          : isVoterTallyOnly()
            ? "/voter/tally"
            : "/voter/ballot"
        : "/voter/login";

  return (
    <Suspense fallback={<AuthLoading />}>
      <Routes>
        <Route
          path="/committee/login"
          element={
            hasCommitteeToken ? (
              <Navigate to="/committee/voters" replace />
            ) : (
              <CommitteeLoginPage />
            )
          }
        />
        <Route element={<RequireCommittee />}>
          <Route element={<StaffPortalLayout portal="committee" />}>
            <Route path="/committee/voters" element={<CommitteeVotersPage />} />
          </Route>
        </Route>
        <Route
          path="/admin/voters"
          element={<Navigate to="/committee/voters" replace />}
        />
        <Route path="/vote/:code" element={<VoterQrEntryPage />} />
        <Route path="/" element={<Navigate to={defaultRoute} replace />} />
        <Route path="/login" element={<Navigate to={defaultRoute} replace />} />
        <Route
          path="/voter/login"
          element={
            hasVoterToken ? (
              <Navigate
                to={
                  isVoterPasswordRequired()
                    ? "/voter/password"
                    : isVoterTallyOnly()
                      ? "/voter/tally"
                      : "/voter/ballot"
                }
                replace
              />
            ) : (
              <VoterLoginPage />
            )
          }
        />
        <Route element={<RequireVoter />}>
          <Route path="/voter/password" element={<VoterPasswordPage />} />
        </Route>
        <Route element={<VoterPortalLayout />}>
          <Route element={<RequireVoter />}>
            <Route path="/voter/ballot" element={<VoterBallotPage />} />
            <Route path="/voter/review" element={<VoterReviewPage />} />
            <Route path="/voter/tally" element={<VoterTallyPage />} />
            <Route
              path="/voter/thank-you"
              element={<Navigate to="/voter/tally" replace />}
            />
          </Route>
        </Route>
        <Route
          path="/admin/login"
          element={
            hasAdminToken ? (
              <Navigate to="/admin/dashboard" replace />
            ) : (
              <AdminLoginPage />
            )
          }
        />
        <Route element={<RequireAdmin />}>
          <Route element={<StaffPortalLayout portal="admin" />}>
            <Route path="/admin/settings" element={<AdminSettingsPage />} />
            <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
            <Route path="/admin/votes" element={<AdminVotesPage />} />
            <Route
              path="/admin/positions"
              element={<Navigate to="/admin/candidates" replace />}
            />
            <Route path="/admin/candidates" element={<AdminCandidatesPage />} />
            <Route path="/admin/partylists" element={<AdminPartylistsPage />} />
            <Route
              path="/admin/ballot-position"
              element={<Navigate to="/admin/candidates" replace />}
            />
          </Route>
        </Route>
        <Route element={<GuestLayout />}>
          <Route path="/home" element={<HomePage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
