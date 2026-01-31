interface ChunkOptions {
  minSize?: number;
  maxSize?: number;
  overlap?: number;
}

const DEFAULTS: Required<ChunkOptions> = {
  minSize: 300,
  maxSize: 800,
  overlap: 100,
};

export function chunkText(text: string, options?: ChunkOptions): string[] {
  const { minSize, maxSize, overlap } = { ...DEFAULTS, ...options };

  const cleaned = text.replace(/\r\n/g, "\n").trim();
  if (!cleaned) return [];
  if (cleaned.length <= maxSize) return [cleaned];

  // Split into sentences
  const sentences = cleaned.split(/(?<=[.!?\n])\s+/);
  const chunks: string[] = [];
  let current = "";

  for (const sentence of sentences) {
    if (current.length + sentence.length + 1 > maxSize && current.length >= minSize) {
      chunks.push(current.trim());
      // Keep overlap from end of current chunk
      const overlapText = current.slice(-overlap);
      current = overlapText + " " + sentence;
    } else if (current.length + sentence.length + 1 > maxSize && current.length < minSize) {
      // Sentence is too long, force split
      current += (current ? " " : "") + sentence;
      while (current.length > maxSize) {
        chunks.push(current.slice(0, maxSize).trim());
        const overlapText = current.slice(maxSize - overlap, maxSize);
        current = overlapText + current.slice(maxSize);
      }
    } else {
      current += (current ? " " : "") + sentence;
    }
  }

  if (current.trim()) {
    chunks.push(current.trim());
  }

  return chunks;
}
