"use server";

import { connectDB } from "@/lib/db";
import { Document, DocumentVersion, Chunk } from "@/models";
import { getSession } from "@/lib/session";
import {
  reprocessDocument,
  reprocessAllDocuments,
} from "@/lib/document-processor";

export async function deleteDocument(documentId: string) {
  const session = await getSession();
  if (!session || !session.companyId) {
    throw new Error("No autorizado");
  }

  await connectDB();

  const doc = await Document.findOne({
    _id: documentId,
    companyId: session.companyId,
  });

  if (!doc) {
    throw new Error("Documento no encontrado");
  }

  await Promise.all([
    Chunk.deleteMany({ documentId }),
    DocumentVersion.deleteMany({ documentId }),
    Document.findByIdAndDelete(documentId),
  ]);

  return { success: true };
}

export async function reprocessSingleDocument(documentId: string) {
  const session = await getSession();
  if (!session || !session.companyId) {
    throw new Error("No autorizado");
  }

  // Solo gestores y admins pueden reprocesar
  if (session.role === "usuario") {
    throw new Error("No autorizado");
  }

  const result = await reprocessDocument(
    documentId,
    session.companyId,
    session.userId
  );

  return {
    success: true,
    oldChunksCount: result.oldChunksCount,
    newChunksCount: result.newChunksCount,
  };
}

export async function reprocessCompanyDocuments() {
  const session = await getSession();
  if (!session || !session.companyId) {
    throw new Error("No autorizado");
  }

  // Solo gestores y admins pueden reprocesar
  if (session.role === "usuario") {
    throw new Error("No autorizado");
  }

  const result = await reprocessAllDocuments(
    session.companyId,
    session.userId
  );

  return {
    success: true,
    processed: result.processed,
    failed: result.failed,
  };
}
