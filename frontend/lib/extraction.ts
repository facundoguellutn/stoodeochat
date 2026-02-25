import { extractText as extractPdfText } from "unpdf";
import mammoth from "mammoth";
import { extractWithUnstructured } from "./unstructured";

type LineType = "header-caps" | "header-title" | "header-marker" | "content" | "empty";

/**
 * Determina si una línea es un header ALL CAPS.
 */
function isAllCapsHeader(trimmed: string): boolean {
  return (
    trimmed.length < 60 &&
    trimmed.length > 2 &&
    trimmed === trimmed.toUpperCase() &&
    /[A-ZÁÉÍÓÚÑ]/.test(trimmed) &&
    !/[.!?]$/.test(trimmed) &&
    !/^\d+[.\-)]/.test(trimmed)
  );
}

/**
 * Determina si una línea es un header con marcador especial (***texto, ---texto).
 */
function isMarkerHeader(trimmed: string): boolean {
  if (!/^(\*{2,3}|_{2,3}|-{2,3})\s*\S/.test(trimmed)) return false;
  const headerText = trimmed
    .replace(/^(\*{2,3}|_{2,3}|-{2,3})\s*/, "")
    .replace(/(\*{2,3}|_{2,3}|-{2,3})\s*$/, "");
  return headerText.length > 0 && headerText.length < 80;
}

/**
 * Extrae el texto limpio de un header con marcador.
 */
function extractMarkerHeaderText(trimmed: string): string {
  return trimmed
    .replace(/^(\*{2,3}|_{2,3}|-{2,3})\s*/, "")
    .replace(/(\*{2,3}|_{2,3}|-{2,3})\s*$/, "");
}

/**
 * Determina si una línea es un header Title Case.
 */
function isTitleCaseHeader(trimmed: string, prevLineTrimmed: string): boolean {
  return (
    trimmed.length < 80 &&
    trimmed.length > 2 &&
    prevLineTrimmed === "" &&
    isTitleCase(trimmed) &&
    !/[.,:;]$/.test(trimmed) &&
    !/^\d+[.\-)]/.test(trimmed) &&
    !looksLikeSentence(trimmed)
  );
}

/**
 * Heurística para inferir estructura markdown a partir de texto plano.
 * Usa un enfoque de dos pasadas:
 *   Pasada 1: Identifica tipo de cada línea (header-caps, header-title, etc.)
 *   Pasada 2: Asigna niveles basándose en contexto (headers consecutivos
 *             reciben profundidad creciente para preservar jerarquía)
 */
export function inferMarkdownFromPlainText(text: string): string {
  // Si el texto ya tiene headers markdown, retornar sin cambios
  if (/^#{1,6}\s+.+$/m.test(text)) {
    return text;
  }

  const lines = text.split("\n");

  // Pasada 1: clasificar cada línea
  const lineTypes: LineType[] = [];
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();

    if (!trimmed) {
      lineTypes.push("empty");
    } else if (isMarkerHeader(trimmed)) {
      lineTypes.push("header-marker");
    } else if (isAllCapsHeader(trimmed)) {
      lineTypes.push("header-caps");
    } else {
      const prevTrimmed = i > 0 ? lines[i - 1]?.trim() ?? "" : "";
      if (isTitleCaseHeader(trimmed, prevTrimmed)) {
        lineTypes.push("header-title");
      } else {
        lineTypes.push("content");
      }
    }
  }

  // Pasada 2: asignar niveles con profundidad creciente para headers consecutivos
  // Headers consecutivos (sin contenido entre ellos) forman una jerarquía:
  //   SAN CRISTÓBAL          → # (depth 1, primer header después de contenido)
  //   RENOVACIÓN: TRIMESTRAL → ## (depth 2, consecutivo)
  //   COTIZACIÓN FLOTAS      → ### (depth 3, consecutivo)
  // Esto hace que el chunking genere breadcrumbs como:
  //   [SAN CRISTÓBAL > RENOVACIÓN: TRIMESTRAL > COTIZACIÓN FLOTAS]
  let lastNonEmptyType: "header" | "content" = "content";
  let headerDepth = 0;
  const result: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const type = lineTypes[i];
    const trimmed = lines[i].trim();

    if (type === "empty") {
      result.push("");
      continue;
    }

    if (type === "content") {
      result.push(lines[i]);
      lastNonEmptyType = "content";
      headerDepth = 0;
      continue;
    }

    // Es un header - asignar nivel según profundidad consecutiva
    if (lastNonEmptyType === "content") {
      headerDepth = 1; // Primer header después de contenido
    } else {
      headerDepth++; // Header consecutivo, nivel más profundo
    }

    const level = Math.min(headerDepth, 4);
    const hashes = "#".repeat(level);

    let headerText = trimmed;
    if (type === "header-marker") {
      headerText = extractMarkerHeaderText(trimmed);
    }

    result.push(`${hashes} ${headerText}`);
    lastNonEmptyType = "header";
  }

  return result.join("\n");
}

