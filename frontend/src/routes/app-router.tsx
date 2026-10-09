import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router";

import { getAdminToken } from "@/lib/admin-session";
import RequireAdmin from "@/routes/require-admin";

const AdminBallotPositionPage = lazy(() => import("@/pages/admin/ballot-position"));
const AdminCandidatesPage = lazy(() => import("@/pages/admin/candidates"));
const AdminDashboardPage = lazy(() => import("@/pages/admin/dashboard"));
const AdminLoginPage = lazy(() => import("@/pages/admin/login"));
const AdminPositionsPage = lazy(() => import("@/pages/admin/positions"));
const AdminVotersPage = lazy(() => import("@/pages/admin/voters"));
const AdminVotesPage = lazy(() => import("@/pages/admin/votes"));
const HomePage = lazy(() => import("@/pages/guest/home"));
const GuestLayout = lazy(() => import("@/pages/guest/layout"));
const NotFoundPage = lazy(() => import("@/pages/guest/not-found"));

export default function AppRouter() {
  const hasAdminToken = Boolean(getAdminToken());

  return (
    <Suspense fallback={<div aria-live="polite" className="route-loading" role="status">Loading…</div>}>
      <Routes>
      <Route
        path="/"
        element={
          <Navigate
            to={hasAdminToken ? "/admin/dashboard" : "/admin/login"}
            replace
          />
        }
      />
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
        <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
        <Route path="/admin/votes" element={<AdminVotesPage />} />
        <Route path="/admin/voters" element={<AdminVotersPage />} />
        <Route path="/admin/positions" element={<AdminPositionsPage />} />
        <Route path="/admin/candidates" element={<AdminCandidatesPage />} />
        <Route
          path="/admin/ballot-position"
          element={<AdminBallotPositionPage />}
        />
      </Route>
      <Route element={<GuestLayout />}>
        <Route path="/home" element={<HomePage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
      </Routes>
    </Suspense>
  );
}
