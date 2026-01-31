import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getMimeType, ALLOWED_EXTENSIONS, MAX_FILE_SIZE } from "@/lib/extraction";
import { processDocument } from "@/lib/document-processor";

export async function POST(request: Request) {
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

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No se envió archivo" },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "El archivo excede el límite de 10MB" },
        { status: 400 }
      );
    }

    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!ext || !ALLOWED_EXTENSIONS.includes(ext)) {
      return NextResponse.json(
        { error: `Tipo de archivo no permitido. Permitidos: ${ALLOWED_EXTENSIONS.join(", ")}` },
        { status: 400 }
      );
    }

    const mimeType = getMimeType(file.name);
    if (!mimeType) {
      return NextResponse.json(
        { error: "Tipo de archivo no reconocido" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const result = await processDocument({
      file: buffer,
      filename: file.name,
      mimeType,
      companyId: session.companyId,
      userId: session.userId,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error al procesar documento";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
