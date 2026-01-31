import { connectDB } from "./db";
import { Document, DocumentVersion, Chunk, Company } from "@/models";
import { extractText } from "./extraction";
import { chunkText } from "./chunking";
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
    // Chunk text
    const chunks = chunkText(text);

    // Generate embeddings
    const embeddings = await generateEmbeddings(
      chunks,
      embeddingModel,
      userId,
      companyId,
      { documentId: doc._id.toString(), versionId: version._id.toString() }
    );

    // Store chunks
    const chunkDocs = chunks.map((chunkText, i) => ({
      documentVersionId: version._id,
      documentId: doc._id,
      companyId,
      text: chunkText,
      embedding: embeddings[i],
      embeddingModel,
    }));

    await Chunk.insertMany(chunkDocs);

    // Update version status and document active version
    await DocumentVersion.findByIdAndUpdate(version._id, { estado: "activo" });
    await Document.findByIdAndUpdate(doc._id, { activeVersionId: version._id });

    return {
      documentId: doc._id.toString(),
      versionId: version._id.toString(),
      chunksCount: chunks.length,
    };
  } catch (error) {
    await DocumentVersion.findByIdAndUpdate(version._id, { estado: "error" });
    throw error;
  }
}
