import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppLoggerService } from 'src/common/logger/app-logger.service';
import { GeminiAuthError } from './errors/gemini-auth.error';
import { GeminiUnavailableError } from './errors/gemini-unavailable.error';
import { TokenUsage } from './ai-usage.service';

type GeminiApiResponse = {
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

@Injectable()
export class GeminiService {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly model: string;
  private readonly timeoutMs: number;
  private readonly retryCount: number;
  private readonly retryBaseDelayMs: number;

  constructor(
    private readonly config: ConfigService,
    private readonly logger: AppLoggerService,
  ) {
    this.apiKey = this.config.get<string>('GEMINI_API_KEY') ?? '';
    this.baseUrl =
      this.config.get<string>('GEMINI_API_BASE_URL') ??
      'https://generativelanguage.googleapis.com';
    this.model = this.config.get<string>('GEMINI_MODEL') ?? 'gemini-2.0-flash';
    this.timeoutMs = this.config.get<number>('AI_HTTP_TIMEOUT_MS') ?? 15000;
    this.retryCount = this.config.get<number>('AI_RETRY_COUNT') ?? 3;
    this.retryBaseDelayMs =
      this.config.get<number>('AI_RETRY_BASE_DELAY_MS') ?? 300;
  }

  async generateContent(prompt: string): Promise<GeminiResult> {
    // API key is appended only to URL, never logged
    const url = `${this.baseUrl}/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;
    const body = { contents: [{ parts: [{ text: prompt }] }] };

    let lastError: unknown;

    for (let attempt = 0; attempt <= this.retryCount; attempt++) {
      if (attempt > 0) {
        const delayMs = this.retryBaseDelayMs * Math.pow(2, attempt - 1);
        await this.delay(delayMs);
      }

      try {
        const result = await this.fetchWithTimeout(url, body);
        this.logger.log({ model: this.model, attempt }, 'GeminiService');
        return result;
      } catch (error) {
        if (error instanceof GeminiAuthError) {
          throw error;
        }

        const isRetryable =
          error instanceof GeminiUnavailableError ||
          (error instanceof Error && error.name === 'AbortError');

        if (isRetryable && attempt < this.retryCount) {
          lastError = error;
          this.logger.warn(
            { attempt, reason: (error as Error).message },
            'GeminiService',
          );
          continue;
        }

        throw error instanceof GeminiUnavailableError ||
          error instanceof GeminiAuthError
          ? error
          : new GeminiUnavailableError('AI service network error');
      }
    }

    throw lastError ?? new GeminiUnavailableError();
  }

  private async fetchWithTimeout(
    url: string,
    body: object,
  ): Promise<GeminiResult> {
    const controller = new AbortController();
    const timerId = setTimeout(() => controller.abort(), this.timeoutMs);

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

    if (response.status === 401 || response.status === 403) {
      throw new GeminiAuthError();
    }

    if (response.status === 429 || response.status >= 500) {
      throw new GeminiUnavailableError(
        `Gemini API returned upstream error ${response.status}`,
      );
    }

    if (!response.ok) {
      throw new GeminiUnavailableError(
        `Gemini API returned unexpected status ${response.status}`,
      );
    }

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

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
