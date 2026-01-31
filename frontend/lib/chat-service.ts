import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";
import { searchSimilarChunks, type ChunkSearchResult } from "./vectors";
import { logUsage } from "./costs";
import { connectDB } from "./db";

interface GenerateRAGResponseParams {
  query: string;
  companyId: string;
  userId: string;
  maxChunks?: number;
}

interface RAGResponse {
  text: string;
  chunks: ChunkSearchResult[];
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
}

/**
 * Genera una respuesta usando RAG (Retrieval Augmented Generation)
 * Busca chunks relevantes y genera una respuesta con OpenAI
 * 
 * Esta función es reutilizable tanto para el chat web como para WhatsApp
 */
export async function generateRAGResponse(
  params: GenerateRAGResponseParams
): Promise<RAGResponse> {
  const { query, companyId, userId, maxChunks = 5 } = params;

  await connectDB();

  // Buscar chunks relevantes con vector search
  const chunks = await searchSimilarChunks({
    query,
    companyId,
    userId,
    limit: maxChunks,
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

  // Generar respuesta con OpenAI (sin streaming para WhatsApp)
  const result = await generateText({
    model: openai("gpt-4o-mini"),
    system: systemPrompt,
    prompt: query,
  });

  // Registrar uso para control de costos
  const inputTokens = result.usage?.promptTokens ?? 0;
  const outputTokens = result.usage?.completionTokens ?? 0;

  await logUsage({
    companyId,
    userId,
    type: "chat_completion",
    model: "gpt-4o-mini",
    inputTokens,
    outputTokens,
    metadata: {
      source: "chat-service",
      chunksUsed: chunks.length,
    },
  });

  return {
    text: result.text,
    chunks,
    usage: {
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
    },
  };
}

/**
 * Versión simplificada que solo devuelve el texto
 * Útil para WhatsApp donde no necesitamos metadata
 */
export async function generateSimpleResponse(
  query: string,
  companyId: string,
  userId: string
): Promise<string> {
  const response = await generateRAGResponse({ query, companyId, userId });
  return response.text;
}
