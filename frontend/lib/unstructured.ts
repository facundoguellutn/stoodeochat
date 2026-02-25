interface UnstructuredElementMetadata {
  page_number?: number;
  parent_id?: string;
  category_depth?: number;
  text_as_html?: string;
  filename?: string;
  filetype?: string;
  languages?: string[];
}

interface UnstructuredElement {
  type: string;
  text: string;
  element_id: string;
  metadata: UnstructuredElementMetadata;
}

function buildPdfFormData(buffer: Buffer, filename: string, strategy: string): FormData {
  const formData = new FormData();
  const uint8 = new Uint8Array(buffer);
  const blob = new Blob([uint8], { type: "application/pdf" });
  formData.append("files", blob, filename);
  formData.append("strategy", strategy);
  formData.append("split_pdf_page", "true");
  formData.append("split_pdf_concurrency_level", process.env.UNSTRUCTURED_SPLIT_CONCURRENCY ?? "6");
  return formData;
}

/**
 * Extrae texto estructurado de un PDF usando Unstructured API.
 * Retorna markdown con headers, tablas y listas correctamente formateados.
 */
export async function extractWithUnstructured(
  buffer: Buffer,
  filename: string
): Promise<string> {
  const apiKey = process.env.UNSTRUCTURED_API_KEY;
  const apiUrl =
    process.env.UNSTRUCTURED_API_URL ??
    "https://api.unstructuredapp.io/general/v0/general";
  const strategy = process.env.UNSTRUCTURED_STRATEGY ?? "auto";
  const timeoutMs = Number(process.env.UNSTRUCTURED_TIMEOUT_MS ?? "240000");
  const retries = Math.max(0, Number(process.env.UNSTRUCTURED_RETRIES ?? "1"));

  if (!apiKey) {
    throw new Error("UNSTRUCTURED_API_KEY no está configurada");
  }

  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "unstructured-api-key": apiKey,
        },
        body: buildPdfFormData(buffer, filename, strategy),
        signal: controller.signal as RequestInit["signal"],
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "unknown error");
        throw new Error(
          `Unstructured API error ${response.status}: ${errorText}`
        );
      }

      const elements: UnstructuredElement[] = await response.json();

      if (!Array.isArray(elements) || elements.length === 0) {
        throw new Error("Unstructured API retornó respuesta vacía");
      }

      return elementsToMarkdown(elements);
    } catch (error) {
      lastError = error;
      const isLastAttempt = attempt === retries;
      if (!isLastAttempt) {
        const waitMs = 800 * (attempt + 1);
        await new Promise((resolve) => setTimeout(resolve, waitMs));
        continue;
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("No se pudo extraer el PDF con Unstructured");
}

/**
 * Convierte HTML de tabla a markdown legible.
 * Extrae filas y celdas para generar una tabla markdown.
 */
function htmlTableToMarkdown(html: string): string {
  const rows: string[][] = [];
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch;

  while ((rowMatch = rowRegex.exec(html)) !== null) {
    const cells: string[] = [];
    const cellRegex = /<(?:td|th)[^>]*>([\s\S]*?)<\/(?:td|th)>/gi;
    let cellMatch;

    while ((cellMatch = cellRegex.exec(rowMatch[1])) !== null) {
      const cellText = cellMatch[1]
        .replace(/<[^>]+>/g, "")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, " ")
        .trim();
      cells.push(cellText);
    }

    if (cells.length > 0) {
      rows.push(cells);
    }
  }

  if (rows.length === 0) return "";

  // Normalizar columnas
  const maxCols = Math.max(...rows.map((r) => r.length));
  const normalized = rows.map((r) => {
    while (r.length < maxCols) r.push("");
    return r;
  });

  // Generar tabla markdown
  const lines: string[] = [];
  lines.push("| " + normalized[0].join(" | ") + " |");
  lines.push("| " + normalized[0].map(() => "---").join(" | ") + " |");
  for (let i = 1; i < normalized.length; i++) {
    lines.push("| " + normalized[i].join(" | ") + " |");
  }

  return lines.join("\n");
}

/**
 * Convierte un array de elementos de Unstructured API a markdown estructurado.
 */
function elementsToMarkdown(elements: UnstructuredElement[]): string {
  const parts: string[] = [];

  for (const el of elements) {
    const text = el.text?.trim();

    switch (el.type) {
      case "Title": {
        const depth = el.metadata.category_depth ?? 0;
        const level = Math.min(depth + 1, 6);
        const hashes = "#".repeat(level);
        parts.push(`${hashes} ${text}`);
        break;
      }

      case "NarrativeText":
      case "UncategorizedText":
      case "FigureCaption":
      case "EmailAddress":
      case "Address": {
        if (text) parts.push(text);
        break;
      }

      case "Table": {
        const html = el.metadata.text_as_html;
        if (html) {
          const mdTable = htmlTableToMarkdown(html);
          if (mdTable) {
            parts.push(mdTable);
            break;
          }
        }
        // Fallback: usar texto plano
        if (text) parts.push(text);
        break;
      }

      case "ListItem": {
        // Evitar doble prefijo: Unstructured a veces ya incluye '- ' o '* '
        if (text && /^[-*]\s/.test(text)) {
          parts.push(text);
        } else {
          parts.push(`- ${text}`);
        }
        break;
      }

      case "Image":
        // Omitir imágenes (no son texto)
        break;

      case "Header":
      case "Footer":
      case "PageBreak":
      case "PageNumber":
        // Omitir headers/footers de página y saltos
        break;

      default: {
        // Incluir cualquier otro tipo como párrafo
        if (text) parts.push(text);
        break;
      }
    }
  }

  return parts.join("\n\n");
}
