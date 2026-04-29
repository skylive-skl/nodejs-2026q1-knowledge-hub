import { Injectable } from '@nestjs/common';

export type TokenUsage = {
  prompt: number;
  completion: number;
  total: number;
};

export type UsageStats = {
  totalRequests: number;
  byEndpoint: Record<string, number>;
  tokenUsage: {
    totalPrompt: number;
    totalCompletion: number;
    totalTokens: number;
  };
};

@Injectable()
export class AiUsageService {
  private totalRequests = 0;
  private byEndpoint: Record<string, number> = {};
  private tokenUsage = { totalPrompt: 0, totalCompletion: 0, totalTokens: 0 };

  record(endpoint: string, tokens?: TokenUsage): void {
    this.totalRequests++;
    this.byEndpoint[endpoint] = (this.byEndpoint[endpoint] ?? 0) + 1;
    if (tokens) {
      this.tokenUsage.totalPrompt += tokens.prompt;
      this.tokenUsage.totalCompletion += tokens.completion;
      this.tokenUsage.totalTokens += tokens.total;
    }
  }

  getStats(): UsageStats {
    return {
      totalRequests: this.totalRequests,
      byEndpoint: { ...this.byEndpoint },
      tokenUsage: { ...this.tokenUsage },
    };
  }
}
