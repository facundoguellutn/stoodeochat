import { connectDB } from "./db";
import { UsageLog } from "@/models";
import type { UsageType } from "@/types/models";

// Prices per 1M tokens (USD)
const MODEL_PRICES: Record<string, { input: number; output: number }> = {
  // Embeddings
  "text-embedding-3-small": { input: 0.02, output: 0 },
  "text-embedding-3-large": { input: 0.13, output: 0 },
  // Chat models
  "gpt-4o": { input: 2.5, output: 10 },
  "gpt-4o-mini": { input: 0.15, output: 0.6 },
  "gpt-4.1": { input: 2.0, output: 8.0 },
  "gpt-4.1-mini": { input: 0.4, output: 1.6 },
  "gpt-4.1-nano": { input: 0.1, output: 0.4 },
};

export function calculateCost(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const prices = MODEL_PRICES[model];
  if (!prices) return 0;

  const inputCost = (inputTokens / 1_000_000) * prices.input;
  const outputCost = (outputTokens / 1_000_000) * prices.output;
  return inputCost + outputCost;
}

export async function logUsage(params: {
  companyId?: string;
  userId: string;
  type: UsageType;
  model: string;
  inputTokens: number;
  outputTokens: number;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await connectDB();

  const totalTokens = params.inputTokens + params.outputTokens;
  const cost = calculateCost(params.model, params.inputTokens, params.outputTokens);

  await UsageLog.create({
    companyId: params.companyId || undefined,
    userId: params.userId,
    type: params.type,
    model: params.model,
    inputTokens: params.inputTokens,
    outputTokens: params.outputTokens,
    totalTokens,
    cost,
    metadata: params.metadata ?? {},
  });
}
