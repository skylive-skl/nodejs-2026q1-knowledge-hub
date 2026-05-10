import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppLoggerService } from 'src/common/logger/app-logger.service';
import { GeminiAuthError } from './errors/gemini-auth.error';
import { GeminiRateLimitError } from './errors/gemini-rate-limit.error';
import { GeminiUnavailableError } from './errors/gemini-unavailable.error';
import {
  GeminiApiResponse,
  GeminiBatchEmbeddingResponse,
  GeminiContent,
  GeminiEmbeddingResponse,
  GeminiResult,
  GenerationConfig,
} from './types/gemini.types';

@Injectable()
export class GeminiHttpClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly model: string;
  private readonly embeddingModel: string;
  private readonly timeoutMs: number;

  constructor(
    private readonly config: ConfigService,
    private readonly logger: AppLoggerService,
  ) {
    this.apiKey = this.config.get<string>('GEMINI_API_KEY') ?? '';
    this.baseUrl =
      this.config.get<string>('GEMINI_API_BASE_URL') ??
      'https://generativelanguage.googleapis.com';
    this.model = this.config.get<string>('GEMINI_MODEL') ?? 'gemini-2.0-flash';
    this.embeddingModel =
      this.config.get<string>('GEMINI_EMBEDDING_MODEL') ?? 'text-embedding-004';
    this.timeoutMs = this.readPositiveNumber('AI_HTTP_TIMEOUT_MS', 15000);

    if (!this.apiKey.trim()) {
      throw new Error('Missing required environment variable: GEMINI_API_KEY');
    }

    this.logger.log(
      {
        model: this.model,
        embeddingModel: this.embeddingModel,
        baseUrl: this.baseUrl,
        timeoutMs: this.timeoutMs,
      },
      'GeminiHttpClient',
    );
  }

  get modelName(): string {
    return this.model;
  }

  async call(
    contents: GeminiContent[],
    generationConfig?: GenerationConfig,
  ): Promise<GeminiResult> {
    const url = `${this.baseUrl}/v1beta/models/${this.model}:generateContent`;
    const controller = new AbortController();
    const timerId = setTimeout(() => controller.abort(), this.timeoutMs);

    const body: Record<string, unknown> = {
      contents,
      ...(generationConfig ? { generationConfig } : {}),
    };

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': this.apiKey,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (fetchError) {
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        throw new GeminiUnavailableError('AI service request timed out');
      }
      throw new GeminiUnavailableError('AI service network error');
    } finally {
      clearTimeout(timerId);
    }

    this.checkResponseErrors(response);

    const data = (await response.json()) as GeminiApiResponse;
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    const usage = data.usageMetadata;

    return {
      text,
      tokenUsage: usage
        ? {
            prompt: usage.promptTokenCount ?? 0,
            completion: usage.candidatesTokenCount ?? 0,
            total: usage.totalTokenCount ?? 0,
          }
        : undefined,
    };
  }

  async embedContent(text: string): Promise<number[]> {
    const url = `${this.baseUrl}/v1beta/models/${this.embeddingModel}:embedContent`;
    const controller = new AbortController();
    const timerId = setTimeout(() => controller.abort(), this.timeoutMs);

    const body = {
      model: `models/${this.embeddingModel}`,
      content: {
        parts: [{ text }],
      },
    };

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': this.apiKey,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (fetchError) {
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        throw new GeminiUnavailableError('AI service request timed out');
      }
      throw new GeminiUnavailableError('AI service network error');
    } finally {
      clearTimeout(timerId);
    }

    this.checkResponseErrors(response);

    const data = (await response.json()) as GeminiEmbeddingResponse;
    return data.embedding?.values ?? [];
  }

  async batchEmbedContents(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];

    const url = `${this.baseUrl}/v1beta/models/${this.embeddingModel}:batchEmbedContents`;
    const controller = new AbortController();
    const timerId = setTimeout(() => controller.abort(), this.timeoutMs);

    const body = {
      requests: texts.map((text) => ({
        model: `models/${this.embeddingModel}`,
        content: {
          parts: [{ text }],
        },
      })),
    };

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': this.apiKey,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (fetchError) {
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        throw new GeminiUnavailableError('AI service request timed out');
      }
      throw new GeminiUnavailableError('AI service network error');
    } finally {
      clearTimeout(timerId);
    }

    this.checkResponseErrors(response);

    const data = (await response.json()) as GeminiBatchEmbeddingResponse;
    return data.embeddings?.map((e) => e.values) ?? [];
  }

  private checkResponseErrors(response: Response): void {
    if (response.status === 401 || response.status === 403) {
      throw new GeminiAuthError();
    }

    if (response.status === 429) {
      const retryAfterHeader = response.headers.get('retry-after');
      const retryAfterSec = retryAfterHeader
        ? Number.parseInt(retryAfterHeader, 10)
        : undefined;
      throw new GeminiRateLimitError(retryAfterSec);
    }

    if (response.status >= 500) {
      throw new GeminiUnavailableError(
        `Gemini API returned upstream error ${response.status}`,
      );
    }

    if (!response.ok) {
      throw new GeminiUnavailableError(
        `Gemini API returned unexpected status ${response.status}`,
      );
    }
  }

  private readPositiveNumber(key: string, fallback: number): number {
    const raw = this.config.get<number | string>(key);
    if (raw === undefined || raw === null || raw === '') {
      return fallback;
    }

    const value = Number.parseInt(String(raw), 10);
    if (!Number.isFinite(value) || Number.isNaN(value) || value <= 0) {
      throw new Error(`Environment variable ${key} must be a positive integer`);
    }

    return value;
  }
}
