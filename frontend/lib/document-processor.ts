import { connectDB } from "./db";
import { Document, DocumentVersion, Chunk, Company } from "@/models";
import { extractText } from "./extraction";
import { inferMarkdownFromPlainText } from "./extraction";
import { chunkTextWithMetadata } from "./chunking";
import { generateEmbeddings } from "./vectors";

interface ProcessDocumentParams {
  file: Buffer;
  filename: string;
  mimeType: string;
  companyId: string;
  userId: string;
}

interface ProcessDocumentResult {
  documentId: string;
  versionId: string;
  chunksCount: number;
}

export async function processDocument(
  params: ProcessDocumentParams
): Promise<ProcessDocumentResult> {
  console.log("processing document");
  await connectDB();

  const { file, filename, mimeType, companyId, userId } = params;

  // Get company config for embedding model
  const company = await Company.findById(companyId).lean();
  if (!company) throw new Error("Empresa no encontrada");

  const embeddingModel = company.config.embeddingModel;

  // Extract text
  const text = await extractText(file, mimeType);
  if (!text.trim()) throw new Error("El documento no contiene texto");

  // Create document
  const doc = await Document.create({
    companyId,
    nombre: filename,
  });

  // Create version
  const version = await DocumentVersion.create({
    documentId: doc._id,
    companyId,
    texto: text,
    estado: "procesando",
    version: 1,
  });

  try {
    // Chunk text with section metadata
    const chunkResults = chunkTextWithMetadata(text);

    // Generate embeddings
    const chunkTexts = chunkResults.map(c => c.text);
    const embeddings = await generateEmbeddings(
      chunkTexts,
      embeddingModel,
      userId,
      companyId,
      { documentId: doc._id.toString(), versionId: version._id.toString() }
    );

    // Store chunks
    const chunkDocs = chunkResults.map((chunk, i) => ({
      documentVersionId: version._id,
      documentId: doc._id,
      companyId,
      text: chunk.text,
      embedding: embeddings[i],
      embeddingModel,
      ...(chunk.sectionPath && { sectionPath: chunk.sectionPath }),
      ...(typeof chunk.sectionIndex === "number" && { sectionIndex: chunk.sectionIndex }),
      ...(typeof chunk.chunkIndex === "number" && { chunkIndex: chunk.chunkIndex }),
    }));

    await Chunk.insertMany(chunkDocs);

    // Update version status and document active version
    try {
      await DocumentVersion.findByIdAndUpdate(version._id, { estado: "activo" });
      await Document.findByIdAndUpdate(doc._id, { activeVersionId: version._id });
    } catch (statusError) {
      // Rollback: eliminar chunks huérfanos si falla el update de estado
      await Chunk.deleteMany({ documentVersionId: version._id }).catch(() => {});
      await DocumentVersion.findByIdAndUpdate(version._id, { estado: "error" }).catch(() => {});
      throw statusError;
    }

    return {
      documentId: doc._id.toString(),
      versionId: version._id.toString(),
      chunksCount: chunkResults.length,
    };
  } catch (error) {
    console.error("Error al procesar documento:", error);
    await DocumentVersion.findByIdAndUpdate(version._id, { estado: "error" }).catch(() => {});
    throw error;
  }
}

interface ReprocessResult {
  documentId: string;
  versionId: string;
  oldChunksCount: number;
  newChunksCount: number;
}

/**
 * Reprocesa un documento existente: aplica la heurística de markdown al texto
 * almacenado, re-chunka con el nuevo algoritmo section-aware, y regenera embeddings.
 */
export async function reprocessDocument(
  documentId: string,
  companyId: string,
  userId: string
): Promise<ReprocessResult> {
  await connectDB();

  const company = await Company.findById(companyId).lean();
  if (!company) throw new Error("Empresa no encontrada");

  const embeddingModel = company.config.embeddingModel;

  const doc = await Document.findOne({ _id: documentId, companyId }).lean();
  if (!doc) throw new Error("Documento no encontrado");

  const version = await DocumentVersion.findOne({
    documentId,
    companyId,
    estado: "activo",
  }).lean();
  if (!version) throw new Error("Versión activa no encontrada");

  // Contar chunks viejos
  const oldChunksCount = await Chunk.countDocuments({
    documentVersionId: version._id,
  });

  // Aplicar inferencia de markdown al texto almacenado
  // inferMarkdownFromPlainText detecta si ya tiene headers y no los duplica
  const markdownText = inferMarkdownFromPlainText(version.texto);

  // Re-chunk con el nuevo algoritmo
  const chunkResults = chunkTextWithMetadata(markdownText);

  if (chunkResults.length === 0) {
    throw new Error("El reprocesamiento no generó chunks");
  }

  // Generar nuevos embeddings
  const chunkTexts = chunkResults.map((c) => c.text);
  const embeddings = await generateEmbeddings(
    chunkTexts,
    embeddingModel,
    userId,
    companyId,
    {
      documentId: doc._id.toString(),
      versionId: version._id.toString(),
      action: "reprocess",
    }
  );

  // Eliminar chunks viejos
  await Chunk.deleteMany({ documentVersionId: version._id });

  // Insertar nuevos chunks
  const chunkDocs = chunkResults.map((chunk, i) => ({
    documentVersionId: version._id,
    documentId: doc._id,
    companyId,
    text: chunk.text,
    embedding: embeddings[i],
    embeddingModel,
    ...(chunk.sectionPath && { sectionPath: chunk.sectionPath }),
    ...(typeof chunk.sectionIndex === "number" && { sectionIndex: chunk.sectionIndex }),
    ...(typeof chunk.chunkIndex === "number" && { chunkIndex: chunk.chunkIndex }),
  }));

  await Chunk.insertMany(chunkDocs);

  return {
    documentId: doc._id.toString(),
    versionId: version._id.toString(),
    oldChunksCount,
    newChunksCount: chunkResults.length,
  };
}

/**
 * Reprocesa todos los documentos activos de una empresa.
 */
export async function reprocessAllDocuments(
  companyId: string,
  userId: string
): Promise<{ processed: number; failed: number; results: ReprocessResult[] }> {
  await connectDB();

  const documents = await Document.find({ companyId }).lean();
  const results: ReprocessResult[] = [];
  let failed = 0;

  for (const doc of documents) {
    try {
      const result = await reprocessDocument(
        doc._id.toString(),
        companyId,
        userId
      );
      results.push(result);
    } catch (error) {
      console.error(
        `Error reprocesando documento ${doc._id}: ${doc.nombre}`,
        error
      );
      failed++;
    }
  }

  return { processed: results.length, failed, results };
}
