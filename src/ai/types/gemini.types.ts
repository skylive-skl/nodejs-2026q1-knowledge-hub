import { TokenUsage } from '../ai-usage.service';

export type GeminiApiResponse = {
  candidates: Array<{
    content: { parts: Array<{ text: string }> };
  }>;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  };
};

export type GeminiResult = {
  text: string;
  tokenUsage?: TokenUsage;
};

export type GeminiJsonResult<T> = {
  data: T;
  tokenUsage?: TokenUsage;
};

export type GeminiContent = {
  role: 'user' | 'model';
  parts: [{ text: string }];
};

export type GenerationConfig = Record<string, unknown>;

export type GeminiEmbeddingResponse = {
  embedding: {
    values: number[];
  };
};

export type GeminiBatchEmbeddingResponse = {
  embeddings: Array<{
    values: number[];
  }>;
};
