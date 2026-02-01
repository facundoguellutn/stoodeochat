import { getSession } from "@/lib/session";
import { connectDB } from "@/lib/db";
import { Conversation, Message, Chunk, Document } from "@/models";
import { Types } from "mongoose";

interface ChunkSource {
  documentName: string;
  documentId: string;
}

interface MessageWithSources {
  _id: Types.ObjectId;
  conversationId: Types.ObjectId;
  role: string;
  content: string;
  chunksUsed: Types.ObjectId[];
  sources?: ChunkSource[];
  tokenCount?: number;
  createdAt: Date;
}

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

    // Enriquecer mensajes del asistente con información de fuentes
    const messagesWithSources: MessageWithSources[] = await Promise.all(
      messages.map(async (msg) => {
        if (msg.role === "assistant" && msg.chunksUsed && msg.chunksUsed.length > 0) {
          // Obtener los chunks usados
          const chunks = await Chunk.find({
            _id: { $in: msg.chunksUsed },
          })
            .select("documentId")
            .lean();

          // Obtener nombres únicos de documentos
          const documentIds = [...new Set(chunks.map((c) => c.documentId.toString()))];
          const documents = await Document.find({
            _id: { $in: documentIds },
          })
            .select("nombre")
            .lean();

          const sources: ChunkSource[] = documents.map((doc) => ({
            documentName: doc.nombre,
            documentId: doc._id.toString(),
          }));

          return { ...msg, sources };
        }
        return msg as MessageWithSources;
      })
    );

    return Response.json({ conversation, messages: messagesWithSources });
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
