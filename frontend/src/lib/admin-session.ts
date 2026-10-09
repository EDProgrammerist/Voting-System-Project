import type { AdminUser } from "@/types/admin";

export const ADMIN_TOKEN_KEY = "admin_access_token";
export const ADMIN_USER_KEY = "admin_user";

export function saveAdminSession(token: string, admin: AdminUser): void {
  sessionStorage.setItem(ADMIN_TOKEN_KEY, token);
  sessionStorage.setItem(ADMIN_USER_KEY, JSON.stringify(admin));
}

export function getAdminToken(): string | null {
  return sessionStorage.getItem(ADMIN_TOKEN_KEY);
}

export function getAdminUser(): AdminUser | null {
  const value = sessionStorage.getItem(ADMIN_USER_KEY);

  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as AdminUser;
  } catch {
    return null;
  }
}

export function clearAdminSession(): void {
  sessionStorage.removeItem(ADMIN_TOKEN_KEY);
  sessionStorage.removeItem(ADMIN_USER_KEY);
}
