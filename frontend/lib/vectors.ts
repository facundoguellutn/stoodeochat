import { getOpenAIClient } from "./openai";
import { logUsage } from "./costs";
import { connectDB } from "./db";
import { Chunk, Document, DocumentVersion } from "@/models";
import type { EmbeddingModel } from "openai/resources/embeddings";
import { Types } from "mongoose";

const MAX_BATCH_SIZE = 2048;
const MAX_QUERY_TERMS = 8;
const VECTOR_CANDIDATE_MULTIPLIER = 4;
const KEYWORD_FALLBACK_LIMIT = 16;

// Score mínimo de relevancia para incluir un chunk (0-1)
// Nota: Usamos un umbral más flexible y luego rerankeamos para recuperar
// casos donde el título y el detalle están separados por varios párrafos.
const MIN_RELEVANCE_SCORE = 0.25;

const STOP_WORDS = new Set([
  "de", "del", "la", "las", "los", "el", "en", "a", "y", "e", "o", "u", "por",
  "para", "con", "sin", "que", "como", "cuál", "cual", "cómo", "donde", "dónde",
  "qué", "es", "un", "una", "unos", "unas", "me", "che", "esto", "esa", "ese",
  "podes", "podés", "decir", "contar", "favor", "porfa", "sobre", "sus", "las",
]);

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function extractQueryTerms(query: string): string[] {
  const normalized = normalizeText(query);
  const terms = normalized
    .split(/[^a-z0-9]+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 4 && !STOP_WORDS.has(t));
  return Array.from(new Set(terms)).slice(0, MAX_QUERY_TERMS);
}

