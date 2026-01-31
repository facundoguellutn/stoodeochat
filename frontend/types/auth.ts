import type { UserRole } from "./models";

export interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
  companyId?: string;
}

export interface Session {
  userId: string;
  email: string;
  role: UserRole;
  companyId?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: {
    id: string;
    email: string;
    nombre: string;
    role: UserRole;
    companyId?: string;
  };
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}
