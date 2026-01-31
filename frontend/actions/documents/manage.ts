"use server";

import { connectDB } from "@/lib/db";
import { Document, DocumentVersion, Chunk } from "@/models";
import { getSession } from "@/lib/session";

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
