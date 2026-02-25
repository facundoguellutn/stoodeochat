import type { EnrichedChunkSearchResult } from "./vectors";

export interface RetrievalEvalSample {
  name: string;
  query: string;
  expectedAnyTerm: string[];
}

export interface RetrievalEvalCaseResult {
  name: string;
  query: string;
  hit: boolean;
  topScore: number;
  latencyMs: number;
  returnedChunks: number;
}

export interface RetrievalEvalReport {
  cases: RetrievalEvalCaseResult[];
  recallAtK: number;
  avgLatencyMs: number;
  p95LatencyMs: number;
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[idx];
}

function hasExpectedHit(chunks: EnrichedChunkSearchResult[], expectedAnyTerm: string[]): boolean {
  if (expectedAnyTerm.length === 0) return true;
  const haystack = normalize(
    chunks
      .map((c) => `${c.documentName}\n${c.sectionPath ?? ""}\n${c.text}`)
      .join("\n")
  );
  return expectedAnyTerm.some((term) => haystack.includes(normalize(term)));
}

export async function evaluateRetrievalRun(params: {
  dataset: RetrievalEvalSample[];
  retrieve: (query: string) => Promise<EnrichedChunkSearchResult[]>;
}): Promise<RetrievalEvalReport> {
  const { dataset, retrieve } = params;
  const cases: RetrievalEvalCaseResult[] = [];

  for (const sample of dataset) {
    const startedAt = Date.now();
    const chunks = await retrieve(sample.query);
    const latencyMs = Date.now() - startedAt;
    const hit = hasExpectedHit(chunks, sample.expectedAnyTerm);

    cases.push({
      name: sample.name,
      query: sample.query,
      hit,
      topScore: chunks[0]?.score ?? 0,
      latencyMs,
      returnedChunks: chunks.length,
    });
  }

  const hits = cases.filter((c) => c.hit).length;
  const latencies = cases.map((c) => c.latencyMs);

  return {
    cases,
    recallAtK: dataset.length === 0 ? 0 : hits / dataset.length,
    avgLatencyMs:
      latencies.length === 0
        ? 0
        : Math.round(latencies.reduce((acc, v) => acc + v, 0) / latencies.length),
    p95LatencyMs: percentile(latencies, 95),
  };
}

export function compareRetrievalRuns(baseline: RetrievalEvalReport, candidate: RetrievalEvalReport) {
  const deltaRecall = candidate.recallAtK - baseline.recallAtK;
  const deltaAvgLatency = candidate.avgLatencyMs - baseline.avgLatencyMs;
  const deltaP95Latency = candidate.p95LatencyMs - baseline.p95LatencyMs;

  return {
    baseline,
    candidate,
    delta: {
      recallAtK: deltaRecall,
      avgLatencyMs: deltaAvgLatency,
      p95LatencyMs: deltaP95Latency,
    },
  };
}
