export interface AdminUser {
  name: string;
  email: string;
}

export interface AdminLoginCredentials {
  email: string;
  password: string;
}

export interface AdminLoginResponse {
  message: string;
  token: string;
  admin: AdminUser;
}

