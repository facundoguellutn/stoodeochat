import { extractText as extractPdfText } from "unpdf";
import mammoth from "mammoth";

export async function extractText(
  buffer: Buffer,
  mimeType: string
): Promise<string> {
  switch (mimeType) {
    case "text/plain":
    case "text/markdown":
      return buffer.toString("utf-8");

    case "application/pdf": {
      const { text } = await extractPdfText(new Uint8Array(buffer));
      // unpdf devuelve un array de strings (una por página)
      return Array.isArray(text) ? text.join("\n") : text;
    }

    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    }

    default:
      throw new Error(`Tipo de archivo no soportado: ${mimeType}`);
  }
}

const MIME_TYPES: Record<string, string> = {
  txt: "text/plain",
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  md: "text/markdown",
};

export function getMimeType(filename: string): string | null {
  const ext = filename.split(".").pop()?.toLowerCase();
  return ext ? MIME_TYPES[ext] ?? null : null;
}

export const ALLOWED_EXTENSIONS = ["txt", "pdf", "docx", "md"];
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
