import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";
import { searchSimilarChunks, type EnrichedChunkSearchResult } from "./vectors";
import { logUsage } from "./costs";
import { connectDB } from "./db";
import { Company } from "@/models";

interface GenerateRAGResponseParams {
  query: string;
  companyId: string;
  userId: string;
  maxChunks?: number;
}

interface RAGResponse {
  text: string;
  chunks: EnrichedChunkSearchResult[];
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
}

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
* Para WhatsApp: mantén las respuestas breves y directas

# Contexto de Documentos
${hasContext ? `<documentos>\n${formattedContext}\n</documentos>` : "<sin_documentos>No hay documentos relevantes para esta consulta.</sin_documentos>"}

# Formato de Respuesta
- Responde directamente a la pregunta del usuario
- Si hay información de múltiples secciones, inclúyela toda
- Si no hay información suficiente, indícalo claramente sin inventar`;
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
  const { query, companyId, userId, maxChunks = 8 } = params;

  await connectDB();

  // Obtener nombre de la empresa para personalizar el prompt
  const company = await Company.findById(companyId).select("nombre").lean();
  const companyName = company?.nombre || "la empresa";

  // Buscar chunks relevantes con vector search (filtrado por score >= 0.5)
  // Usamos 8 chunks por defecto para capturar suficiente contexto
  const chunks = await searchSimilarChunks({
    query,
    companyId,
    userId,
    limit: maxChunks,
  });

  // Construir contexto enriquecido con metadata de documentos
  const formattedContext = buildFormattedContext(chunks);
  const hasContext = chunks.length > 0;

  // System prompt estructurado siguiendo OpenAI best practices
  const systemPrompt = buildSystemPrompt(companyName, formattedContext, hasContext);

  // Generar respuesta con OpenAI (sin streaming para WhatsApp)
  const result = await generateText({
    model: openai("gpt-4o-mini"),
    system: systemPrompt,
    prompt: query,
  });

  // Registrar uso para control de costos
  const inputTokens = result.usage?.inputTokens ?? 0;
  const outputTokens = result.usage?.outputTokens ?? 0;

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
      sources: chunks.map(c => c.documentName),
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