/**
 * Verifica si un texto parece Title Case (primera letra de palabras principales en mayúscula).
 * Ignora artículos, preposiciones y conjunciones cortas.
 */
function isTitleCase(text: string): boolean {
  const words = text.split(/\s+/);
  if (words.length === 0) return false;

  const minorWords = new Set([
    "de", "del", "la", "las", "los", "el", "en", "a", "y", "e", "o", "u",
    "con", "por", "para", "sin", "al", "the", "of", "and", "or", "in", "to",
    "for", "a", "an", "is", "at", "on",
  ]);

  // La primera palabra debe empezar con mayúscula
  if (!/^[A-ZÁÉÍÓÚÑ]/.test(words[0])) return false;

  let capitalizedCount = 0;
  for (const word of words) {
    if (minorWords.has(word.toLowerCase())) continue;
    if (/^[A-ZÁÉÍÓÚÑ]/.test(word)) capitalizedCount++;
  }

  // Al menos 50% de las palabras principales deben estar capitalizadas
  const mainWords = words.filter(w => !minorWords.has(w.toLowerCase()));
  return mainWords.length > 0 && capitalizedCount / mainWords.length >= 0.5;
}

/**
 * Detecta si una línea parece ser una oración normal (no un encabezado).
 */
function looksLikeSentence(text: string): boolean {
  // Oraciones largas con verbos comunes o muchas palabras
  const words = text.split(/\s+/);
  if (words.length > 10) return true;
  // Si tiene puntuación final de oración
  if (/[.!?]$/.test(text)) return true;
  return false;
}

/**
 * Convierte HTML simple (como el output de mammoth) a texto con headers markdown.
 * No es un parser HTML completo, solo maneja los tags que mammoth produce.
 */
function htmlToMarkdown(html: string): string {
  let text = html;

  // Convertir headings a markdown
  for (let i = 1; i <= 6; i++) {
    const hashes = "#".repeat(i);
    text = text.replace(
      new RegExp(`<h${i}[^>]*>(.*?)<\\/h${i}>`, "gi"),
      `\n${hashes} $1\n`
    );
  }

  // Convertir párrafos a texto con salto de línea
  text = text.replace(/<p[^>]*>(.*?)<\/p>/gi, "$1\n");

  // Convertir bold/strong
  text = text.replace(/<(strong|b)[^>]*>(.*?)<\/\1>/gi, "**$2**");

  // Convertir italic/em
  text = text.replace(/<(em|i)[^>]*>(.*?)<\/\1>/gi, "*$2*");

  // Convertir listas
  text = text.replace(/<li[^>]*>(.*?)<\/li>/gi, "- $1\n");
  text = text.replace(/<\/?[uo]l[^>]*>/gi, "\n");

  // Convertir line breaks
  text = text.replace(/<br\s*\/?>/gi, "\n");

  // Eliminar tags HTML restantes
  text = text.replace(/<[^>]+>/g, "");

  // Decodificar entidades HTML comunes
  text = text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");

  // Limpiar líneas vacías múltiples
  text = text.replace(/\n{3,}/g, "\n\n");

  return text.trim();
}

export async function extractText(
  buffer: Buffer,
  mimeType: string
): Promise<string> {
  switch (mimeType) {
    case "text/plain":
      return inferMarkdownFromPlainText(buffer.toString("utf-8"));

    case "text/markdown":
      return buffer.toString("utf-8");

    case "application/pdf": {
      try {
        return await extractWithUnstructured(buffer, "document.pdf");
      } catch (error) {
        console.warn("Unstructured API falló, usando fallback unpdf:", error);
        const { text } = await extractPdfText(new Uint8Array(buffer));
        const plainText = Array.isArray(text) ? text.join("\n") : text;
        return inferMarkdownFromPlainText(plainText);
      }
    }

    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
      const result = await mammoth.convertToHtml({ buffer });
      return htmlToMarkdown(result.value);
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
