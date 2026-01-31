import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { connectDB } from "@/lib/db";
import { Document, DocumentVersion } from "@/models";
import { DocumentsClient } from "@/components/documents/documents-client";

export default async function DocumentosPage() {
  const session = await getSession();

  if (!session || !session.companyId) {
    redirect("/login");
  }

  await connectDB();

  const documents = await Document.find({ companyId: session.companyId })
    .sort({ createdAt: -1 })
    .lean();

  const docsWithStatus = await Promise.all(
    documents.map(async (doc) => {
      let estado = "sin_version";
      if (doc.activeVersionId) {
        const version = await DocumentVersion.findById(doc.activeVersionId).lean();
        estado = version?.estado ?? "sin_version";
      } else {
        const latestVersion = await DocumentVersion.findOne({ documentId: doc._id })
          .sort({ createdAt: -1 })
          .lean();
        estado = latestVersion?.estado ?? "sin_version";
      }

      return {
        _id: doc._id.toString(),
        nombre: doc.nombre,
        estado,
        createdAt: doc.createdAt.toISOString(),
      };
    })
  );

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Documentos</h1>
      <DocumentsClient initialDocuments={docsWithStatus} />
    </div>
  );
}
