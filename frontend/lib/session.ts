import { cookies } from "next/headers";
import {
  verifyAccessToken,
  verifyRefreshToken,
  createAccessToken,
} from "./auth";
import type { Session, JWTPayload } from "@/types/auth";

export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;

  if (accessToken) {
    const payload = await verifyAccessToken(accessToken);
    if (payload) {
      return toSession(payload);
    }
  }

  const refreshToken = cookieStore.get("refresh_token")?.value;
  if (!refreshToken) {
    return null;
  }

  const refreshPayload = await verifyRefreshToken(refreshToken);
  if (!refreshPayload) {
    return null;
  }

  const newAccessToken = await createAccessToken({
    userId: refreshPayload.userId,
    email: refreshPayload.email,
    role: refreshPayload.role,
    companyId: refreshPayload.companyId,
  });

  cookieStore.set("access_token", newAccessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 15 * 60,
  });

  return toSession(refreshPayload);
}

function toSession(payload: JWTPayload): Session {
  return {
    userId: payload.userId,
    email: payload.email,
    role: payload.role,
    companyId: payload.companyId,
  };
}

export function setAuthCookies(
  cookieStore: Awaited<ReturnType<typeof cookies>>,
  accessToken: string,
  refreshToken: string
) {
  cookieStore.set("access_token", accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 15 * 60,
  });

  cookieStore.set("refresh_token", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60,
  });
}

export function clearAuthCookies(
  cookieStore: Awaited<ReturnType<typeof cookies>>
) {
  cookieStore.delete("access_token");
  cookieStore.delete("refresh_token");
}
