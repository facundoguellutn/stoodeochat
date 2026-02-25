interface ChunkOptions {
  minSize?: number;
  maxSize?: number;
  overlap?: number;
}

export interface ChunkResult {
  text: string;
  sectionPath?: string;
  sectionIndex?: number;
  chunkIndex?: number;
}

const DEFAULTS: Required<ChunkOptions> = {
  minSize: 200,
  maxSize: 1000,
  overlap: 180,
};

interface Section {
  level: number;
  title: string;
  content: string;
}

/**
 * Parsea texto markdown y extrae secciones con su nivel de header.
 * Devuelve un array de secciones con su jerarquía.
 */
function parseMarkdownSections(text: string): Section[] {
  const lines = text.split("\n");
  const sections: Section[] = [];
  let currentTitle = "";
  let currentLevel = 0;
  let currentContent: string[] = [];

  for (const line of lines) {
    const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);

    if (headerMatch) {
      // Guardar sección anterior si tiene contenido
      if (currentContent.length > 0 || currentTitle) {
        sections.push({
          level: currentLevel,
          title: currentTitle,
          content: currentContent.join("\n").trim(),
        });
      }

      currentLevel = headerMatch[1].length;
      currentTitle = headerMatch[2].trim();
      currentContent = [];
    } else {
      currentContent.push(line);
    }
  }

  // Guardar última sección
  if (currentContent.length > 0 || currentTitle) {
    sections.push({
      level: currentLevel,
      title: currentTitle,
      content: currentContent.join("\n").trim(),
    });
  }

  return sections;
}

/**
 * Determina si el texto tiene headers markdown detectados.
 */
function hasMarkdownHeaders(text: string): boolean {
  return /^#{1,6}\s+.+$/m.test(text);
}

/**
 * Construye el breadcrumb path a partir del header stack.
 */
function buildBreadcrumb(headerStack: string[]): string {
  if (headerStack.length === 0) return "";
  return `[${headerStack.join(" > ")}]`;
}

/**
 * Chunking legacy: sin conciencia de secciones (para texto sin headers).
 */
function chunkTextLegacy(text: string, options: Required<ChunkOptions>): ChunkResult[] {
  const { minSize, maxSize, overlap } = options;

  const cleaned = text.replace(/\r\n/g, "\n").trim();
  if (!cleaned) return [];
  if (cleaned.length <= maxSize) return [{ text: cleaned }];

  const sentences = cleaned.split(/(?<=[.!?\n])\s+/);
  const chunks: ChunkResult[] = [];
  let current = "";

  for (const sentence of sentences) {
    if (current.length + sentence.length + 1 > maxSize && current.length >= minSize) {
      chunks.push({ text: current.trim() });
      const overlapText = current.slice(-overlap);
      current = overlapText + " " + sentence;
    } else if (current.length + sentence.length + 1 > maxSize && current.length < minSize) {
      current += (current ? " " : "") + sentence;
      while (current.length > maxSize) {
        chunks.push({ text: current.slice(0, maxSize).trim() });
        const overlapText = current.slice(maxSize - overlap, maxSize);
        current = overlapText + current.slice(maxSize);
      }
    } else {
      current += (current ? " " : "") + sentence;
    }
  }

  if (current.trim()) {
    chunks.push({ text: current.trim() });
  }

  return chunks;
}

/**
 * Subdivide un bloque de texto en chunks respetando el tamaño máximo,
 * prefijando cada chunk con el breadcrumb de sección.
 */
