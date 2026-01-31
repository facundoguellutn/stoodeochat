import { getSession } from "@/lib/session";
import { connectDB } from "@/lib/db";
import { Conversation, Message } from "@/models";
import { Types } from "mongoose";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET - Obtener conversación con mensajes
export async function GET(req: Request, { params }: RouteParams) {
  try {
    const session = await getSession();
    if (!session) {
      return Response.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;

    if (!Types.ObjectId.isValid(id)) {
      return Response.json({ error: "ID inválido" }, { status: 400 });
    }

    await connectDB();

    const conversation = await Conversation.findOne({
      _id: new Types.ObjectId(id),
      userId: new Types.ObjectId(session.userId),
    }).lean();

    if (!conversation) {
      return Response.json(
        { error: "Conversación no encontrada" },
        { status: 404 }
      );
    }

    const messages = await Message.find({
      conversationId: new Types.ObjectId(id),
    })
      .sort({ createdAt: 1 })
      .lean();

    return Response.json({ conversation, messages });
  } catch (error) {
    console.error("Error al obtener conversación:", error);
    return Response.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar conversación y sus mensajes
export async function DELETE(req: Request, { params }: RouteParams) {
  try {
    const session = await getSession();
    if (!session) {
      return Response.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;

    if (!Types.ObjectId.isValid(id)) {
      return Response.json({ error: "ID inválido" }, { status: 400 });
    }

    await connectDB();

    // Verificar que la conversación pertenece al usuario
    const conversation = await Conversation.findOne({
      _id: new Types.ObjectId(id),
      userId: new Types.ObjectId(session.userId),
    });

    if (!conversation) {
      return Response.json(
        { error: "Conversación no encontrada" },
        { status: 404 }
      );
    }

    // Eliminar mensajes asociados
    await Message.deleteMany({
      conversationId: new Types.ObjectId(id),
    });

    // Eliminar conversación
    await Conversation.findByIdAndDelete(id);

    return Response.json({ success: true });
  } catch (error) {
    console.error("Error al eliminar conversación:", error);
    return Response.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
