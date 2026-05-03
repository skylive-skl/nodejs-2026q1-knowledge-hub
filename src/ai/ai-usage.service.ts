import { Injectable } from '@nestjs/common';

export type TokenUsage = {
  prompt: number;
  completion: number;
  total: number;
};

export type RecordOptions = {
  tokens?: TokenUsage;
  latencyMs?: number;
  cacheHit?: boolean;
};

export type UsageStats = {
  totalRequests: number;
  byEndpoint: Record<string, number>;
  tokenUsage: {
    totalPrompt: number;
    totalCompletion: number;
    totalTokens: number;
  };
  cacheHits: number;
  cacheHitRatio: number;
  avgLatencyMs: number;
};

@Injectable()
export class AiUsageService {
  private totalRequests = 0;
  private byEndpoint: Record<string, number> = {};
  private tokenUsage = { totalPrompt: 0, totalCompletion: 0, totalTokens: 0 };
  private cacheHits = 0;
  private totalLatencyMs = 0;
  private latencyCount = 0;

  record(endpoint: string, options: RecordOptions = {}): void {
    this.totalRequests++;
    this.byEndpoint[endpoint] = (this.byEndpoint[endpoint] ?? 0) + 1;

    const { tokens, latencyMs, cacheHit } = options;

    if (tokens) {
      this.tokenUsage.totalPrompt += tokens.prompt;
      this.tokenUsage.totalCompletion += tokens.completion;
      this.tokenUsage.totalTokens += tokens.total;
    }
    if (cacheHit) {
      this.cacheHits++;
    }
    if (typeof latencyMs === 'number') {
      this.totalLatencyMs += latencyMs;
      this.latencyCount++;
    }
  }

  getStats(): UsageStats {
    return {
      totalRequests: this.totalRequests,
      byEndpoint: { ...this.byEndpoint },
      tokenUsage: { ...this.tokenUsage },
      cacheHits: this.cacheHits,
      cacheHitRatio:
        this.totalRequests > 0
          ? Math.round((this.cacheHits / this.totalRequests) * 1000) / 1000
          : 0,
      avgLatencyMs:
        this.latencyCount > 0
          ? Math.round(this.totalLatencyMs / this.latencyCount)
          : 0,
    };
  }
}