function cleanQueryForRanking(query: string): string {
  return query
    .replace(/[¿?¡!.,;:()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hasNumericSignal(text: string): boolean {
  return /(\$|\d{1,3}(?:[.,]\d{3})+|\d+(?:[.,]\d+)?\s*%|\b\d+\b)/.test(text);
}

function needsNumericCoverage(query: string): boolean {
  const normalized = normalizeText(query);
  return /(franquicia|franquicias|monto|montos|precio|precios|cuanto|cuanto|porcentaje|porcentajes|importe|importes)/.test(
    normalized
  );
}

function isFranquiciaIntent(query: string): boolean {
  return /franquicia/.test(normalizeText(query));
}

function chunkContainsTerm(chunk: EnrichedChunkSearchResult, term: string): boolean {
  const haystack = normalizeText(`${chunk.sectionPath ?? ""}\n${chunk.text}`);
  return haystack.includes(normalizeText(term));
}

function chunkMatchesAnyTerm(chunk: EnrichedChunkSearchResult, terms: string[]): boolean {
  return terms.some((term) => chunkContainsTerm(chunk, term));
}

function getSectionRoot(sectionPath?: string): string {
  if (!sectionPath) return "";
  const cleaned = sectionPath.replace(/^\[/, "").replace(/\]$/, "").trim();
  if (!cleaned) return "";
  const [root] = cleaned.split(">").map((p) => normalizeText(p.trim()));
  return root ?? "";
}

function isNeighborCompatible(anchor: EnrichedChunkSearchResult, candidate: EnrichedChunkSearchResult): boolean {
  if (
    typeof anchor.sectionIndex === "number" &&
    typeof candidate.sectionIndex === "number"
  ) {
    return anchor.sectionIndex === candidate.sectionIndex;
  }

  const anchorRoot = getSectionRoot(anchor.sectionPath);
  const candidateRoot = getSectionRoot(candidate.sectionPath);
  if (anchorRoot && candidateRoot) {
    return anchorRoot === candidateRoot;
  }

  return true;
}

async function resolvePreferredDocumentIds(params: {
  companyId: string;
  query: string;
}): Promise<string[]> {
  const { companyId, query } = params;
  const terms = extractQueryTerms(cleanQueryForRanking(query)).filter((t) => t.length >= 5);
  if (terms.length === 0) return [];

  const docs = await Document.find({ companyId })
    .select("_id nombre createdAt")
    .sort({ createdAt: -1 })
    .limit(40)
    .lean();

  const scored = docs
    .map((doc) => {
      const normalizedName = normalizeText(doc.nombre ?? "");
      const hits = terms.reduce((acc, term) => (normalizedName.includes(term) ? acc + 1 : acc), 0);
      return {
        id: doc._id.toString(),
        hits,
      };
    })
    .filter((d) => d.hits > 0)
    .sort((a, b) => b.hits - a.hits)
    .slice(0, 3);

  return scored.map((d) => d.id);
}

export interface ChunkSearchResult {
  _id: Types.ObjectId;
  text: string;
  documentId: Types.ObjectId;
  documentVersionId: Types.ObjectId;
  companyId: Types.ObjectId;
  sectionPath?: string;
  sectionIndex?: number;
  chunkIndex?: number;
  score: number;
}

// Resultado enriquecido con metadata del documento
export interface EnrichedChunkSearchResult extends ChunkSearchResult {
  documentName: string;
  retrievalSource?: "vector" | "keyword" | "neighbor";
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

function lexicalBoost(params: { queryTerms: string[]; text: string; sectionPath?: string; documentName?: string }): number {
  const { queryTerms, text, sectionPath, documentName } = params;
  if (queryTerms.length === 0) return 0;

  const normalizedText = normalizeText(text);
  const normalizedSection = normalizeText(sectionPath ?? "");
  const normalizedDoc = normalizeText(documentName ?? "");

  let matches = 0;
  let sectionMatches = 0;
  let docMatches = 0;

  for (const term of queryTerms) {
    if (normalizedText.includes(term)) matches++;
    if (normalizedSection.includes(term)) sectionMatches++;
    if (normalizedDoc.includes(term)) docMatches++;
  }

  const textScore = matches / queryTerms.length;
  const sectionScore = sectionMatches / queryTerms.length;
  const docScore = docMatches / queryTerms.length;

  return textScore * 0.2 + sectionScore * 0.45 + docScore * 0.35;
}

function keywordSignal(params: { queryTerms: string[]; text: string; sectionPath?: string; documentName?: string }) {
  const { queryTerms, text, sectionPath, documentName } = params;
  const normalizedText = normalizeText(text);
  const normalizedSection = normalizeText(sectionPath ?? "");
  const normalizedDoc = normalizeText(documentName ?? "");

  let textMatches = 0;
  let sectionMatches = 0;
  let docMatches = 0;

  for (const term of queryTerms) {
    if (normalizedText.includes(term)) textMatches++;
    if (normalizedSection.includes(term)) sectionMatches++;
    if (normalizedDoc.includes(term)) docMatches++;
  }

  return {
    textMatches,
    sectionMatches,
    docMatches,
    totalTerms: Math.max(1, queryTerms.length),
  };
}

async function searchKeywordChunks(params: {
  query: string;
  companyId: string;
  limit: number;
}): Promise<EnrichedChunkSearchResult[]> {
  const { query, companyId, limit } = params;
  const queryTerms = extractQueryTerms(query);
  if (queryTerms.length === 0) return [];

  const regexes = queryTerms.map((term) => new RegExp(escapeRegExp(term), "i"));

  const chunks = await Chunk.aggregate<EnrichedChunkSearchResult>([
    {
      $match: {
        companyId: new Types.ObjectId(companyId),
        $or: [
          { text: { $in: regexes } },
          { sectionPath: { $in: regexes } },
        ],
      },
    },
    {
      $lookup: {
        from: "documents",
        localField: "documentId",
        foreignField: "_id",
        as: "document",
      },
    },
    {
      $unwind: {
        path: "$document",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $project: {
        _id: 1,
        text: 1,
        documentId: 1,
        documentVersionId: 1,
        companyId: 1,
        sectionPath: 1,
        sectionIndex: 1,
        chunkIndex: 1,
        documentName: { $ifNull: ["$document.nombre", "Documento sin nombre"] },
      },
    },
    { $limit: limit * 3 },
  ]);

  return chunks
    .map((chunk) => {
      const score = lexicalBoost({
        queryTerms,
        text: chunk.text,
        sectionPath: chunk.sectionPath,
        documentName: chunk.documentName,
      });
      const signal = keywordSignal({
        queryTerms,
        text: chunk.text,
        sectionPath: chunk.sectionPath,
        documentName: chunk.documentName,
      });
      const strongMatch =
        signal.sectionMatches > 0 || signal.textMatches >= Math.min(2, signal.totalTerms);
      return {
        ...chunk,
        score: strongMatch ? Math.max(0.68, 0.3 + Math.min(0.65, score)) : 0.3 + Math.min(0.55, score),
        retrievalSource: "keyword" as const,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

function rerankByQuery(
  chunks: EnrichedChunkSearchResult[],
  query: string,
  preferredDocumentIds: Set<string>
): EnrichedChunkSearchResult[] {
  const queryTerms = extractQueryTerms(cleanQueryForRanking(query));
  if (queryTerms.length === 0) return chunks.sort((a, b) => b.score - a.score);

  return chunks
    .map((chunk) => {
      const boost = lexicalBoost({
        queryTerms,
        text: chunk.text,
        sectionPath: chunk.sectionPath,
        documentName: chunk.documentName,
      });
      const signal = keywordSignal({
        queryTerms,
        text: chunk.text,
        sectionPath: chunk.sectionPath,
        documentName: chunk.documentName,
      });
      const strongMatch = signal.sectionMatches > 0 || signal.textMatches >= Math.min(2, signal.totalTerms);
      const keywordBonus = strongMatch ? 0.18 : 0;
      const docBonus = preferredDocumentIds.has(chunk.documentId.toString()) ? 0.12 : 0;
      const rerankedScore = Math.min(1, chunk.score * 0.55 + boost * 0.45 + keywordBonus + docBonus);
      return { ...chunk, score: rerankedScore };
    })
    .sort((a, b) => b.score - a.score);
}

function mergeUniqueChunks(chunks: EnrichedChunkSearchResult[]): EnrichedChunkSearchResult[] {
  const byId = new Map<string, EnrichedChunkSearchResult>();

  for (const chunk of chunks) {
    const key = chunk._id.toString();
    const current = byId.get(key);
    if (!current || chunk.score > current.score) {
      byId.set(key, chunk);
    }
  }

  return Array.from(byId.values());
}

function buildSnippetAroundMatch(text: string, term: string, radius = 260): string {
  const normalizedText = normalizeText(text);
  const normalizedTerm = normalizeText(term);
  const index = normalizedText.indexOf(normalizedTerm);
  if (index < 0) return text.slice(0, radius * 2).trim();

  const start = Math.max(0, index - radius);
  const end = Math.min(text.length, index + term.length + radius);
  const prefix = start > 0 ? "..." : "";
  const suffix = end < text.length ? "..." : "";
  return `${prefix}${text.slice(start, end).trim()}${suffix}`;
}

/**
 * Busca chunks similares usando MongoDB Atlas Vector Search
 * Requiere índice vectorial creado en Atlas con nombre "vector_index"
 * 
 * Devuelve chunks enriquecidos con metadata del documento y filtrados por relevancia
 */
export async function searchSimilarChunks(params: {
  query: string;
  companyId: string;
  userId: string;
  limit?: number;
  embeddingModel?: string;
  minScore?: number;
}): Promise<EnrichedChunkSearchResult[]> {
  const {
    query,
    companyId,
    userId,
    limit = 5,
    embeddingModel = "text-embedding-3-small",
    minScore = MIN_RELEVANCE_SCORE,
  } = params;
  const startedAt = Date.now();
  const diagnosticsEnabled = process.env.RAG_DIAGNOSTICS === "1";

  await connectDB();

  // Generar embedding de la query
  const [queryEmbedding] = await generateEmbeddings(
    [query],
    embeddingModel,
    userId,
    companyId,
    { action: "vector_search", query }
  );

  // Vector search con filtro multi-tenant y lookup del documento
  try {
    const preferredDocumentIdsArray = await resolvePreferredDocumentIds({ companyId, query });
    const preferredDocumentIds = new Set(preferredDocumentIdsArray);
    const candidateLimit = Math.max(limit * VECTOR_CANDIDATE_MULTIPLIER, limit);
    const vectorChunks = await Chunk.aggregate<EnrichedChunkSearchResult>([
      {
        $vectorSearch: {
          index: "vector_index",
          path: "embedding",
          queryVector: queryEmbedding,
          numCandidates: candidateLimit * 25, // Buscar más candidatos para mejor recall
          limit: candidateLimit,
          filter: { companyId: new Types.ObjectId(companyId) },
        },
      },
      {
        $addFields: {
          score: { $meta: "vectorSearchScore" },
        },
      },
      // Filtrar por score mínimo de relevancia
      {
        $match: {
          score: { $gte: minScore },
        },
      },
      // Lookup para obtener el nombre del documento
      {
        $lookup: {
          from: "documents",
          localField: "documentId",
          foreignField: "_id",
          as: "document",
        },
      },
      {
        $unwind: {
          path: "$document",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          _id: 1,
          text: 1,
          documentId: 1,
          documentVersionId: 1,
          companyId: 1,
          sectionPath: 1,
          sectionIndex: 1,
          chunkIndex: 1,
          score: 1,
          documentName: { $ifNull: ["$document.nombre", "Documento sin nombre"] },
        },
      },
    ]);

    const vectorAnnotated = vectorChunks.map((chunk) => ({
      ...chunk,
      retrievalSource: "vector" as const,
    }));

    // Fallback híbrido (lexical): útil para nombres propios/títulos exactos.
    const keywordChunks = await searchKeywordChunks({
      query,
      companyId,
      limit: Math.max(limit, KEYWORD_FALLBACK_LIMIT),
    });

    const merged = mergeUniqueChunks([...vectorAnnotated, ...keywordChunks]);
    const reranked = rerankByQuery(merged, query, preferredDocumentIds);
    const finalChunks = reranked.slice(0, limit);

    if (diagnosticsEnabled) {
      console.info(
        "[rag-diagnostics] retrieval",
        JSON.stringify({
          query: query.slice(0, 120),
          model: embeddingModel,
          vectorCandidates: vectorAnnotated.length,
          keywordCandidates: keywordChunks.length,
          preferredDocumentIds: preferredDocumentIdsArray,
          finalCount: finalChunks.length,
          minScore,
          elapsedMs: Date.now() - startedAt,
          topScores: finalChunks.slice(0, 5).map((c) => Number(c.score.toFixed(3))),
          topSections: finalChunks.slice(0, 3).map((c) => c.sectionPath ?? "sin-seccion"),
          topDocs: finalChunks.slice(0, 5).map((c) => ({
            documentId: c.documentId.toString(),
            documentName: c.documentName,
            source: c.retrievalSource ?? "vector",
            hasNumericSignal: hasNumericSignal(c.text),
          })),
        })
      );
    }

    if (finalChunks.length === 0) {
      const totalChunks = await Chunk.countDocuments({ companyId: new Types.ObjectId(companyId) });
      console.warn(
        `[vector-search] 0 chunks encontrados para companyId=${companyId}, ` +
        `query="${query.slice(0, 80)}...", model=${embeddingModel}, ` +
        `minScore=${minScore}, totalChunksEnDB=${totalChunks}`
      );
    }

    return finalChunks;
  } catch (error) {
    console.error("[vector-search] Error en aggregate:", error);
    return [];
  }
}

export async function expandChunksWithNeighbors(params: {
  chunks: EnrichedChunkSearchResult[];
  companyId: string;
  window?: number;
  maxExpandedChunks?: number;
}): Promise<EnrichedChunkSearchResult[]> {
  const { chunks, companyId, window = 1, maxExpandedChunks = 14 } = params;
  if (chunks.length === 0) return [];

  await connectDB();

  const expanded = new Map<string, EnrichedChunkSearchResult>();
  const anchorsByVersion = new Map<string, EnrichedChunkSearchResult[]>();

  for (const chunk of chunks) {
    expanded.set(chunk._id.toString(), chunk);
    const versionKey = chunk.documentVersionId.toString();
    const versionChunks = anchorsByVersion.get(versionKey) ?? [];
    versionChunks.push(chunk);
    anchorsByVersion.set(versionKey, versionChunks);
  }

  const anchors = chunks.filter((c) => typeof c.chunkIndex === "number");
  const neighborGroups = await Promise.all(
    anchors.map(async (anchor) => {
      const minChunkIndex = (anchor.chunkIndex ?? 0) - window;
      const maxChunkIndex = (anchor.chunkIndex ?? 0) + window;
      const match: Record<string, unknown> = {
        companyId: new Types.ObjectId(companyId),
        documentVersionId: anchor.documentVersionId,
        chunkIndex: { $gte: minChunkIndex, $lte: maxChunkIndex },
      };
      if (typeof anchor.sectionIndex === "number") {
        match.sectionIndex = anchor.sectionIndex;
      }

      return Chunk.aggregate<EnrichedChunkSearchResult>([
        {
          $match: match,
        },
        {
          $lookup: {
            from: "documents",
            localField: "documentId",
            foreignField: "_id",
            as: "document",
          },
        },
        {
          $unwind: {
            path: "$document",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $project: {
            _id: 1,
            text: 1,
            documentId: 1,
            documentVersionId: 1,
            companyId: 1,
            sectionPath: 1,
            sectionIndex: 1,
            chunkIndex: 1,
            score: { $literal: anchor.score },
            documentName: { $ifNull: ["$document.nombre", "Documento sin nombre"] },
          },
        },
      ]);
    })
  );

  for (const group of neighborGroups) {
    for (const candidate of group) {
      const key = candidate._id.toString();
      const current = expanded.get(key);

      const anchorsForVersion =
        anchorsByVersion.get(candidate.documentVersionId.toString()) ?? [];
      let bestAnchorScore = candidate.score;
      let bestDistance = Number.MAX_SAFE_INTEGER;

      for (const anchor of anchorsForVersion) {
        if (!isNeighborCompatible(anchor, candidate)) continue;
        if (
          typeof anchor.chunkIndex === "number" &&
          typeof candidate.chunkIndex === "number"
        ) {
          const distance = Math.abs(anchor.chunkIndex - candidate.chunkIndex);
          if (distance < bestDistance) {
            bestDistance = distance;
            bestAnchorScore = anchor.score;
          }
        }
      }

      const neighborScore = Math.max(0.05, bestAnchorScore - bestDistance * 0.04);
      const enrichedCandidate: EnrichedChunkSearchResult = {
        ...candidate,
        score: neighborScore,
        retrievalSource: current ? current.retrievalSource : "neighbor",
      };

      if (!current || enrichedCandidate.score > current.score) {
        expanded.set(key, enrichedCandidate);
      }
    }
  }

  return Array.from(expanded.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, maxExpandedChunks);
}

export async function expandChunksWithDocumentTextFallback(params: {
  chunks: EnrichedChunkSearchResult[];
  query: string;
  companyId: string;
  maxAddedChunks?: number;
}): Promise<EnrichedChunkSearchResult[]> {
  const { chunks, query, companyId, maxAddedChunks = 3 } = params;
  const diagnosticsEnabled = process.env.RAG_DIAGNOSTICS === "1";
  const queryTerms = extractQueryTerms(cleanQueryForRanking(query));
  if (queryTerms.length === 0) return chunks;

  const joinedChunks = normalizeText(
    chunks.map((c) => `${c.sectionPath ?? ""}\n${c.text}`).join("\n")
  );
  const missingTerms = queryTerms.filter((term) => !joinedChunks.includes(term));
  const requiresNumericCoverage = needsNumericCoverage(query);
  const franquiciaIntent = isFranquiciaIntent(query);
  const franquiciaTerms = queryTerms.filter((t) => t.includes("franquic"));
  const topicalTerms = franquiciaTerms.length > 0 ? franquiciaTerms : queryTerms;
  const topicalChunks = chunks.filter((c) => chunkMatchesAnyTerm(c, topicalTerms));
  const hasNumericInTopicalChunks = topicalChunks.some((c) => hasNumericSignal(c.text));
  const shouldFallbackByCoverage = requiresNumericCoverage && !hasNumericInTopicalChunks;
  const forceFranquiciaFallback =
    franquiciaIntent &&
    !chunks.some((c) => chunkContainsTerm(c, "franquicia") && hasNumericSignal(c.text));
  const forceFallback = shouldFallbackByCoverage || forceFranquiciaFallback;
  if (missingTerms.length === 0 && !forceFallback) return chunks;

  const preferredDocumentIds = Array.from(new Set(chunks.map((c) => c.documentId.toString())));
  const matchByCompany: Record<string, unknown> = {
    companyId: new Types.ObjectId(companyId),
    estado: "activo",
  };
  if (preferredDocumentIds.length > 0) {
    matchByCompany.documentId = { $in: preferredDocumentIds.map((id) => new Types.ObjectId(id)) };
  }

  const activeVersions = await DocumentVersion.aggregate<{
    _id: Types.ObjectId;
    documentId: Types.ObjectId;
    companyId: Types.ObjectId;
    texto: string;
    documentName: string;
  }>([
    { $match: matchByCompany },
    {
      $lookup: {
        from: "documents",
        localField: "documentId",
        foreignField: "_id",
        as: "document",
      },
    },
    {
      $unwind: {
        path: "$document",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $project: {
        _id: 1,
        documentId: 1,
        companyId: 1,
        texto: 1,
        documentName: { $ifNull: ["$document.nombre", "Documento sin nombre"] },
      },
    },
    { $limit: Math.max(6, preferredDocumentIds.length * 2) },
  ]);

  const synthetic: EnrichedChunkSearchResult[] = [];
  const candidateTerms = missingTerms.length > 0 ? missingTerms : topicalTerms;
  for (const version of activeVersions) {
    const normalizedText = normalizeText(version.texto || "");
    if (!normalizedText) continue;

    let bestTerm = "";
    let bestMatches = 0;
    for (const term of candidateTerms) {
      if (normalizedText.includes(term)) {
        bestTerm = term;
        bestMatches++;
      }
    }

    if (!bestTerm || bestMatches === 0) continue;
    const snippet = buildSnippetAroundMatch(version.texto, bestTerm);
    if (!snippet) continue;
    if (forceFallback && !hasNumericSignal(snippet)) continue;
    if (franquiciaIntent && !/franquicia/i.test(snippet)) continue;

    synthetic.push({
      _id: new Types.ObjectId(),
      text: snippet,
      documentId: version.documentId,
      documentVersionId: version._id,
      companyId: version.companyId,
      sectionPath: "[Fallback texto completo]",
      score: Math.min(0.9, 0.62 + bestMatches * 0.08),
      documentName: version.documentName,
      retrievalSource: "keyword",
    });
  }

  if (synthetic.length === 0) return chunks;
  if (diagnosticsEnabled) {
    console.info(
      "[rag-diagnostics] fallback-text",
      JSON.stringify({
        query: query.slice(0, 120),
        missingTerms,
        requiresNumericCoverage,
        hasNumericInTopicalChunks,
        forceFranquiciaFallback,
        injectedChunks: synthetic.length,
        injectedDocs: synthetic.map((c) => ({
          documentId: c.documentId.toString(),
          documentName: c.documentName,
          score: Number(c.score.toFixed(3)),
        })),
      })
    );
  }
  const merged = mergeUniqueChunks([...chunks, ...synthetic.slice(0, maxAddedChunks)]);
  return merged.sort((a, b) => b.score - a.score);
}
