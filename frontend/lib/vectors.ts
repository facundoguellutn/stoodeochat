import { getOpenAIClient } from "./openai";
import { logUsage } from "./costs";
import { connectDB } from "./db";
import { Chunk } from "@/models";
import type { EmbeddingModel } from "openai/resources/embeddings";
import type { IChunk } from "@/types/models";
import { Types } from "mongoose";

const MAX_BATCH_SIZE = 2048;

export interface ChunkSearchResult {
  _id: Types.ObjectId;
  text: string;
  documentId: Types.ObjectId;
  score: number;
}

export async function generateEmbeddings(
  texts: string[],
  model: string,
  userId: string,
  companyId?: string,
  metadata?: Record<string, unknown>
): Promise<number[][]> {
  const openai = getOpenAIClient();
  const allEmbeddings: number[][] = [];

  for (let i = 0; i < texts.length; i += MAX_BATCH_SIZE) {
    const batch = texts.slice(i, i + MAX_BATCH_SIZE);

    const response = await openai.embeddings.create({
      model: model as EmbeddingModel,
      input: batch,
    });

    const batchEmbeddings = response.data.map((d) => d.embedding);
    allEmbeddings.push(...batchEmbeddings);

    await logUsage({
      companyId,
      userId,
      type: "embedding",
      model,
      inputTokens: response.usage.prompt_tokens,
      outputTokens: 0,
      metadata: {
        batchSize: batch.length,
        batchIndex: Math.floor(i / MAX_BATCH_SIZE),
        ...metadata,
      },
    });
  }

  return allEmbeddings;
}

/**
 * Busca chunks similares usando MongoDB Atlas Vector Search
 * Requiere índice vectorial creado en Atlas con nombre "vector_index"
 */
export async function searchSimilarChunks(params: {
  query: string;
  companyId: string;
  userId: string;
  limit?: number;
  embeddingModel?: string;
}): Promise<ChunkSearchResult[]> {
  const {
    query,
    companyId,
    userId,
    limit = 5,
    embeddingModel = "text-embedding-3-small",
  } = params;

  await connectDB();

  // Generar embedding de la query
  const [queryEmbedding] = await generateEmbeddings(
    [query],
    embeddingModel,
    userId,
    companyId,
    { action: "vector_search", query }
  );

  // Vector search con filtro multi-tenant
  const chunks = await Chunk.aggregate<ChunkSearchResult>([
    {
      $vectorSearch: {
        index: "vector_index",
        path: "embedding",
        queryVector: queryEmbedding,
        numCandidates: limit * 20, // Buscar más candidatos para mejor precisión
        limit: limit,
        filter: { companyId: new Types.ObjectId(companyId) },
      },
    },
    {
      $project: {
        _id: 1,
        text: 1,
        documentId: 1,
        score: { $meta: "vectorSearchScore" },
      },
    },
  ]);

  return chunks;
}
