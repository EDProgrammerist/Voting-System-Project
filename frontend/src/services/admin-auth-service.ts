import { apiRequest } from "@/services/api-client";
import type {
  AdminLoginCredentials,
  AdminLoginResponse,
} from "@/types/admin";

export function loginAdmin(
  credentials: AdminLoginCredentials,
): Promise<AdminLoginResponse> {
  return apiRequest<AdminLoginResponse>("/admin/login", {
    method: "POST",
    body: JSON.stringify(credentials),
  });
}