function subdivideWithBreadcrumb(
  content: string,
  breadcrumb: string,
  options: Required<ChunkOptions>
): ChunkResult[] {
  const { minSize, maxSize, overlap } = options;

  const prefix = breadcrumb ? breadcrumb + "\n" : "";
  const prefixLen = prefix.length;
  const effectiveMax = maxSize - prefixLen;

  // Si cabe en un solo chunk
  if (content.length <= effectiveMax) {
    const text = (prefix + content).trim();
    if (!text) return [];
    return [{ text, sectionPath: breadcrumb || undefined }];
  }

  // Subdividir por oraciones
  const sentences = content.split(/(?<=[.!?\n])\s+/);
  const chunks: ChunkResult[] = [];
  let current = "";

  for (const sentence of sentences) {
    if (current.length + sentence.length + 1 > effectiveMax && current.length >= minSize) {
      chunks.push({
        text: (prefix + current).trim(),
        sectionPath: breadcrumb || undefined,
      });
      const overlapText = current.slice(-overlap);
      current = overlapText + " " + sentence;
    } else if (current.length + sentence.length + 1 > effectiveMax && current.length < minSize) {
      current += (current ? " " : "") + sentence;
      while (current.length > effectiveMax) {
        chunks.push({
          text: (prefix + current.slice(0, effectiveMax)).trim(),
          sectionPath: breadcrumb || undefined,
        });
        const overlapText = current.slice(effectiveMax - overlap, effectiveMax);
        current = overlapText + current.slice(effectiveMax);
      }
    } else {
      current += (current ? " " : "") + sentence;
    }
  }

  if (current.trim()) {
    chunks.push({
      text: (prefix + current).trim(),
      sectionPath: breadcrumb || undefined,
    });
  }

  return chunks;
}

/**
 * Chunking con conciencia de secciones.
 * Cada chunk lleva un breadcrumb con los headers padres.
 */
function chunkTextSectionAware(text: string, options: Required<ChunkOptions>): ChunkResult[] {
  const sections = parseMarkdownSections(text);
  const chunks: ChunkResult[] = [];

  // Header stack: mantiene la jerarquía actual [h1, h2, h3...]
  const headerStack: { level: number; title: string }[] = [];

  for (let sectionIndex = 0; sectionIndex < sections.length; sectionIndex++) {
    const section = sections[sectionIndex];
    // Actualizar header stack según el nivel del header actual
    if (section.title) {
      // Remover headers de nivel igual o mayor (estamos entrando a una nueva sección)
      while (
        headerStack.length > 0 &&
        headerStack[headerStack.length - 1].level >= section.level
      ) {
        headerStack.pop();
      }
      headerStack.push({ level: section.level, title: section.title });
    }

    // Construir breadcrumb desde el stack
    const breadcrumb = buildBreadcrumb(headerStack.map(h => h.title));

    // Si no hay contenido, indexar al menos el header para no perder la relación semántica.
    if (!section.content) {
      if (section.title) {
        const headingOnlyText = `${breadcrumb}\n${section.title}`.trim();
        if (headingOnlyText) {
          chunks.push({
            text: headingOnlyText,
            sectionPath: breadcrumb || undefined,
            sectionIndex,
          });
        }
      }
      continue;
    }

    // Subdividir contenido con breadcrumb
    const sectionChunks = subdivideWithBreadcrumb(section.content, breadcrumb, options);
    for (const sectionChunk of sectionChunks) {
      chunks.push({
        ...sectionChunk,
        sectionIndex,
      });
    }
  }

  return chunks.map((chunk, chunkIndex) => ({ ...chunk, chunkIndex }));
}

/**
 * Genera chunks a partir de texto, con conciencia de secciones si el texto
 * contiene headers markdown. Devuelve ChunkResult[] con texto y sectionPath.
 */
export function chunkText(text: string, options?: ChunkOptions): string[] {
  const results = chunkTextWithMetadata(text, options);
  return results.map(r => r.text);
}

/**
 * Versión que devuelve metadata adicional (sectionPath) junto con cada chunk.
 */
export function chunkTextWithMetadata(text: string, options?: ChunkOptions): ChunkResult[] {
  const opts = { ...DEFAULTS, ...options };
  const cleaned = text.replace(/\r\n/g, "\n").trim();

  if (!cleaned) return [];

  // Si el texto tiene headers markdown, usar chunking section-aware
  if (hasMarkdownHeaders(cleaned)) {
    const results = chunkTextSectionAware(cleaned, opts);
    // Si el chunking section-aware produce resultados, usarlos
    if (results.length > 0) return results;
  }

  // Fallback: chunking legacy sin conciencia de secciones
  return chunkTextLegacy(cleaned, opts).map((chunk, chunkIndex) => ({
    ...chunk,
    sectionIndex: 0,
    chunkIndex,
  }));
}
