import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { connectDB } from "@/lib/db";
import { Document, DocumentVersion } from "@/models";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    if (!session.companyId) {
      return NextResponse.json(
        { error: "No tiene empresa asignada" },
        { status: 403 }
      );
    }

    await connectDB();

    const documents = await Document.find({ companyId: session.companyId })
      .sort({ createdAt: -1 })
      .lean();

    const docsWithStatus = await Promise.all(
      documents.map(async (doc) => {
        let estado: string = "sin_version";
        if (doc.activeVersionId) {
          const version = await DocumentVersion.findById(
            doc.activeVersionId
          ).lean();
          estado = version?.estado ?? "sin_version";
        } else {
          const latestVersion = await DocumentVersion.findOne({
            documentId: doc._id,
          })
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

    return NextResponse.json(docsWithStatus);
  } catch {
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
