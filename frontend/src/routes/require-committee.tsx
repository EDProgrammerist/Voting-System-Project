import { Navigate, Outlet } from "react-router";
import { getCommitteeToken } from "@/lib/committee-session";
export default function RequireCommittee() {
  return getCommitteeToken() ? (
    <Outlet />
  ) : (
    <Navigate to="/committee/login" replace />
  );
}
