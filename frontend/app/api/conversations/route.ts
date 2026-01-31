import { NextRequest } from "next/server";
import { getSession } from "@/lib/session";
import { connectDB } from "@/lib/db";
import { Conversation } from "@/models";
import { Types } from "mongoose";

// GET - Listar conversaciones del usuario
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return Response.json({ error: "No autorizado" }, { status: 401 });
    }

    if (!session.companyId) {
      return Response.json(
        { error: "Usuario sin empresa asignada" },
        { status: 403 }
      );
    }

    await connectDB();

    const searchParams = req.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    const [conversations, total] = await Promise.all([
      Conversation.find({
        userId: new Types.ObjectId(session.userId),
        companyId: new Types.ObjectId(session.companyId),
      })
        .sort({ updatedAt: -1 })
        .skip(offset)
        .limit(limit)
        .lean(),
      Conversation.countDocuments({
        userId: new Types.ObjectId(session.userId),
        companyId: new Types.ObjectId(session.companyId),
      }),
    ]);

    return Response.json({ conversations, total });
  } catch (error) {
    console.error("Error al listar conversaciones:", error);
    return Response.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

// POST - Crear nueva conversación
export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return Response.json({ error: "No autorizado" }, { status: 401 });
    }

    if (!session.companyId) {
      return Response.json(
        { error: "Usuario sin empresa asignada" },
        { status: 403 }
      );
    }

    await connectDB();

    const body = await req.json();
    const { titulo } = body as { titulo?: string };

    const conversation = await Conversation.create({
      userId: new Types.ObjectId(session.userId),
      companyId: new Types.ObjectId(session.companyId),
      titulo: titulo || "Nueva conversación",
    });

    return Response.json({ conversation }, { status: 201 });
  } catch (error) {
    console.error("Error al crear conversación:", error);
    return Response.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
