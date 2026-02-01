import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";
import { getSession } from "@/lib/session";
import { searchSimilarChunks, type EnrichedChunkSearchResult } from "@/lib/vectors";
import { connectDB } from "@/lib/db";
import { Company, Conversation, Message } from "@/models";
import { logUsage } from "@/lib/costs";
import { Types } from "mongoose";

// Límite de mensajes del historial para no exceder contexto
const MAX_HISTORY_MESSAGES = 10;

/**
 * Construye el contexto formateado con metadata de documentos
 * Usa formato XML para que el modelo pueda identificar mejor las fuentes
 */
function buildFormattedContext(chunks: EnrichedChunkSearchResult[]): string {
  if (chunks.length === 0) {
    return "";
  }

  return chunks
    .map(
      (c, i) =>
        `<documento id="${i + 1}" fuente="${c.documentName}" relevancia="${(c.score * 100).toFixed(0)}%">
${c.text}
</documento>`
    )
    .join("\n\n");
}

/**
 * Genera el system prompt estructurado siguiendo OpenAI best practices
 */
function buildSystemPrompt(
  companyName: string,
  formattedContext: string,
  hasContext: boolean
): string {
  return `# Identidad
Eres un asistente de conocimiento interno para ${companyName}. Tu objetivo es ayudar a los usuarios a encontrar información precisa basada en los documentos de la empresa.

# Instrucciones
* Responde ÚNICAMENTE con información del contexto proporcionado en la sección <documentos>
* Si la información solicitada NO está en el contexto, responde: "No tengo esa información en los documentos disponibles."
* NO inventes ni extrapoles información que no esté explícitamente en el contexto
* Responde de forma clara, estructurada y concisa
* Usa listas o puntos cuando mejore la claridad de la respuesta
* Responde siempre en español

# Contexto de Documentos
${hasContext ? `<documentos>\n${formattedContext}\n</documentos>` : "<sin_documentos>No hay documentos relevantes para esta consulta.</sin_documentos>"}

# Formato de Respuesta
- Responde directamente a la pregunta del usuario
- Si hay información de múltiples secciones, inclúyela toda
- Si no hay información suficiente, indícalo claramente sin inventar`;
}

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

    // Obtener información de la empresa para personalizar el prompt
    const company = await Company.findById(session.companyId).select("nombre").lean();
    const companyName = company?.nombre || "la empresa";

    // Obtener el último mensaje del usuario
    const lastUserMessage = messages.filter((m) => m.role === "user").pop();
    const userQuery = lastUserMessage?.content || "";

    // Buscar chunks relevantes con vector search (filtrado por score >= 0.5)
    // Usamos 8 chunks para capturar suficiente contexto en documentos extensos
    const chunks = await searchSimilarChunks({
      query: userQuery,
      companyId: session.companyId,
      userId: session.userId,
      limit: 8,
    });

    // Construir contexto enriquecido con metadata de documentos
    const formattedContext = buildFormattedContext(chunks);
    const hasContext = chunks.length > 0;

    // System prompt estructurado siguiendo OpenAI best practices
    const systemPrompt = buildSystemPrompt(companyName, formattedContext, hasContext);

    // Limitar historial de mensajes para no exceder contexto
    const recentMessages = messages.slice(-MAX_HISTORY_MESSAGES);
    
    // Convertir mensajes al formato del modelo
    const modelMessages = recentMessages.map((m) => ({
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
