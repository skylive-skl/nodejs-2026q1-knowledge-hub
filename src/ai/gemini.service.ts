import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppLoggerService } from 'src/common/logger/app-logger.service';
import { GeminiAuthError } from './errors/gemini-auth.error';
import { GeminiRateLimitError } from './errors/gemini-rate-limit.error';
import { GeminiUnavailableError } from './errors/gemini-unavailable.error';
import { GeminiHttpClient } from './gemini-http.client';
import { withRetry } from './retry.util';
import {
  GeminiContent,
  GeminiJsonResult,
  GeminiResult,
  GenerationConfig,
} from './types/gemini.types';

export type { GeminiContent, GeminiResult, GeminiJsonResult };

@Injectable()
export class GeminiService {
  private readonly retryCount: number;
  private readonly retryBaseDelayMs: number;

  constructor(
    private readonly config: ConfigService,
    private readonly logger: AppLoggerService,
    private readonly httpClient: GeminiHttpClient,
  ) {
    this.retryCount = this.readPositiveNumber('AI_RETRY_COUNT', 3);
    this.retryBaseDelayMs = this.readPositiveNumber(
      'AI_RETRY_BASE_DELAY_MS',
      300,
    );

    this.logger.log(
      {
        model: this.httpClient.modelName,
        retryCount: this.retryCount,
        retryBaseDelayMs: this.retryBaseDelayMs,
      },
      'GeminiService',
    );
  }

  async generateContent(prompt: string): Promise<GeminiResult> {
    return this.generate([{ role: 'user', parts: [{ text: prompt }] }]);
  }

  async generateWithHistory(contents: GeminiContent[]): Promise<GeminiResult> {
    return this.generate(contents);
  }

  async generateJson<T>(
    prompt: string,
    schema?: GenerationConfig,
  ): Promise<GeminiJsonResult<T>> {
    const generationConfig: GenerationConfig = {
      response_mime_type: 'application/json',
      ...(schema ? { response_schema: schema } : {}),
    };
    const contents: GeminiContent[] = [
      { role: 'user', parts: [{ text: prompt }] },
    ];
    const { text, tokenUsage } = await this.generate(
      contents,
      generationConfig,
    );
    let data: T;
    try {
      data = JSON.parse(text) as T;
    } catch {
      throw new GeminiUnavailableError(
        'AI service returned malformed JSON response',
      );
    }
    return { data, tokenUsage };
  }

  private generate(
    contents: GeminiContent[],
    generationConfig?: GenerationConfig,
  ): Promise<GeminiResult> {
    return withRetry(() => this.httpClient.call(contents, generationConfig), {
      retryCount: this.retryCount,
      retryBaseDelayMs: this.retryBaseDelayMs,
      isAbort: (err) =>
        err instanceof GeminiAuthError || err instanceof GeminiRateLimitError,
      isRetryable: (err) =>
        err instanceof GeminiUnavailableError ||
        (err instanceof Error && err.name === 'AbortError'),
      toFinalError: (err) =>
        err instanceof GeminiUnavailableError ||
        err instanceof GeminiRateLimitError ||
        err instanceof GeminiAuthError
          ? (err as Error)
          : new GeminiUnavailableError('AI service network error'),
      onRetry: (attempt, err) =>
        this.logger.warn(
          { attempt, reason: (err as Error).message },
          'GeminiService',
        ),
      onSuccess: (attempt) =>
        this.logger.log(
          { model: this.httpClient.modelName, attempt },
          'GeminiService',
        ),
    });
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
