import { Navigate, Outlet } from "react-router";

import { getAdminToken } from "@/lib/admin-session";

export default function RequireAdmin() {
  return getAdminToken() ? <Outlet /> : <Navigate to="/admin/login" replace />;
}
