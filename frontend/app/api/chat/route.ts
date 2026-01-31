import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";
import { getSession } from "@/lib/session";
import { searchSimilarChunks } from "@/lib/vectors";
import { connectDB } from "@/lib/db";
import { Conversation, Message } from "@/models";
import { logUsage } from "@/lib/costs";
import { Types } from "mongoose";

// Permitir respuestas de hasta 30 segundos
export const maxDuration = 30;

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return new Response("No autorizado", { status: 401 });
    }

    // Solo usuarios con companyId pueden usar el chat
    if (!session.companyId) {
      return new Response("Usuario sin empresa asignada", { status: 403 });
    }

    const body = await req.json();
    const { messages, conversationId } = body as {
      messages: ChatMessage[];
      conversationId?: string;
    };

    if (!messages || messages.length === 0) {
      return new Response("Mensajes requeridos", { status: 400 });
    }

    await connectDB();

    // Obtener el último mensaje del usuario
    const lastUserMessage = messages.filter((m) => m.role === "user").pop();
    const userQuery = lastUserMessage?.content || "";

    // Buscar chunks relevantes con vector search
    const chunks = await searchSimilarChunks({
      query: userQuery,
      companyId: session.companyId,
      userId: session.userId,
      limit: 5,
    });

    // Construir contexto para RAG
    const context =
      chunks.length > 0
        ? chunks.map((c) => c.text).join("\n\n---\n\n")
        : "No hay documentos disponibles para esta consulta.";

    // System prompt con contexto RAG
    const systemPrompt = `Eres un asistente útil que responde preguntas basándote en la información proporcionada.

CONTEXTO DE LA EMPRESA:
${context}

INSTRUCCIONES:
- Responde de manera clara y concisa basándote en el contexto proporcionado.
- Si la información no está en el contexto, indica que no tienes esa información disponible.
- No inventes información que no esté en el contexto.
- Responde siempre en español.`;

    // Convertir mensajes al formato del modelo
    const modelMessages = messages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    // Manejar o crear conversación
    let actualConversationId = conversationId;
    if (!actualConversationId) {
      // Crear nueva conversación
      const newConversation = await Conversation.create({
        userId: new Types.ObjectId(session.userId),
        companyId: new Types.ObjectId(session.companyId),
        titulo:
          userQuery.slice(0, 50) + (userQuery.length > 50 ? "..." : "") ||
          "Nueva conversación",
      });
      actualConversationId = newConversation._id.toString();
    }

    // Guardar mensaje del usuario
    const userMessage = await Message.create({
      conversationId: new Types.ObjectId(actualConversationId),
      role: "user",
      content: userQuery,
      chunksUsed: [],
    });

    // Stream de respuesta con Vercel AI SDK
    const result = streamText({
      model: openai("gpt-4o-mini"),
      system: systemPrompt,
      messages: modelMessages,
      onFinish: async ({ text, usage }) => {
        // Guardar mensaje del asistente
        await Message.create({
          conversationId: new Types.ObjectId(actualConversationId!),
          role: "assistant",
          content: text,
          chunksUsed: chunks.map((c) => c._id),
          tokenCount: usage.totalTokens,
        });

        // Actualizar título de conversación si es el primer mensaje
        if (messages.length <= 1) {
          await Conversation.findByIdAndUpdate(actualConversationId, {
            titulo:
              userQuery.slice(0, 50) + (userQuery.length > 50 ? "..." : ""),
          });
        }

        // Registrar uso de chat completion para control de costos
        // En AI SDK v6, usage tiene inputTokens y outputTokens directamente
        const inputTokens = (usage as { inputTokens?: number }).inputTokens ?? 0;
        const outputTokens = (usage as { outputTokens?: number }).outputTokens ?? 0;
        
        await logUsage({
          companyId: session.companyId,
          userId: session.userId,
          type: "chat_completion",
          model: "gpt-4o-mini",
          inputTokens,
          outputTokens,
          metadata: {
            conversationId: actualConversationId,
            userMessageId: userMessage._id.toString(),
            chunksUsed: chunks.length,
          },
        });
      },
    });

    // Retornar stream con metadata adicional
    return result.toTextStreamResponse({
      headers: {
        "X-Conversation-Id": actualConversationId,
      },
    });
  } catch (error) {
    console.error("Error en chat:", error);
    return new Response("Error interno del servidor", { status: 500 });
  }
}
