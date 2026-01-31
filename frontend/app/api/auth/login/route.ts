import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import { User } from "@/models";
import {
  verifyPassword,
  createAccessToken,
  createRefreshToken,
} from "@/lib/auth";
import { setAuthCookies } from "@/lib/session";
import type { LoginRequest } from "@/types/auth";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as LoginRequest;
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email y contraseña son requeridos" },
        { status: 400 }
      );
    }

    await connectDB();

    const user = await User.findOne({ email: email.toLowerCase(), activo: true }).select(
      "+password"
    );

    if (!user) {
      return NextResponse.json(
        { error: "Credenciales inválidas" },
        { status: 401 }
      );
    }

    const isValid = await verifyPassword(password, user.password);
    if (!isValid) {
      return NextResponse.json(
        { error: "Credenciales inválidas" },
        { status: 401 }
      );
    }

    const tokenPayload = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      companyId: user.companyId?.toString(),
    };

    const [accessToken, refreshToken] = await Promise.all([
      createAccessToken(tokenPayload),
      createRefreshToken(tokenPayload),
    ]);

    const cookieStore = await cookies();
    setAuthCookies(cookieStore, accessToken, refreshToken);

    return NextResponse.json({
      user: {
        id: user._id.toString(),
        email: user.email,
        nombre: user.nombre,
        role: user.role,
        companyId: user.companyId?.toString(),
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
