import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ArticleService } from 'src/article/article.service';
import { GeminiService, GeminiContent } from './gemini.service';
import { AiUsageService, TokenUsage } from './ai-usage.service';
import {
  buildSummarizeArticlePrompt,
  buildTranslateArticlePrompt,
  buildAnalyzeArticlePrompt,
} from './prompts/article.prompts';
import {
  AnalyzeArticleRequestDto,
  GenerateRequestDto,
  SummarizeArticleRequestDto,
  TranslateArticleRequestDto,
} from './dto';
import {
  AnalyzeArticleResponse,
  AnalyzeArticleSeverity,
  SummarizeArticleResponse,
  TranslateArticleResponse,
} from './types/ai-response.types';

type CacheEntry = {
  value: unknown;
  expiresAt: number;
};

type SessionEntry = {
  history: GeminiContent[];
  expiresAt: number;
};

type AnalyzeJsonResult = {
  analysis: string;
  suggestions: string[];
  severity: AnalyzeArticleSeverity;
};

type TranslateJsonResult = {
  translatedTitle: string;
  translatedContent: string;
};

const ANALYZE_RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    analysis: { type: 'string' },
    suggestions: { type: 'array', items: { type: 'string' } },
    severity: { type: 'string', enum: ['info', 'warning', 'error'] },
  },
  required: ['analysis', 'suggestions', 'severity'],
} as const;

const TRANSLATE_RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    translatedTitle: { type: 'string' },
    translatedContent: { type: 'string' },
  },
  required: ['translatedTitle', 'translatedContent'],
} as const;

@Injectable()
export class AiService {
  private readonly cache = new Map<string, CacheEntry>();
  private readonly sessions = new Map<string, SessionEntry>();
  private readonly cacheTtlMs: number;

  constructor(
    private readonly articleService: ArticleService,
    private readonly gemini: GeminiService,
    private readonly usage: AiUsageService,
    private readonly config: ConfigService,
  ) {
    const ttlSec = this.config.get<number>('AI_CACHE_TTL_SEC') ?? 300;
    this.cacheTtlMs = ttlSec * 1000;
  }

  private getFromCache<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.value as T;
  }

  private setCache(key: string, value: unknown): void {
    this.cache.set(key, { value, expiresAt: Date.now() + this.cacheTtlMs });
  }

  async summarize(
    articleId: string,
    dto: SummarizeArticleRequestDto,
  ): Promise<SummarizeArticleResponse> {
    const maxLength = dto.maxLength ?? 'medium';
    const article = await this.articleService.findOne(articleId);

    const cacheKey = `summarize:${articleId}:${maxLength}:${article.updatedAt}`;
    const cached = this.getFromCache<SummarizeArticleResponse>(cacheKey);
    if (cached) {
      this.usage.record('summarize', { cacheHit: true });
      return cached;
    }

    const prompt = buildSummarizeArticlePrompt(
      article.title,
      article.content,
      maxLength,
    );
    const start = Date.now();
    const { text, tokenUsage } = await this.gemini.generateContent(prompt);
    const latencyMs = Date.now() - start;

    const summary = text.trim();
    const result: SummarizeArticleResponse = {
      articleId,
      summary,
      originalLength: article.content.length,
      summaryLength: summary.length,
    };

    this.setCache(cacheKey, result);
    this.usage.record('summarize', { tokens: tokenUsage, latencyMs });
    return result;
  }

  async translate(
    articleId: string,
    dto: TranslateArticleRequestDto,
  ): Promise<TranslateArticleResponse> {
    const article = await this.articleService.findOne(articleId);

    const cacheKey = `translate:${articleId}:${dto.targetLanguage}:${dto.sourceLanguage ?? ''}:${article.updatedAt}`;
    const cached = this.getFromCache<TranslateArticleResponse>(cacheKey);
    if (cached) {
      this.usage.record('translate', { cacheHit: true });
      return cached;
    }

    const prompt = buildTranslateArticlePrompt(
      article.title,
      article.content,
      dto.targetLanguage,
      dto.sourceLanguage,
    );
    const start = Date.now();
    const { data, tokenUsage } =
      await this.gemini.generateJson<TranslateJsonResult>(
        prompt,
        TRANSLATE_RESPONSE_SCHEMA,
      );
    const latencyMs = Date.now() - start;

    const result: TranslateArticleResponse = {
      articleId,
      translatedTitle: data.translatedTitle.trim(),
      translatedContent: data.translatedContent.trim(),
      detectedLanguage: dto.sourceLanguage ?? 'auto',
    };

    this.setCache(cacheKey, result);
    this.usage.record('translate', { tokens: tokenUsage, latencyMs });
    return result;
  }

  async analyze(
    articleId: string,
    dto: AnalyzeArticleRequestDto,
  ): Promise<AnalyzeArticleResponse> {
    const task = dto.task ?? 'review';
    const article = await this.articleService.findOne(articleId);

    const prompt = buildAnalyzeArticlePrompt(
      article.title,
      article.content,
      task,
    );
    const start = Date.now();
    const { data, tokenUsage } =
      await this.gemini.generateJson<AnalyzeJsonResult>(
        prompt,
        ANALYZE_RESPONSE_SCHEMA,
      );
    const latencyMs = Date.now() - start;

    const result: AnalyzeArticleResponse = {
      articleId,
      analysis: data.analysis,
      suggestions: data.suggestions,
      severity: data.severity ?? 'info',
    };
    this.usage.record('analyze', { tokens: tokenUsage, latencyMs });
    return result;
  }

  async generate(dto: GenerateRequestDto): Promise<{ text: string }> {
    const start = Date.now();

    let result: { text: string; tokenUsage?: TokenUsage };

    if (dto.sessionId) {
      const session = this.getSession(dto.sessionId);
      const contents: GeminiContent[] = [
        ...session,
        { role: 'user', parts: [{ text: dto.prompt }] },
      ];
      result = await this.gemini.generateWithHistory(contents);
      this.setSession(dto.sessionId, [
        ...contents,
        { role: 'model', parts: [{ text: result.text.trim() }] },
      ]);
    } else {
      result = await this.gemini.generateContent(dto.prompt);
    }

    const latencyMs = Date.now() - start;
    this.usage.record('generate', { tokens: result.tokenUsage, latencyMs });
    return { text: result.text.trim() };
  }

  private getSession(sessionId: string): GeminiContent[] {
    const entry = this.sessions.get(sessionId);
    if (!entry || Date.now() > entry.expiresAt) {
      this.sessions.delete(sessionId);
      return [];
    }
    return entry.history;
  }

  private setSession(sessionId: string, history: GeminiContent[]): void {
    this.sessions.set(sessionId, {
      history,
      expiresAt: Date.now() + this.cacheTtlMs,
    });
  }
}
